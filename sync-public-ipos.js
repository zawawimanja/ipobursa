#!/usr/bin/env node
/**
 * sync-public-ipos.js  (v2 - rewritten with proper HTML parser)
 *
 * Sync tarikh buka/tutup, harga IPO, tarikh listing, dan stage
 * daripada KLSE Screener (/v2/ipos) secara automatik.
 *
 * TIADA Cloudflare, TIADA login, TIADA Puppeteer.
 * Boleh berjalan di GitHub Actions dan laptop pada bila-bila masa.
 *
 * Guna: node sync-public-ipos.js
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const URL = 'https://www.klsescreener.com/v2/ipos';

const MONTH_MAP = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function parseKlseDate(dayStr, monthStr, year) {
    const d = parseInt(dayStr, 10);
    const mIdx = MONTH_MAP[(monthStr || '').toLowerCase()];
    const y = parseInt(year, 10) || new Date().getFullYear();
    if (isNaN(d) || mIdx === undefined || isNaN(y)) return null;
    const dd = String(d).padStart(2, '0');
    const mm = Object.keys(MONTH_MAP)[mIdx];
    const mmCap = mm.charAt(0).toUpperCase() + mm.slice(1);
    return `${dd}-${mmCap}-${y}`;
}

function parseInlineDate(str, fallbackYear = 2026) {
    // Handles "09 Sep", "09 Sep 2026", "Sep 09", "Sep 9 2026"
    if (!str) return null;
    str = str.replace(/,/g, '').trim();
    // "09 Sep 2026" or "09 Sep"
    const m1 = str.match(/^(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?$/);
    if (m1) return parseKlseDate(m1[1], m1[2], m1[3] || fallbackYear);
    // "Sep 09 2026" or "Sep 9"
    const m2 = str.match(/^([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
    if (m2) return parseKlseDate(m2[2], m2[1], m2[3] || fallbackYear);
    return null;
}

function parseFlexDate(str) {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    const mIdx = MONTH_MAP[parts[1].toLowerCase()];
    if (mIdx === undefined) return null;
    return new Date(parseInt(parts[2]), mIdx, parseInt(parts[0]));
}

function normalize(name) {
    return (name || '').toLowerCase()
        .replace(/\bberhad\b|\bgroup\b|\bholdings\b|\bcorp\b|\bbhd\b|\bthe\b/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function matchEntry(data, companyName, ticker) {
    const n = normalize(companyName);
    if (!n || n.length < 3) return null;

    // 1. Exact ticker match (most reliable)
    if (ticker && ticker.length >= 3) {
        const sym = ticker.toLowerCase().trim();
        const byTicker = data.find(x => x.symbol && x.symbol.toLowerCase().replace(/\[.*?\]/g, '').trim() === sym);
        if (byTicker) return byTicker;
    }

    // 2. Exact normalized company name
    let found = data.find(x => normalize(x.companyName) === n);
    if (found) return found;

    // 3. Substring match for longer names
    if (n.length >= 5) {
        found = data.find(x => {
            const cn = normalize(x.companyName);
            return cn.length >= 5 && (cn.includes(n) || n.includes(cn));
        });
        if (found) return found;
    }

    return null;
}

async function main() {
    console.log('🔄 Menyelaras data IPO Awam daripada KLSE Screener...');

    let html;
    try {
        const resp = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-MY,en;q=0.9',
            },
            timeout: 20000
        });
        html = resp.data;
    } catch (e) {
        console.error(`❌ Gagal membaca KLSE Screener: ${e.message}`);
        process.exit(1);
    }

    const $ = cheerio.load(html);
    const upcoming = [];

    // Parse ONLY upcoming IPOs — stop at "Past IPOs" section
    // Each upcoming IPO is in .card.mb-3.p-0 before the <h3>Past IPOs</h3>
    let reachedPast = false;

    $('h3').each((i, el) => {
        if ($(el).text().trim() === 'Past IPOs') reachedPast = true;
    });

    // Find all .card elements — past IPOs have background-color:inherit in date block
    $('div.card.mb-3.p-0').each((i, card) => {
        const cardEl = $(card);

        // Get the listing date block (left colored div)
        const dateBlock = cardEl.find('div[style*="width:100px"]').first();
        const monthText = dateBlock.find('div.pt-2').text().trim();   // e.g. "Oct"
        const dayText = dateBlock.find('h3').text().trim();            // e.g. "01"
        const yearAttr = dateBlock.attr('title') || String(new Date().getFullYear()); // from title="2026"

        // Check if this is a past IPO (no title attr color vs. inherit)
        const styleStr = dateBlock.attr('style') || '';
        const isPast = styleStr.includes('color:inherit') || styleStr.includes('background-color:inherit');
        if (isPast) return; // skip past IPOs

        const listingDate = parseKlseDate(dayText, monthText, yearAttr);
        if (!listingDate) return;

        // Get ticker and company name
        const ticker = cardEl.find('h4 a').first().text().trim();
        const companyName = cardEl.find('h4').first().next('span').text().trim() ||
                            cardEl.find('span.ml-3').first().text().trim();

        // Get open/close dates from text like "Open: 09 Sep" "Close: 18 Sep"
        let openDate = null, closeDate = null;
        cardEl.find('span').each((j, span) => {
            const txt = $(span).text().trim();
            if (txt === 'Open:') {
                const sibling = $(span).parent().text().replace('Open:', '').trim().split('\n')[0].trim();
                openDate = parseInlineDate(sibling, parseInt(yearAttr));
            }
            if (txt === 'Close:') {
                const sibling = $(span).parent().text().replace('Close:', '').trim().split('\n')[0].trim();
                closeDate = parseInlineDate(sibling, parseInt(yearAttr));
            }
        });

        // Fallback: parse Open/Close from parent div text
        if (!openDate || !closeDate) {
            cardEl.find('div').each((j, div) => {
                const txt = $(div).text().replace(/\s+/g, ' ').trim();
                const openM = txt.match(/Open:\s*(\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?)/i);
                const closeM = txt.match(/Close:\s*(\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?)/i);
                if (openM && !openDate) openDate = parseInlineDate(openM[1], parseInt(yearAttr));
                if (closeM && !closeDate) closeDate = parseInlineDate(closeM[1], parseInt(yearAttr));
            });
        }

        // Get price from right green block
        const priceText = cardEl.find('div[style*="background-color:#27AE60"] h4').text().trim();
        const price = parseFloat(priceText) || null;

        if (!companyName || !listingDate) return;

        upcoming.push({ ticker, companyName, openDate, closeDate, listingDate, price });
    });

    console.log(`📋 Dijumpai ${upcoming.length} IPO akan datang dari KLSE Screener:`);
    upcoming.forEach(x => console.log(`   ${x.ticker} | ${x.companyName} | Open:${x.openDate} Close:${x.closeDate} List:${x.listingDate} RM${x.price}`));

    // Load data
    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const overrides = fs.existsSync(OVERRIDES_JSON) ? JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8')) : {};

    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let updatedCount = 0;

    upcoming.forEach(s => {
        const ipo = matchEntry(data, s.companyName, s.ticker);
        if (!ipo) {
            console.log(`   ⚠️  Tak jumpa padanan untuk: ${s.companyName} (${s.ticker})`);
            return;
        }

        // NEVER downgrade a listed (stage 5) IPO
        if (ipo.stage === 5) return;

        let changed = false;

        if (s.openDate && ipo.openingDate !== s.openDate) {
            ipo.openingDate = s.openDate; changed = true;
        }
        if (s.closeDate && ipo.closingDate !== s.closeDate) {
            ipo.closingDate = s.closeDate; changed = true;
        }
        if (s.listingDate && ipo.listingDate !== s.listingDate) {
            ipo.listingDate = s.listingDate; changed = true;
        }
        if (s.price && s.price > 0 && (!ipo.price || ipo.price === 0)) {
            ipo.price = s.price; changed = true;
        }
        // Update ticker symbol if missing
        if (s.ticker && !ipo.symbol) {
            ipo.symbol = s.ticker; changed = true;
        }

        // Auto-compute correct stage based on confirmed dates
        const closeD = s.closeDate ? parseFlexDate(s.closeDate) : null;
        const listD = s.listingDate ? parseFlexDate(s.listingDate) : null;
        if (listD) listD.setHours(0, 0, 0, 0);
        if (closeD) closeD.setHours(23, 59, 59, 999);

        let newStage = ipo.stage;
        if (listD && listD <= today) {
            newStage = 5; // Listed
        } else if (closeD && closeD < now) {
            newStage = Math.max(ipo.stage, 4); // Pre-Listing (only upgrade)
        } else if (closeD && closeD >= now) {
            newStage = Math.max(ipo.stage, 3); // Application Open (only upgrade)
        }

        if (newStage !== ipo.stage) {
            const stageNames = { 3: 'Application Open', 4: 'Pre-Listing', 5: 'Listed' };
            ipo.stage = newStage;
            ipo.status = stageNames[newStage] || ipo.status;
            changed = true;
        }

        if (changed) {
            console.log(`   ✨ ${ipo.companyName} → Stage ${ipo.stage} (${ipo.status}) | Close:${ipo.closingDate} List:${ipo.listingDate}`);
            updatedCount++;

            // Sync to overrides
            if (!overrides[ipo.id]) overrides[ipo.id] = {};
            ['stage', 'status', 'openingDate', 'closingDate', 'listingDate', 'price', 'symbol'].forEach(k => {
                if (ipo[k] !== undefined) overrides[ipo.id][k] = ipo[k];
            });
        }
    });

    if (updatedCount === 0) {
        console.log('✅ Semua data IPO awam sudah terkini. Tiada perubahan.');
        return;
    }

    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;

    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    fs.writeFileSync(DATA_JS, js, 'utf8');
    fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`\n🎉 Berjaya mengemas kini ${updatedCount} IPO! data.json, data.js, overrides.json disimpan.`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
