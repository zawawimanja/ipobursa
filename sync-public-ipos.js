#!/usr/bin/env node
/**
 * sync-public-ipos.js
 *
 * Auto-sync prospektus, tarikh buka/tutup, tarikh penyenaraian, harga IPO,
 * dan status pasaran IPO AWAM Bursa Malaysia daripada KLSE Screener (/v2/ipos).
 *
 * TIADA Cloudflare, TIADA login, TIADA Puppeteer.
 * Boleh berjalan terus di GitHub Actions dan laptop pada bila-bila masa.
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

const MONTHS_MAP = {
    'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr', 'may': 'May', 'jun': 'Jun',
    'jul': 'Jul', 'aug': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'
};

function parseKlseDate(str, fallbackYear = 2026) {
    if (!str || str === '-' || str === 'TBA') return null;
    str = str.replace(/,/g, '').trim();
    
    // Format "24 Sep 2026" or "24 Sep, 2026"
    const m1 = str.match(/^(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?$/);
    if (m1) {
        const d = String(parseInt(m1[1], 10)).padStart(2, '0');
        const m = MONTHS_MAP[m1[2].toLowerCase()];
        const y = m1[3] || String(fallbackYear);
        if (m) return `${d}-${m}-${y}`;
    }
    
    // Format "Sep 28 2026" or "Sep 28"
    const m2 = str.match(/^([A-Za-z]{3})\s+(\d{1,2})(?:\s+[A-Za-z]+)?(?:\s+(\d{4}))?$/);
    if (m2) {
        const d = String(parseInt(m2[2], 10)).padStart(2, '0');
        const m = MONTHS_MAP[m2[1].toLowerCase()];
        const y = m2[3] || String(fallbackYear);
        if (m) return `${d}-${m}-${y}`;
    }

    return null;
}

function normalize(name) {
    return (name || '').toLowerCase()
        .replace(/berhad|bhd|group|holdings|corp/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function matchEntry(data, companyName, symbol) {
    const n = normalize(companyName);
    if (!n || n.length < 3) return null;
    
    // 1. Exact normalized name match
    let found = data.find(x => normalize(x.companyName) === n);
    if (found) return found;

    // 2. Substring matching for longer unique names (>= 5 chars)
    if (n.length >= 5) {
        found = data.find(x => {
            const cn = normalize(x.companyName);
            return cn.length >= 5 && (cn.includes(n) || n.includes(cn));
        });
        if (found) return found;
    }

    // 3. Exact unique symbol match (only if symbol is >= 4 chars)
    if (symbol && symbol.length >= 4) {
        const sym = symbol.toLowerCase().trim();
        found = data.find(x => x.symbol && x.symbol.toLowerCase().replace(/\[.*?\]/g, '').trim() === sym);
        if (found) return found;
    }

    return null;
}

function parseFlexDate(s) {
    if (!s) return null;
    const parts = s.split('-');
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const mIdx = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(parts[1].toLowerCase());
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && mIdx >= 0 && !isNaN(y)) return new Date(y, mIdx, d);
    }
    return null;
}

async function main() {
    console.log('🔄 Menyelaras data IPO Awam daripada KLSE Screener (/v2/ipos)...');
    
    let resp;
    try {
        resp = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });
    } catch (e) {
        console.error(`❌ Gagal membaca KLSE Screener: ${e.message}`);
        process.exit(1);
    }

    const $ = cheerio.load(resp.data);
    const scraped = [];

    // Parse each container in the list
    $('div').each((i, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.includes('Open:') && text.includes('Close:') && $(el).children().length >= 2 && $(el).children().length <= 15) {
            
            // Extract company name and symbol
            // e.g. "Oct 16 Friday ECOGRPEGH INTERNATIONAL BERHAD Open: 24 Sep Close: 05 Oct ... 0.16"
            // or "Initial Public Offering Sep 28 Monday EVOCOMEVOCOM BERHAD Open: 03 Sep Close: 14 Sep ..."
            const openM = text.match(/Open:\s*([\d\w\s,]+?)\s*Close:/i);
            const closeM = text.match(/Close:\s*([\d\w\s,]+?)(?:\s*Issue Size:|\s*Board:|\s*Sector:|\s*$)/i);
            const priceM = text.match(/(?:^|\s)(0\.\d{2,3}|[1-9]\d*\.\d{2})(?:\s*$|\s+[A-Za-z])/);
            const boardM = text.match(/Board:\s*([\w\s]+?)(?:\s*Sector:|\s*$)/i);
            const sectorM = text.match(/Sector:\s*([\w\s&]+?)(?:\s*Sub sector:|\s*$)/i);
            const listDateM = text.match(/^([A-Za-z]{3}\s+\d{1,2}(?:\s+[A-Za-z]+)?(?:\s+\d{4})?)/);

            let companyName = null;
            let symbol = null;

            // Try to extract company name from headings or strong tags
            const titleEl = $(el).find('h1, h2, h3, h4, h5, h6, strong, a').first();
            const rawTitle = titleEl.text().replace(/\s+/g, ' ').trim();

            const bhdM = text.match(/([A-Z0-9\s\(\)\-\.]+?\s+BERHAD)/i);
            if (bhdM) {
                companyName = bhdM[1].replace(/^(?:Initial Public Offering|Open|Close|Listing)\s+/gi, '').trim();
            } else if (rawTitle && rawTitle.length > 3) {
                companyName = rawTitle;
            }

            if (companyName && openM && closeM) {
                const openDate = parseKlseDate(openM[1]);
                const closeDate = parseKlseDate(closeM[1]);
                const listDate = listDateM ? parseKlseDate(listDateM[1]) : null;
                const price = priceM ? parseFloat(priceM[1]) : null;
                const market = boardM ? boardM[1].trim() : 'ACE Market';
                const sector = sectorM ? sectorM[1].trim() : null;

                // Deduplicate in list
                if (!scraped.some(x => normalize(x.companyName) === normalize(companyName))) {
                    scraped.push({
                        companyName,
                        symbol,
                        openDate,
                        closeDate,
                        listingDate: listDate,
                        price,
                        market,
                        sector
                    });
                }
            }
        }
    });

    console.log(`📋 Berjaya mengekstrak ${scraped.length} rekod IPO dari KLSE Screener.`);

    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const ovPath = OVERRIDES_JSON;
    const overrides = fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, 'utf8')) : {};

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updatedCount = 0;

    scraped.forEach(s => {
        let ipo = matchEntry(data, s.companyName, s.symbol);
        if (!ipo) return;

        // Skip historical closed/listed IPOs to prevent year hallucination downgrading them
        if (ipo.stage === 5) return;

        let changed = false;

        if (s.openDate && ipo.openingDate !== s.openDate) {
            ipo.openingDate = s.openDate;
            changed = true;
        }
        if (s.closeDate && ipo.closingDate !== s.closeDate) {
            ipo.closingDate = s.closeDate;
            changed = true;
        }
        if (s.listingDate && ipo.listingDate !== s.listingDate) {
            ipo.listingDate = s.listingDate;
            changed = true;
        }
        if (s.price && (!ipo.price || ipo.price === 0 || ipo.price === 0.3)) {
            ipo.price = s.price;
            changed = true;
        }

        // Auto-compute stage based on dates
        const closeD = parseFlexDate(ipo.closingDate);
        if (closeD) {
            closeD.setHours(23, 59, 59, 999);
            const listD = parseFlexDate(ipo.listingDate);
            if (listD) listD.setHours(0, 0, 0, 0);

            if (listD && listD <= today) {
                if (ipo.stage !== 5) {
                    ipo.stage = 5;
                    ipo.status = 'Listed';
                    changed = true;
                }
            } else if (closeD < now) {
                if (ipo.stage < 4) { // Only upgrade, don't downgrade
                    ipo.stage = 4;
                    ipo.status = 'Pre-Listing';
                    changed = true;
                }
            } else if (closeD >= now) {
                if (ipo.stage < 3) { // Only upgrade, don't downgrade
                    ipo.stage = 3;
                    ipo.status = 'Application Open';
                    changed = true;
                }
            }
        }

        if (changed) {
            console.log(`   ✨ ${ipo.companyName} dikemas kini -> Stage ${ipo.stage} (${ipo.status}) | Buka: ${ipo.openingDate || '-'}, Tutup: ${ipo.closingDate || '-'}, Harga: RM ${ipo.price || '-'}`);
            updatedCount++;

            if (!overrides[ipo.id]) overrides[ipo.id] = {};
            overrides[ipo.id].stage = ipo.stage;
            overrides[ipo.id].status = ipo.status;
            if (ipo.openingDate) overrides[ipo.id].openingDate = ipo.openingDate;
            if (ipo.closingDate) overrides[ipo.id].closingDate = ipo.closingDate;
            if (ipo.listingDate) overrides[ipo.id].listingDate = ipo.listingDate;
            if (ipo.price) overrides[ipo.id].price = ipo.price;
        }
    });

    if (updatedCount === 0) {
        console.log('✅ Semua tarikh dan peringkat (stage) IPO awam sudah selaras.');
        return;
    }

    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS, js, 'utf8');
    fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`\n🎉 Berjaya mengemas kini ${updatedCount} IPO awam ke data.json, data.js, dan overrides.json!`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
