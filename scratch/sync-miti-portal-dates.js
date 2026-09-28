#!/usr/bin/env node
/**
 * sync-miti-portal-dates.js
 *
 * Auto-sync tarikh buka/tutup MITI terus dari halaman AWAM portal SahamOnline
 * (https://sahamonline.miti.gov.my) — TIADA login/kredential diperlukan.
 *
 * Menyokong format portal baharu SPSKB 3.0 (DD/MM/YYYY) dan format teks lama.
 * Menjana/mengemas kini entri Stage 2 (MITI Allocation Phase) secara automatik.
 *
 * Guna: node scratch/sync-miti-portal-dates.js
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const PORTAL = 'https://sahamonline.miti.gov.my';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MONTHS_MAP = {
    'januari': 'Jan', 'februari': 'Feb', 'mac': 'Mar', 'april': 'Apr', 'mei': 'May',
    'jun': 'Jun', 'julai': 'Jul', 'ogos': 'Aug', 'september': 'Sep', 'oktober': 'Oct',
    'november': 'Nov', 'disember': 'Dec',
    'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr', 'may': 'May', 'jun': 'Jun',
    'jul': 'Jul', 'aug': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'
};

function parseDateStr(str) {
    if (!str) return null;
    str = str.trim();
    // Format 28/09/2026
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const d = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
        const mIdx = parseInt(slashMatch[2], 10) - 1;
        const y = slashMatch[3];
        if (mIdx >= 0 && mIdx < 12) {
            return `${d}-${MONTH_NAMES[mIdx]}-${y}`;
        }
    }
    // Format 28 September 2026
    const textMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (textMatch) {
        const d = String(parseInt(textMatch[1], 10)).padStart(2, '0');
        const mStr = MONTHS_MAP[textMatch[2].toLowerCase()];
        const y = textMatch[3];
        if (mStr) {
            return `${d}-${mStr}-${y}`;
        }
    }
    return null;
}

function matchEntry(data, companyName) {
    const name = companyName.toLowerCase().replace(/berhad|bhd|group|holdings/g, '').replace(/[^a-z0-9]/g, '').trim();
    return data.find(x => {
        const cn = (x.companyName || '').toLowerCase().replace(/berhad|bhd|group|holdings/g, '').replace(/[^a-z0-9]/g, '').trim();
        return cn.includes(name) || name.includes(cn);
    });
}

function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
    console.log('🔄 Menyelaras tarikh MITI dari portal rasmi...');
    let resp;
    try {
        resp = await axios.get(PORTAL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8',
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: 15000,
        });
    } catch (e) {
        console.log(`⚠️  Gagal fetch portal: ${e.message}`);
        process.exit(1);
    }

    const $ = cheerio.load(resp.data);
    const found = {};

    // 1. Cari daripada banner teks:
    // "Makluman pembukaan saham bagi syarikat KK MART RETAIL BERHAD adalah bermula pada 28/09/2026 sehingga 11/10/2026."
    const bodyText = $('body').text();
    const reNew = /bagi syarikat\s+([\w\s\(\)\-\.]+?)\s+adalah bermula pada\s+([\d\/\w\s]+?)\s+sehingga\s+([\d\/\w\s]+?)(?:\.|\n|$)/gi;
    let m;
    while ((m = reNew.exec(bodyText))) {
        const company = m[1].replace(/\s+/g, ' ').trim();
        const open = parseDateStr(m[2]);
        const close = parseDateStr(m[3]);
        if (company && open && close && company.length > 2) {
            found[company.toLowerCase()] = { open, close, company };
        }
    }

    // Juga semak teks dalam h4 / heading / container
    $('h4, h3, p, div').each((i, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.includes('Makluman pembukaan saham bagi syarikat')) {
            const match = text.match(/bagi syarikat\s+(.+?)\s+adalah bermula pada\s+(.+?)\s+sehingga\s+(.+?)(?:\.|$)/i);
            if (match) {
                const company = match[1].trim();
                const open = parseDateStr(match[2]);
                const close = parseDateStr(match[3]);
                if (company && open && close) {
                    found[company.toLowerCase()] = { open, close, company };
                }
            }
        }
    });

    const keys = Object.keys(found);
    if (keys.length === 0) {
        console.log('⚠️  Tiada tawaran MITI dikesan pada halaman portal.');
        return;
    }

    console.log(`📋 Dijumpai ${keys.length} tawaran aktif di portal MITI:`);
    for (const k of keys) {
        console.log(`   - ${found[k].company} (Buka: ${found[k].open}, Tutup: ${found[k].close})`);
    }

    const dataPath = path.join(ROOT, 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const ovPath = path.join(ROOT, 'overrides.json');
    const overrides = JSON.parse(fs.readFileSync(ovPath, 'utf8'));

    const changes = [];
    for (const [nameKey, v] of Object.entries(found)) {
        let ipo = matchEntry(data, v.company);
        if (!ipo) {
            console.log(`➕ Menambah IPO baharu dari MITI: ${v.company}`);
            const newId = slugify(v.company);
            ipo = {
                id: newId,
                companyName: v.company,
                symbol: v.company.replace(/berhad|bhd/gi, '').trim().toUpperCase(),
                market: 'ACE Market',
                price: 0,
                openingDate: '',
                closingDate: '',
                listingDate: '',
                mitiOpenDate: v.open,
                mitiCloseDate: v.close,
                shariah: true,
                stage: 2,
                status: 'MITI Allocation Phase',
                hasMitiTranche: true,
                year: new Date().getFullYear(),
                sector: 'Consumer Products & Services',
                predictedGrade: 'B'
            };
            data.unshift(ipo);
            changes.push({ id: newId, nameKey });
            continue;
        }

        let changed = false;
        if (ipo.stage < 2) {
            ipo.stage = 2;
            ipo.status = 'MITI Allocation Phase';
            changed = true;
        }
        if (ipo.mitiOpenDate !== v.open || ipo.mitiCloseDate !== v.close || !ipo.hasMitiTranche) {
            ipo.mitiOpenDate = v.open;
            ipo.mitiCloseDate = v.close;
            ipo.hasMitiTranche = true;
            changed = true;
        }
        if (changed) {
            changes.push({ id: ipo.id, nameKey });
        }
    }

    if (changes.length === 0) {
        console.log('✅ Semua data MITI sudah terkini dan selaras.');
        return;
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(path.join(ROOT, 'data.js'), js, 'utf8');
    fs.writeFileSync(path.join(ROOT, 'data_export.js'), js, 'utf8');

    for (const c of changes) {
        if (!overrides[c.id]) overrides[c.id] = {};
        overrides[c.id].stage = 2;
        overrides[c.id].status = 'MITI Allocation Phase';
        overrides[c.id].hasMitiTranche = true;
        overrides[c.id].mitiOpenDate = found[c.nameKey].open;
        overrides[c.id].mitiCloseDate = found[c.nameKey].close;
    }
    fs.writeFileSync(ovPath, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`\n🎉 Berjaya menyelaraskan ${changes.length} entri MITI ke dalam database!`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
