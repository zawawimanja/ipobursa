/**
 * scrape_miti_from_insights.js
 * 
 * Scrapes each IPO's isaham.my/ipo/insights/ page to check if it has
 * a real MITI tranche allocation. Updates hasMitiTranche in data.json.
 * 
 * Run: node scratch/scrape_miti_from_insights.js
 * 
 * Note: isaham.my blocks direct axios requests. This script uses
 * enhanced headers. If still blocked, run sync-isaham.js with --miti-only flag
 * or update manually from the browser.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS   = path.join(__dirname, '..', 'data.js');
const RESULTS   = path.join(__dirname, 'miti_scrape_results.json');

// Realistic browser headers to bypass 403
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://www.isaham.my/ipo',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
};

// Map our data.js IDs to isaham insight URL slugs
// Format: { dataId: 'isaham-slug' }
const SLUG_MAP = {
    // 2026 listed
    'stratus-global': 'stratus-global-holdings-berhad',
    'enest-group': 'enest-group-berhad',
    'srkk-ai': 'srkk-ai-berhad',
    'eckem-holdings': 'eckem-holdings-berhad',
    'liftech-group': 'liftech-group-berhad',
    'hss-holdings': 'hss-holdings-berhad',
    'sum-technology': 'sum-technology-berhad',
    'elsa-berhad': 'elsa-berhad',
    'pentech-holdings': 'pentech-holdings-berhad',
    'mm-computer': 'mm-computer-systems-berhad',
    'bus-cap': 'bus-cap-berhad',
    'keeming': 'keeming',
    'ei-power': 'ei-power-berhad',
    'gold-li': 'gold-li-holdings-berhad',
    'inspace-creation': 'inspace-creation-berhad',
    'manforce-group': 'manforce-group-berhad',
    'ams-advanced': 'ams-advanced-material-berhad',
    'empire-premium': 'empire-premium-food-berhad',
    'golden-destinations': 'golden-destinations-group-berhad',
    '5e-resources': '5e-resources-berhad',
    'sunmed': 'sunway-medical',
    'adnex': 'adnex-berhad',
    'ogx': 'ogx-berhad',
    'mtt-shipping': 'mtt-shipping-and-logistics-bhd',
    'teamstr': 'teamstr-berhad',
    'hocksoon': 'hocksoon-berhad',
    'ambest': 'ambest-berhad',
    'isf': 'isf-berhad',
    'ogm': 'ogm-berhad',
    'sbs': 'sbs-berhad',

    // 2025 listed
    'genergy': 'genergy-berhad',
    'lacmed': 'lacmed-berhad',
    'orkim': 'orkim-berhad',
    'bms': 'bms-berhad',
    'geohan': 'geohan-berhad',
    'psp': 'psp-berhad',
    'polymer': 'polymer-berhad',
    'aquawalk': 'aquawalk-berhad',
    'pmw': 'pmw-berhad',
    'famiera': 'famiera-berhad',
    'power': 'power-berhad',
    'iab': 'iab-berhad',
    'thmy': 'thmy-berhad',
    'verdant': 'verdant-berhad',
    'xpb': 'xpb-berhad',
    'jssolar': 'jssolar-berhad',
    'oxb': 'oxb-berhad',
    'enpro': 'enpro-berhad',
    'icents': 'icents-berhad',
    'a1akk': 'a1akk-berhad',
    'pmck': 'pmck-berhad',
    'asm': 'asm-berhad',
    'pmibhd': 'pmibhd-berhad',
    'cki': 'cki-berhad',
    'hkb': 'hkb-berhad',
    'sag': 'sag-berhad',
    'ictzone': 'ictzone-berhad',
    'ohm': 'ohm-berhad',
    'ecoshop': 'ecoshop-berhad',
    'people': 'people-berhad',
    'fibro': 'fibro-berhad',
    'westrvr': 'westrvr-berhad',
    'reachten': 'reachten-berhad',
    'wtec': 'wtec-berhad',
    'msb': 'msb-berhad',
    'sumi': 'sumi-berhad',
    'hi': 'hi-berhad',
    'clite': 'clite-berhad',
    'dengkil': 'wawasan-dengkil-holdings',
    'lsh': 'lsh-berhad',
    'pglobal': 'pglobal-berhad',
    'sunlogy': 'sunlogy-berhad',
    'techstore': 'techstore-berhad',
    'rtech': 'rtech-berhad',
    'colform': 'colform-berhad',
    'kopi': 'kopi-berhad',
    'cbhb': 'cbhb-berhad',
    'set': 'set-berhad',
};

// Keywords that indicate REAL MITI tranche (not just policy mentions)
const MITI_KEYWORDS = [
    'sahamonline.miti.gov.my',
    'saham online miti',
    'sahamonline',
    'miti portal',
    'portal miti',
    'bumiputera investor approved by miti',
    'miti-approved bumiputera',
    'ministry of investment, trade and industry approved',
    'peruntukan miti',
    'pengagihan miti',
    'lot miti',
    'tranche miti',
    'miti tranche',
    'miti allocation',
    'miti lot',
    'bumiputera approved bumiputera investors (miti)',
    'pink form miti',
];

async function fetchInsights(slug) {
    const url = `https://www.isaham.my/ipo/insights/${slug}`;
    try {
        const resp = await axios.get(url, { headers: HEADERS, timeout: 10000 });
        return { url, html: resp.data, status: 200 };
    } catch (e) {
        return { url, html: null, status: e.response?.status || 0, error: e.message };
    }
}

function checkHasMiti(html) {
    if (!html) return { hasMiti: null, reason: 'fetch_failed' };
    const text = html.toLowerCase();
    
    for (const kw of MITI_KEYWORDS) {
        if (text.includes(kw.toLowerCase())) {
            return { hasMiti: true, keyword: kw };
        }
    }

    // Also check for explicit "no miti" signals
    if (text.includes('no miti') || text.includes('tiada miti') || text.includes('without miti')) {
        return { hasMiti: false, reason: 'explicit_no_miti' };
    }

    return { hasMiti: false, reason: 'no_miti_keywords_found' };
}

async function main() {
    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const results = [];
    const slugEntries = Object.entries(SLUG_MAP);
    
    console.log(`\nScraping ${slugEntries.length} IPO insights pages...\n`);

    for (const [dataId, slug] of slugEntries) {
        // Find matching IPO in data
        const ipo = data.find(x => {
            if (x.id === dataId) return true;
            if (x.id && x.id.includes(dataId.split('-')[0])) return true;
            return false;
        });

        process.stdout.write(`  ${slug.padEnd(45)} → `);
        
        const { url, html, status, error } = await fetchInsights(slug);
        
        if (status === 403) {
            console.log(`❌ 403 Blocked`);
            results.push({ dataId, slug, status: 403, hasMiti: null });
            await sleep(500);
            continue;
        }
        if (status === 404) {
            console.log(`⚠️  404 Not Found`);
            results.push({ dataId, slug, status: 404, hasMiti: null });
            await sleep(200);
            continue;
        }
        if (!html) {
            console.log(`❌ Error: ${error}`);
            results.push({ dataId, slug, status, hasMiti: null, error });
            await sleep(500);
            continue;
        }

        const { hasMiti, keyword, reason } = checkHasMiti(html);
        
        if (hasMiti === true) {
            console.log(`✅ HAS MITI  [keyword: "${keyword}"]`);
        } else {
            console.log(`❌ NO MITI  [reason: ${reason}]`);
        }

        results.push({ dataId, slug, status, hasMiti, keyword, reason });
        
        // Update data if IPO found and hasMiti is definitive
        if (ipo && hasMiti !== null) {
            ipo.hasMitiTranche = hasMiti;
            if (!hasMiti) {
                // Clear MITI dates if not a MITI IPO
                if (!ipo.mitiOpenDate) delete ipo.mitiOpenDate;
                if (!ipo.mitiCloseDate) delete ipo.mitiCloseDate;
            }
        }

        // Be polite - don't hammer the server
        await sleep(800);
    }

    // Save results log
    fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n📄 Results saved to scratch/miti_scrape_results.json`);

    // Summary
    const confirmed = results.filter(r => r.hasMiti === true);
    const noMiti = results.filter(r => r.hasMiti === false);
    const failed = results.filter(r => r.hasMiti === null);
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Confirmed MITI:  ${confirmed.length}`);
    console.log(`  ❌ No MITI:         ${noMiti.length}`);
    console.log(`  ⚠️  Failed/Unknown: ${failed.length}`);

    if (failed.length > 0) {
        console.log('\n⚠️  BLOCKED pages (need manual check):');
        failed.forEach(r => console.log(`   - https://www.isaham.my/ipo/insights/${r.slug}`));
    }

    // Save updated data files
    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS, jsContent, 'utf8');
    console.log('\n✅ data.json and data.js updated!');
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

main().catch(console.error);
