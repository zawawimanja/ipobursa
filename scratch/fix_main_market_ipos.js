/**
 * fix_main_market_ipos.js
 * 
 * Corrects market classification and MITI status for Main Market IPOs that were 
 * mislabelled as ACE Market in data.json.
 * 
 * Main Market IPOs require mandatory 12.5% SC Bumiputera allocation (MITI).
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// List of IPOs (symbols / IDs / names) that are listed on Bursa MAIN MARKET
const MAIN_MARKET_SYMBOLS_AND_IDS = [
    // 2024 Main Market IPOs
    'keyfield', 'jpg', 'johor plantations', 'tmk', 'mega fortris', 'megafb',
    'alpha ivf', 'azam jaya', '99 speed', '99smart', 'prolintas', 'plintas',
    
    // 2023 Main Market IPOs
    'dxn', 'radium', 'skyworld', 'skywld', 'cpetech', 'cpe technology',
    'mst golf', 'mstgolf',
    
    // 2022 & Older Main Market IPOs
    'ctos', 'swift', 'mrdiy', 'mr diy', 'solarvest', 'slvest', 'farm fresh', 'ffb',
    'itmax', 'senheng', 'ame', 'ame elite', 'optimax', 'samaiden'
];

let updatedCount = 0;

data = data.map(x => {
    const name = (x.companyName || '').toLowerCase();
    const sym = (x.symbol || '').toLowerCase();
    const id = (x.id || '').toLowerCase();

    const isMain = MAIN_MARKET_SYMBOLS_AND_IDS.some(key => 
        id === key || sym === key || name.includes(key)
    );

    if (isMain) {
        if (x.market !== 'Main Market' || x.hasMitiTranche !== true) {
            x.market = 'Main Market';
            x.hasMitiTranche = true;
            updatedCount++;
            console.log(`Updated to Main Market + MITI: ${x.companyName} (${x.symbol || x.id})`);
        }
    }

    return x;
});

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log(`\n✅ Completed! Updated ${updatedCount} Main Market IPO entries.`);
console.log('Total Main Market IPOs:', data.filter(x => x.market === 'Main Market').length);
console.log('Total Main Market Listed with prices:', data.filter(x => x.market === 'Main Market' && x.status === 'Listed' && x.openPrice != null).length);
