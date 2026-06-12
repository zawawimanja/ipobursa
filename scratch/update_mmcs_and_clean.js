const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

if (!fs.existsSync(DATA_JSON)) {
    console.error('data.json not found!');
    process.exit(1);
}

// 1. Read data.json
let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
console.log(`Initial entries count: ${data.length}`);

// 2. Remove junk names
const junkNames = [
    'Register', 'Access', 'Seminars', 'Recommended amount to subscribe:',
    'Financing Details:', 'Cost Breakdown:', 'Filtered Statistics',
    'Select stocks:', 'Features', 'Company'
];
data = data.filter(d => !junkNames.includes(d.companyName) && d.id);

// 3. Remove duplicate 'gdgroup' (keep the one with full market data)
const gdgroupIndices = [];
data.forEach((item, index) => {
    if (item.id === 'gdgroup') {
        gdgroupIndices.push(index);
    }
});

if (gdgroupIndices.length > 1) {
    console.log(`Found duplicate gdgroup entries. Cleaning...`);
    const cleanGdgroup = data.filter((item, index) => {
        if (item.id === 'gdgroup') {
            return item.market === 'ACE Market';
        }
        return true;
    });
    data = cleanGdgroup;
}

// 4. Normalize market fields
const marketNormalizations = {
    'eckem': 'ACE Market',
    'sum-technology': 'ACE Market',
    'elsa': 'ACE Market',
    'pentech': 'ACE Market',
    'mm-computer': 'ACE Market',
    'stratus-global': 'Main Market',
    'ei-power': 'ACE Market',
    'liftech-group-berhad': 'ACE Market',
    'hss-holdings-berhad': 'ACE Market',
    'rt-pastry-holdings-berhad': 'ACE Market',
    'spb-development-berhad': 'Main Market',
    'evocom-berhad': 'ACE Market'
};

data.forEach(ipo => {
    if (marketNormalizations[ipo.id]) {
        const oldMarket = ipo.market;
        ipo.market = marketNormalizations[ipo.id];
        console.log(`Normalized market for ${ipo.companyName} (${ipo.id}): ${oldMarket} -> ${ipo.market}`);
    }
});

// 5. Update MMCS details
const mmcs = data.find(item => item.id === 'mm-computer');
if (mmcs) {
    console.log('Original MMCS entry:', mmcs);
    mmcs.os = 10.56;
    mmcs.openPrice = 0.22;
    mmcs.highPrice = 0.225;
    mmcs.closePrice = 0.215;
    mmcs.currentPrice = 0.215;
    mmcs.performance = '-2.27%';
    mmcs.predictedGrade = 'C';
    mmcs.analystInsight = '❌ <b>AVOID (GRADE C — GAGAL / BARAI)</b><br>💡 Keputusan OS sangat lemah pada <b>10.56x</b>. Seperti dijangka, kaunter ini dibuka flat (0.00%) dan ditutup di bawah harga IPO pada RM0.215 (-2.27%) disebabkan oleh tekanan jualan OFS yang besar (47.34M unit) dan tiada momentum sektor. Elakkan.';
    
    console.log('Updated MMCS entry:', mmcs);
} else {
    console.error('MMCS (mm-computer) entry not found in database!');
}

// 6. Save data.json and data.js
fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully saved data.json');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(DATA_JS, jsContent, 'utf8');
console.log('Successfully saved data.js');

console.log(`Final entries count: ${data.length}`);
