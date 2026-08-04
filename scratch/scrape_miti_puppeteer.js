/**
 * scrape_miti_puppeteer.js
 * 
 * Uses Puppeteer (real Chromium browser) to scrape isaham.my/ipo/insights/
 * for accurate MITI tranche data. Bypasses 403 bot detection.
 * 
 * Run: node scratch/scrape_miti_puppeteer.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS   = path.join(__dirname, '..', 'data.js');
const RESULTS   = path.join(__dirname, 'miti_puppeteer_results.json');

// Keywords that indicate REAL MITI tranche allocation (not just policy mention)
const MITI_KEYWORDS = [
    'sahamonline.miti.gov.my',
    'saham online miti',
    'sahamonline',
    'miti portal',
    'portal miti',
    'bumiputera investor approved by miti',
    'miti-approved bumiputera',
    'miti approved bumiputera',
    'peruntukan miti',
    'pengagihan miti',
    'lot miti',
    'tranche miti',
    'miti tranche',
    'miti allocation',
    'miti lot',
    'bumiputera (miti)',
    'miti bumiputera',
    'pink form miti',
    'approved bumiputera investors (miti)',
    'miti-recognised',
    'miti recognized',
];

// All listed IPOs to check - symbol -> isaham slug
const IPO_SLUGS = {
    // 2026
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
    'adnex': 'adnex-berhad',
    'mtt-shipping': 'mtt-shipping-and-logistics-bhd',
    'sunmed': 'sunmed-berhad',
    'teamstr': 'teamstr-berhad',
    'hocksoon': 'hocksoon-berhad',
    'ambest': 'ambest-berhad',
    'isf': 'isf-berhad',
    'ogm': 'ogm-berhad',
    'sbs': 'sbs-berhad',
    'ogx': 'ogx-berhad',
    'skychip': 'skyechip-berhad',

    // 2025
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
    'winstar': 'winstar-berhad',
    'carlorino': 'carlorino-berhad',
    'vanzo': 'vanzo-berhad',
    'topvisn': 'topvisn-berhad',
    'tmk': 'tmk-berhad',
    'cheeding': 'cheeding-berhad',

    // 2024
    'crpmate': 'crpmate-berhad',
    'supreme-consolidated': 'supreme-consolidated-resources-berhad',
    'metro': 'metro-berhad',
    'lwsabah': 'lwsabah-berhad',
    'azam-jaya': 'azam-jaya-berhad',
    'obhb': 'obhb-berhad',
    'sorento': 'sorento-berhad',
    'northeast-group': 'northeast-group-berhad',
    'crest': 'crest-berhad',
    'sdcg': 'sdcg-berhad',
    'hawk': 'hawk-berhad',
    'vtc': 'vtc-berhad',
    'epb': 'epb-berhad',
    'elridge': 'elridge-berhad',
    'scb': 'scb-berhad',
    'bwys': 'bwys-berhad',
    'jpg': 'jpg-berhad',
    'ofb': 'ofb-berhad',
    'gohub': 'gohub-berhad',
    'uue-holdings': 'uue-holdings-berhad',
    'agricor': 'agricor-berhad',
    'kti': 'kti-berhad',
    'kenergy': 'kenergy-berhad',
    'smart': 'smart-berhad',
    'feytech': 'feytech-berhad',
    'sinkung': 'sinkung-berhad',
    'fphb': 'fphb-berhad',
    'mkhop': 'mkhop-berhad',
    'topmix': 'topmix-berhad',
    'keyfield': 'keyfield-berhad',
    'sbh': 'sbh-berhad',
    'zantat': 'zantat-berhad',
    'plintas': 'plintas-berhad',
    'agx': 'agx-berhad',
    'wentel': 'wentel-engineering',
    'tsa': 'tsa-berhad',
    'mtec': 'mtec-berhad',
    'kjts': 'kjts-berhad',
};

function checkHasMiti(pageText) {
    const lower = pageText.toLowerCase();
    for (const kw of MITI_KEYWORDS) {
        if (lower.includes(kw.toLowerCase())) {
            return { hasMiti: true, keyword: kw };
        }
    }
    return { hasMiti: false };
}

async function main() {
    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const results = [];

    console.log('Launching Puppeteer browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const entries = Object.entries(IPO_SLUGS);
    console.log(`\nChecking ${entries.length} IPO insight pages...\n`);

    for (const [dataId, slug] of entries) {
        const url = `https://www.isaham.my/ipo/insights/${slug}`;
        process.stdout.write(`  ${slug.padEnd(48)} → `);

        try {
            const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const status = response.status();

            if (status === 404) {
                console.log(`⚠️  404 (wrong slug?)`);
                results.push({ dataId, slug, status: 404, hasMiti: null });
                continue;
            }

            // Wait for dynamic content to load
            await new Promise(r => setTimeout(r, 800));
            const bodyText = await page.evaluate(() => document.body.innerText);
            const { hasMiti, keyword } = checkHasMiti(bodyText);

            if (hasMiti) {
                console.log(`✅ HAS MITI  ["${keyword}"]`);
            } else {
                console.log(`❌ No MITI`);
            }

            results.push({ dataId, slug, status, hasMiti, keyword });

            // Find and update in data
            const ipo = data.find(x =>
                x.id === dataId ||
                (x.id && x.id.startsWith(dataId.split('-')[0]))
            );
            if (ipo) {
                ipo.hasMitiTranche = hasMiti;
                if (!hasMiti && !ipo.mitiOpenDate) {
                    delete ipo.mitiOpenDate;
                    delete ipo.mitiCloseDate;
                }
            }

        } catch (e) {
            console.log(`❌ Error: ${e.message.substring(0, 50)}`);
            results.push({ dataId, slug, hasMiti: null, error: e.message });
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 600));
    }

    await browser.close();

    // Save results
    fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2), 'utf8');

    const confirmed = results.filter(r => r.hasMiti === true);
    const noMiti = results.filter(r => r.hasMiti === false);
    const failed = results.filter(r => r.hasMiti === null);

    console.log(`\n📊 Final Results:`);
    console.log(`  ✅ Confirmed MITI:  ${confirmed.length}`);
    console.log(`  ❌ No MITI:         ${noMiti.length}`);
    console.log(`  ⚠️  Unknown/Error:  ${failed.length}`);

    if (confirmed.length > 0) {
        console.log(`\n✅ IPOs with MITI tranche:`);
        confirmed.forEach(r => console.log(`   - ${r.slug}`));
    }

    // Save updated data
    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS, jsContent, 'utf8');
    console.log('\n✅ data.json + data.js updated!');
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
