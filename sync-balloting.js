#!/usr/bin/env node
// Public issuing-house balloting notices, mirrored by KLSE Screener.
// Fill missing overall public OS only; never replace an existing/manual value.
const fs = require('node:fs');
const path = require('node:path');
const { atMyt, resolveLifecycle } = require('./lib/ipo-rules');
const { updateSourceStatus } = require('./lib/sync-health');

const ORIGIN = 'https://www.klsescreener.com';
const DAY = 86400000;
const MAX_TARGETS = 6;

function text(html) {
    return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
            const value = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : +code;
            return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : ' ';
        }).replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi, entity => ({
            '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>'
        })[entity.toLowerCase()]).replace(/\s+/g, ' ').trim();
}

function normalizeCompany(value) {
    return text(value).toLowerCase().replace(/\[(?:ns|s)\]/g, '')
        .replace(/\b(?:berhad|bhd)\b/g, '').replace(/[^a-z0-9]/g, '');
}

function matchesCompany(title, ipo) {
    const company = title.match(/^(.+?)\s*[-–—]\s*INITIAL PUBLIC OFFERING\b/i);
    return !!company && normalizeCompany(company[1]).length >= 4 &&
        normalizeCompany(company[1]) === normalizeCompany(ipo.companyName);
}

function parseIndex(html) {
    const notices = [];
    for (const match of String(html).matchAll(/<a\b([^>]*href=["'](\/v2\/announcements\/view\/\d+)["'][^>]*)>([\s\S]*?)<\/a>/gi)) {
        if (!/class=["'][^"']*\bannouncement-item\b/.test(match[1])) continue;
        const title = match[3].match(/<div\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        if (title) notices.push({ url: ORIGIN + match[2], title: text(title[1]) });
    }
    // A challenge/changed HTML page must not masquerade as an empty feed.
    if (!notices.length) throw new Error('KLSE announcement index has no recognized entries.');
    return notices;
}

function field(html, label) {
    for (const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
        if (cells.length >= 2 && text(cells[0][1]) === label) return text(cells[1][1]);
    }
    return null;
}

function parseAnnouncement(html, ipo, now = Date.now()) {
    const main = String(html).match(/<div\b[^>]*id=["']main["'][^>]*>([\s\S]*?)<h4\b[^>]*>\s*Announcement Info\s*<\/h4>/i);
    if (!main) throw new Error('KLSE announcement content is missing.');
    const heading = main[1].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    if (!heading || !matchesCompany(text(heading[1]), ipo)) throw new Error('Balloting company does not match.');
    if (field(html, 'Category') !== 'Special Announcement') throw new Error('Unsupported announcement category.');
    const announcedDate = field(html, 'Date Announced');
    const announced = atMyt(announcedDate, '00:00', now);
    const ballot = atMyt(ipo.ballotingDate, '00:00', now);
    const close = atMyt(ipo.closingDate, '00:00', now);
    const listing = atMyt(ipo.listingDate, '00:00', now);
    if (!announced || +announced > now || +announced < now - 60 * DAY ||
        (ballot && (+announced < +ballot || +announced > +ballot + 7 * DAY)) ||
        (close && +announced < +close) || (listing && +announced > +listing)) {
        throw new Error('Balloting announcement date is outside the IPO timetable.');
    }
    const body = text(main[1].replace(/<h3\b[^>]*>[\s\S]*?<\/h3>/i, ''));
    const publicParagraphs = [...main[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => text(match[1]))
        .filter(paragraph => /Malaysian public/i.test(paragraph) && !/Bumiputera|non-Bumiputera/i.test(paragraph));
    const number = '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)';
    const overallOs = new RegExp('overall\\s+oversubscription\\s+rate\\s+of\\s+' + number + '\\s*times', 'gi');
    const publicOs = new RegExp('oversubscription\\s+rate\\s+of\\s+' + number + '\\s*times', 'gi');
    const overallSubscription = new RegExp('overall\\s+subscription\\s+rate\\s+of\\s+' + number + '\\s*times', 'gi');
    // Overall values take priority; unqualified values require Malaysian-public
    // wording in the same paragraph to avoid choosing a Bumiputera tranche.
    let values = publicParagraphs.flatMap(paragraph => [...paragraph.matchAll(overallOs)].map(match => +match[1].replace(/,/g, '')));
    let subscriptionRate = null;
    if (!values.length) {
        values = publicParagraphs.flatMap(paragraph => [...paragraph.matchAll(publicOs)].map(match => +match[1].replace(/,/g, '')));
    }
    if (!values.length) {
        const subscribed = publicParagraphs.flatMap(paragraph => [...paragraph.matchAll(overallSubscription)].map(match => +match[1].replace(/,/g, '')));
        if (subscribed.length && /Malaysian public/i.test(body) && new Set(subscribed).size === 1 && subscribed[0] >= 1) {
            subscriptionRate = subscribed[0];
            values = [Math.round((subscriptionRate - 1) * 100) / 100];
        }
    }
    if (!/Malaysian public/i.test(body) || !values.length || new Set(values).size !== 1 ||
        !Number.isFinite(values[0]) || values[0] < 0) throw new Error('Unambiguous overall public OS is unavailable.');
    return { os: values[0], announcedDate, subscriptionRate };
}

function selectTargets(data, overrides = {}, now = Date.now()) {
    return data.filter(ipo => {
        if (!ipo.id || !ipo.companyName || ![4, 5].includes(resolveLifecycle(ipo, now).stage) ||
            Number(ipo.os) > 0 || ipo.osSource || Object.prototype.hasOwnProperty.call(overrides[ipo.id] || {}, 'os')) return false;
        const ballot = atMyt(ipo.ballotingDate, '00:00', now);
        const listing = atMyt(ipo.listingDate, '00:00', now);
        if (ballot) return +ballot <= now && +ballot >= now - 60 * DAY;
        return !!listing && +listing >= now - 45 * DAY && +listing <= now + 30 * DAY;
    }).sort((a, b) => +(atMyt(b.ballotingDate || b.listingDate, '00:00', now) || 0) - +(atMyt(a.ballotingDate || a.listingDate, '00:00', now) || 0));
}

function mytDay(now) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }

async function fetchHtml(url, fetchImpl) {
    const response = await fetchImpl(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IPOHunter/1.0)', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`KLSE returned HTTP ${response.status}.`);
    const html = await response.text();
    if (html.length > 2 * 1024 * 1024) throw new Error('KLSE response exceeds expected size.');
    return html;
}

async function syncBalloting(options = {}) {
    const root = options.root || __dirname;
    const now = options.now ?? Date.now();
    const request = options.fetch || globalThis.fetch;
    const recordStatus = options.recordStatus || updateSourceStatus;
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
    const overridesPath = path.join(root, 'overrides.json');
    const overrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : {};
    const allTargets = selectTargets(data, overrides, now);
    const targets = allTargets.slice(0, MAX_TARGETS);
    if (!targets.length) {
        recordStatus('balloting', { status: 'skipped', message: 'No recent IPOs missing overall public OS.', now }, root);
        return { updated: 0, failed: 0, deferred: 0 };
    }
    let updated = 0;
    const failures = [];
    const indexes = new Map();
    const index = async day => {
        if (!indexes.has(day)) indexes.set(day, fetchHtml(`${ORIGIN}/v2/announcements?category=SA%2CSACO&date_to=${day}`, request).then(parseIndex));
        return indexes.get(day);
    };
    for (const ipo of targets) {
        try {
            let notice = (await index(mytDay(now))).find(item => matchesCompany(item.title, ipo));
            if (!notice) {
                const ballot = atMyt(ipo.ballotingDate, '00:00', now);
                const close = atMyt(ipo.closingDate, '00:00', now);
                const listing = atMyt(ipo.listingDate, '00:00', now);
                // One fallback index only, close to the expected ballot rather
                // than letting an older notice fall off the latest page forever.
                const anchor = ballot ? +ballot : close ? Math.min(+close + 7 * DAY, now) : listing ? Math.min(+listing, now) : now;
                const day = mytDay(anchor);
                if (day !== mytDay(now)) notice = (await index(day)).find(item => matchesCompany(item.title, ipo));
            }
            if (!notice) throw new Error('Matching issuing-house balloting notice is not available.');
            const result = parseAnnouncement(await fetchHtml(notice.url, request), ipo, now);
            const fields = { os: result.os, isAutoOS: true, osSource: notice.url,
                osSourceDate: result.announcedDate, osMetric: 'overall-public-oversubscription' };
            if (result.subscriptionRate !== null) fields.osSubscriptionRate = result.subscriptionRate;
            Object.assign(ipo, fields);
            overrides[ipo.id] = { ...(overrides[ipo.id] || {}), ...fields };
            updated++;
            console.log(`${ipo.companyName}: overall public OS ${result.os}x (${notice.url})`);
        } catch (error) {
            failures.push(ipo.id);
            console.error(`${ipo.companyName}: ${error.message}`);
        }
    }
    if (updated) {
        const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
        fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(data, null, 4));
        for (const file of ['data.js', 'data_export.js']) fs.writeFileSync(path.join(root, file), js);
        fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4));
    }
    const deferred = allTargets.length - targets.length;
    const status = failures.length || deferred ? (updated ? 'partial' : 'failed') : 'success';
    recordStatus('balloting', { status,
        message: `Overall public OS: ${updated} updated, ${failures.length} unavailable, ${deferred} deferred.`, now }, root);
    return { updated, failed: failures.length, deferred };
}

if (require.main === module) {
    syncBalloting().then(result => { if (result.failed || result.deferred) process.exitCode = 1; }).catch(error => {
        console.error(`Balloting sync failed: ${error.message}`);
        updateSourceStatus('balloting', { status: 'failed', message: error.message });
        process.exitCode = 1;
    });
}

module.exports = { parseIndex, parseAnnouncement, selectTargets, syncBalloting, matchesCompany };
