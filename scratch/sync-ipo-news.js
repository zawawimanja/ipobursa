#!/usr/bin/env node
/**
 * sync-ipo-news.js
 *
 * Auto-sync SEKSYEN BERITA untuk laman IPO.
 *
 * Sumber:
 *   - Google News RSS  (https://news.google.com/rss/search?q=...)   → HTTP 200
 *   - Bing News RSS    (https://www.bing.com/news/search?...&format=RSS) → HTTP 200
 *
 * Reuters sendiri menyekat crawler (RSS 404, artikel 403), jadi berita Reuters
 * diambil melalui agregator ini (Bing/Google News). Setiap item disimpan dengan
 * tajuk, pautan, penerbit, tarikh dan senarai id IPO yang berkaitan.
 *
 * Output:
 *   - news.json  → dibaca oleh generate-ipo-pages.js (halaman setiap IPO)
 *   - news.js    → dibaca oleh pelayar (dashboard index.html)
 *
 * Kalau SEMUA sumber gagal, fail asal DIPELIHARA dan status dilaporkan sebagai
 * gagal (tidak pernah dianggap "sync berjaya" dengan data kosong).
 *
 * CARA GUNA:
 *   node scratch/sync-ipo-news.js            (update + git push)
 *   node scratch/sync-ipo-news.js --no-push  (update sahaja — untuk GitHub Actions)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { updateSourceStatus } = require('../lib/sync-health');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const NEWS_JSON = path.join(ROOT, 'news.json');
const NEWS_JS = path.join(ROOT, 'news.js');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT = 20000;
const REQUEST_GAP_MS = 350;
const MAX_ITEMS = 120;
const MAX_COMPANY_QUERIES = 10;

// Kata umum yang tak dianggap sebahagian daripada nama syarikat semasa padanan.
const GENERIC_TOKENS = new Set([
    'berhad', 'bhd', 'group', 'holdings', 'holding', 'corporation', 'corp',
    'limited', 'ltd', 'sdn', 'inc', 'company', 'co', 'the', 'and', 'plc',
    'international', 'malaysia', 'holdings', 'bhd.'
]);

const GENERAL_QUERIES = [
    'Bursa Malaysia IPO',
    'IPO Bursa Malaysia',
    'Malaysia IPO listing',
];

const BING_QUERIES = [
    'Bursa Malaysia IPO',
    'IPO Malaysia',
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function decodeEntities(str) {
    return String(str || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(str) {
    return decodeEntities(String(str || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Normalisasi nama + padanan syarikat
// ---------------------------------------------------------------------------
function keyTokens(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/\(.*?\)/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token && !GENERIC_TOKENS.has(token));
}

function buildCompanyIndex(ipos) {
    const index = [];
    for (const ipo of ipos) {
        if (!ipo || !ipo.id) continue;
        const tokens = keyTokens(ipo.companyName || ipo.id);
        if (!tokens.length) continue;
        const single = tokens.length === 1;
        // Token tunggal yang terlalu pendek senang jadi positif palsu (cth: "SBS", "ASM").
        if (single && tokens[0].length < 6) continue;
        index.push({ id: ipo.id, tokens });
    }
    return index;
}

function tokenizeTitle(title) {
    return String(title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function matchCompanies(title, companyIndex) {
    const titleTokens = tokenizeTitle(title);
    const matches = [];
    for (const company of companyIndex) {
        const len = company.tokens.length;
        for (let i = 0; i + len <= titleTokens.length; i++) {
            let ok = true;
            for (let j = 0; j < len; j++) {
                if (titleTokens[i + j] !== company.tokens[j]) { ok = false; break; }
            }
            if (ok) { matches.push(company.id); break; }
        }
    }
    return matches;
}

// ---------------------------------------------------------------------------
// Fetch + parse RSS
// ---------------------------------------------------------------------------
async function fetchFeed(url) {
    const resp = await axios.get(url, {
        headers: {
            'User-Agent': UA,
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'en-MY,en;q=0.9,ms;q=0.8',
        },
        timeout: REQUEST_TIMEOUT,
        responseType: 'text',
        validateStatus: status => status >= 200 && status < 400,
    });
    return String(resp.data || '');
}

function parseGoogleItems(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((_, el) => {
        const node = $(el);
        const rawTitle = stripTags(node.find('title').first().text());
        const link = node.find('link').first().text().trim();
        const pubDate = node.find('pubDate').first().text().trim();
        const source = stripTags(node.find('source').first().text());
        // Tajuk Google News berakhir dengan " - Penerbit".
        let title = rawTitle;
        if (source && title.toLowerCase().endsWith(' - ' + source.toLowerCase())) {
            title = title.slice(0, title.length - (source.length + 3)).trim();
        }
        if (!title || !link) return;
        items.push({ title, url: link, source, date: toIso(pubDate) });
    });
    return items;
}

function parseBingItems(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((_, el) => {
        const node = $(el);
        const title = stripTags(node.find('title').first().text());
        let link = node.find('link').first().text().trim();
        const pubDate = node.find('pubDate').first().text().trim();
        const source = stripTags(node.find('News\\:Source').first().text() || node.find('source').first().text());
        const real = directUrlFromBing(link);
        if (real) link = real;
        if (!title || !link) return;
        items.push({ title, url: link, source, date: toIso(pubDate) });
    });
    return items;
}

// Bing membalut pautan sebenar dalam parameter `url=`.
function directUrlFromBing(link) {
    try {
        const match = /[?&]url=([^&]+)/i.exec(link || '');
        if (!match) return '';
        return decodeURIComponent(match[1]);
    } catch (error) {
        return '';
    }
}

function toIso(value) {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : new Date(time).toISOString();
}

// ---------------------------------------------------------------------------
// Kumpul + normalisasi
// ---------------------------------------------------------------------------
function normaliseUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.hash = '';
        return parsed.toString();
    } catch (error) {
        return String(url || '').trim();
    }
}

function dedupeKey(url) {
    const normalised = normaliseUrl(url).toLowerCase();
    if (normalised.includes('news.google.com')) {
        // Google News guna pautan lencong sama untuk satu artikel.
        const match = /\/articles\/([^?]+)/.exec(normalised);
        if (match) return 'g:' + match[1];
    }
    return 'u:' + normalised.replace(/^https?:\/\//, '').replace(/[?#].*$/, '');
}

function buildQueryUrl(query, engine) {
    const encoded = encodeURIComponent(query);
    if (engine === 'bing') {
        return `https://www.bing.com/news/search?q=${encoded}&format=RSS&mkt=en-MY`;
    }
    return `https://news.google.com/rss/search?q=${encoded}&hl=en-MY&gl=MY&ceid=MY:en`;
}

function shortName(name) {
    return stripTags(name)
        .replace(/\b(berhad|bhd|holdings|holding|group|corporation|corp|limited|sdn)\b\.?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function main() {
    const doPush = !process.argv.includes('--no-push') && process.env.GITHUB_ACTIONS !== 'true';

    if (!fs.existsSync(DATA_JSON)) {
        fail('data.json tidak dijumpai.');
        return;
    }
    const ipos = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const companyIndex = buildCompanyIndex(ipos);

    // Syarikat yang sedang aktif (belum listing) diberi carian khusus nama.
    const featured = ipos
        .filter(ipo => {
            const stage = Number(ipo.stage);
            return stage >= 2 && stage <= 4;
        })
        .slice(0, MAX_COMPANY_QUERIES);

    const jobs = [];
    for (const query of GENERAL_QUERIES) jobs.push({ engine: 'google', query });
    for (const query of BING_QUERIES) jobs.push({ engine: 'bing', query });
    for (const ipo of featured) {
        const name = shortName(ipo.companyName || '');
        if (name.length >= 3) jobs.push({ engine: 'google', query: `"${name}" IPO`, companyId: ipo.id });
    }

    const collected = [];
    let okSources = 0;
    let failedSources = 0;
    const failures = [];

    for (const job of jobs) {
        const url = buildQueryUrl(job.query, job.engine);
        try {
            const xml = await fetchFeed(url);
            const items = job.engine === 'bing' ? parseBingItems(xml) : parseGoogleItems(xml);
            if (!items.length) {
                failedSources++;
                failures.push(`${job.engine}:${job.query} (0 item)`);
            } else {
                okSources++;
                for (const item of items) {
                    collected.push({
                        ...item,
                        companies: job.companyId ? [job.companyId] : [],
                        engine: job.engine,
                    });
                }
            }
        } catch (error) {
            failedSources++;
            const status = error.response ? error.response.status : '';
            failures.push(`${job.engine}:${job.query} ${status} ${error.message}`.trim());
        }
        await sleep(REQUEST_GAP_MS);
    }

    if (okSources === 0) {
        fail(`Semua sumber berita gagal (${failures.length} percubaan). Data berita sedia ada dipelihara.`);
        console.error('   Ralat: ' + failures.slice(0, 5).join(' | '));
        return;
    }

    // Dedupe ikut URL, kemudian ikut tajuk.
    const byUrl = new Map();
    for (const item of collected) {
        const key = dedupeKey(item.url);
        const existing = byUrl.get(key);
        if (existing) {
            existing.companies = Array.from(new Set([...existing.companies, ...item.companies]));
            if (!existing.source && item.source) existing.source = item.source;
            continue;
        }
        byUrl.set(key, {
            title: item.title,
            url: item.url,
            source: item.source || '',
            date: item.date,
            companies: Array.from(new Set(item.companies)),
            _engine: item.engine,
        });
    }

    const byTitle = new Map();
    for (const item of byUrl.values()) {
        const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (!titleKey) continue;
        const existing = byTitle.get(titleKey);
        if (!existing) { byTitle.set(titleKey, item); continue; }
        // Utamakan pautan terus (Bing) berbanding pautan lencong Google News.
        existing.companies = Array.from(new Set([...existing.companies, ...item.companies]));
        if (existing.url.includes('news.google.com') && !item.url.includes('news.google.com')) {
            existing.url = item.url;
            if (item.source) existing.source = item.source;
        }
        if (!existing.date && item.date) existing.date = item.date;
    }

    // Tag setiap item dengan padanan nama syarikat dari tajuk.
    const items = [];
    for (const item of byTitle.values()) {
        const matched = matchCompanies(item.title, companyIndex);
        item.companies = Array.from(new Set([...item.companies, ...matched]));
        delete item._engine;
        items.push(item);
    }

    items.sort((a, b) => {
        const timeA = a.date ? Date.parse(a.date) : 0;
        const timeB = b.date ? Date.parse(b.date) : 0;
        return timeB - timeA;
    });
    items.length = Math.min(items.length, MAX_ITEMS);

    const payload = {
        generatedAt: new Date().toISOString(),
        generatedAtMYT: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour12: true }),
        count: items.length,
        items,
    };

    // OneDrive boleh gagal sementara semasa menulis — baca semula untuk sahkan.
    writeJson(payload);

    const linked = items.filter(item => item.companies.length).length;
    console.log(`✅ Berita: ${items.length} item (${okSources} sumber berjaya, ${failedSources} gagal; ${linked} dipautkan ke IPO).`);
    if (failures.length) console.log('   Gagal: ' + failures.slice(0, 6).join(' | '));

    updateSourceStatus('ipo-news', {
        status: failedSources === 0 ? 'success' : 'partial',
        message: `${items.length} news items from ${okSources} feed(s); ${failedSources} feed(s) failed.`,
    });

    if (doPush) await gitPush();
}

function writeJson(payload) {
    const json = JSON.stringify(payload, null, 4);
    const js = `const IPO_NEWS = ${JSON.stringify(payload, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_NEWS;\n}\nif (typeof window !== 'undefined') {\n    window.IPO_NEWS = IPO_NEWS;\n}\n`;
    fs.writeFileSync(NEWS_JSON, json, 'utf8');
    fs.writeFileSync(NEWS_JS, js, 'utf8');
    // Sahkan tulisan berjaya (OneDrive kadangkala memulihkan fail).
    const verify = fs.readFileSync(NEWS_JSON, 'utf8');
    JSON.parse(verify);
}

function fail(message) {
    console.error('❌ ' + message);
    updateSourceStatus('ipo-news', { status: 'failed', message });
}

async function gitPush() {
    const { execSync } = require('child_process');
    try {
        const status = execSync('git status --porcelain news.json news.js sync-status.js', { cwd: ROOT }).toString().trim();
        if (!status) { console.log('[Git] Tiada perubahan untuk dihantar.'); return; }
        const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        execSync('git add news.json news.js sync-status.js', { cwd: ROOT });
        execSync(`git commit -m "Auto sync IPO news feed: ${stamp}"`, { cwd: ROOT });
        execSync('git pull --rebase origin main && git push', { cwd: ROOT });
        console.log('[Git] ✅ Pushed ke GitHub.');
    } catch (error) {
        console.error('[Git] ❌ Push gagal:', error.message);
    }
}

main().catch(error => {
    console.error('Fatal:', error);
    try { updateSourceStatus('ipo-news', { status: 'failed', message: error.message }); } catch (_) { /* ignore */ }
    process.exit(1);
});
