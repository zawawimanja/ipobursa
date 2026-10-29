const fs = require('node:fs');
const path = require('node:path');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MALAY_MONTHS = ['januari', 'februari', 'mac', 'april', 'mei', 'jun', 'julai', 'ogos', 'september', 'oktober', 'november', 'disember'];

function parseMitiDate(value) {
    const text = String(value || '').trim();
    let day, month, year;
    let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) [day, month, year] = [+match[1], +match[2] - 1, +match[3]];
    else if ((match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]00:00:00)?$/))) {
        [year, month, day] = [+match[1], +match[2] - 1, +match[3]];
    } else if ((match = text.match(/^(\d{1,2})[-\s]+([A-Za-z]+)[-\s]+(\d{4})$/))) {
        day = +match[1]; year = +match[3];
        const name = match[2].toLowerCase();
        month = MALAY_MONTHS.indexOf(name);
        if (month < 0) month = MONTHS.findIndex(m => name.startsWith(m.toLowerCase()));
    } else return null;
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
    return `${String(day).padStart(2, '0')}-${MONTHS[month]}-${year}`;
}

function normalizedCompany(value) {
    return String(value || '').toLowerCase().replace(/\b(?:berhad|bhd)\b\.?/g, '').replace(/[^a-z0-9]/g, '');
}

function matchEntry(data, name) {
    const company = normalizedCompany(name);
    if (!company) return undefined;
    const matches = data.filter(ipo => normalizedCompany(ipo.companyName) === company);
    if (matches.length > 1) throw new Error(`Ambiguous MITI company match: ${name}`);
    return matches[0];
}

function parsePublicOffers(html) {
    const $ = require('cheerio').load(html);
    $('script, style').remove();
    const text = $('body').text().replace(/\s+/g, ' ');
    const found = new Map();
    const dateToken = '(?:\\d{1,2}\\s*[/\\-]\\s*\\d{1,2}\\s*[/\\-]\\s*\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[\\s\\-]+[A-Za-z]+[\\s\\-]+\\d{4})';
    const pattern = new RegExp('(?:makluman\\s+)?(?:pembukaan|tawaran)(?:\\s+(?:saham|permohonan))?\\s+bagi\\s+syarikat\\s+([\\w\\s\\(\\)\\-\\.]+?)\\s+(?:adalah\\s+)?bermula\\s+pada\\s+(' + dateToken + ')\\s+(?:sehingga|hingga)\\s+(' + dateToken + ')', 'gi');
    for (const match of text.matchAll(pattern)) {
        const company = match[1].trim();
        if (company.length < 2 || company.length > 80) continue;
        const open = parseMitiDate(match[2].trim());
        const close = parseMitiDate(match[3].trim());
        if (!open || !close || Date.parse(open) > Date.parse(close)) throw new Error('MITI offer dates could not be validated; existing data retained.');
        found.set(normalizedCompany(company), { company, open, close });
    }
    if (!found.size && !/tiada\s+(?:tawaran|pembukaan|saham)|no\s+(?:active\s+)?offers/i.test(text)) {
        throw new Error('MITI portal returned no recognized offer announcement or explicit empty state; existing data retained.');
    }
    return [...found.values()];
}

// Livewire serializes collections/arrays as [value, { s: "arr"/"clctn" }].
function unwrapLivewire(value) {
    if (Array.isArray(value)) {
        if (value.length === 2 && value[1] && typeof value[1] === 'object' && !Array.isArray(value[1]) && typeof value[1].s === 'string') {
            return unwrapLivewire(value[0]);
        }
        return value.map(unwrapLivewire);
    }
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, unwrapLivewire(item)]));
    return value;
}

function parseMaklumatJSON(html) {
    const $ = require('cheerio').load(html);
    if ($('#data\\.username, input[autocomplete="username"]').length) throw new Error('MITI login was not accepted or the session expired.');
    const results = [];
    let recognized = false;
    $('[wire\\:snapshot]').each((_, el) => {
        let snap;
        try { snap = JSON.parse($(el).attr('wire:snapshot')); } catch { return; }
        if (!Object.prototype.hasOwnProperty.call(snap?.data || {}, 'profiles')) return;
        recognized = true;
        const profiles = unwrapLivewire(snap.data.profiles);
        if (!Array.isArray(profiles)) throw new Error('MITI profiles format changed; existing data retained.');
        for (const profile of profiles.flat()) {
            if (!profile || typeof profile !== 'object' || !String(profile.name || '').trim()) throw new Error('MITI profile has no company name; existing data retained.');
            const close = profile.tarikh_akhir_tiers || profile.tarikh;
            const mitiCloseDate = close ? parseMitiDate(close) : null;
            if (close && !mitiCloseDate) throw new Error('MITI closing date could not be validated; existing data retained.');
            const offer = Number(String(profile.rating || '').replace(/,/g, '').trim());
            const priceMatch = String(profile.stockIndication || '').match(/RM\s*(\d+(?:\.\d+)?)/i);
            let applicants = null;
            const appField = profile.applicants ?? profile.total_applicants ?? profile.total_pelabur ?? profile.pelabur ?? profile.pelabur_memohon ?? profile.total_applicant;
            if (appField != null) {
                const parsed = Number(String(appField).replace(/[^\d]/g, ''));
                if (Number.isSafeInteger(parsed) && parsed >= 0) applicants = parsed;
            }
            if (applicants == null) {
                const companyToken = profile.name.trim().split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const htmlMatch = html.match(new RegExp(companyToken + '[\\s\\S]*?(\\d[\\d,]*)\\s*pelabur\\s*memohon', 'i'));
                if (htmlMatch) {
                    const parsed = Number(htmlMatch[1].replace(/,/g, ''));
                    if (Number.isSafeInteger(parsed) && parsed >= 0) applicants = parsed;
                }
            }
            results.push({ company: profile.name.trim(), mitiCloseDate,
                offerShares: Number.isSafeInteger(offer) && offer > 0 ? offer : null,
                price: priceMatch && Number(priceMatch[1]) > 0 ? Number(priceMatch[1]) : null,
                applicants });
        }
    });
    if (!recognized) throw new Error('MITI authenticated share page was not recognized; existing data retained.');
    return results;
}

function saveData(root, data, overrides) {
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(data, null, 4) + '\n');
    fs.writeFileSync(path.join(root, 'data.js'), js);
    fs.writeFileSync(path.join(root, 'data_export.js'), js);
    fs.writeFileSync(path.join(root, 'overrides.json'), JSON.stringify(overrides, null, 4) + '\n');
}

function readData(root) {
    return { data: JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8')),
        overrides: JSON.parse(fs.readFileSync(path.join(root, 'overrides.json'), 'utf8')) };
}

function updateFields(ipo, fields, overrides) {
    const changed = Object.entries(fields).filter(([key, value]) => ipo[key] !== value);
    if (!changed.length) return false;
    Object.assign(ipo, fields);
    overrides[ipo.id] ||= {};
    for (const [key, value] of changed) overrides[ipo.id][key] = value;
    return true;
}

module.exports = { parseMitiDate, normalizedCompany, matchEntry, parsePublicOffers, unwrapLivewire, parseMaklumatJSON, saveData, readData, updateFields };
