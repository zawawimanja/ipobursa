const fs = require('fs');
const path = require('path');

// Correct CK values from backtest (compare_stats.js - verified source)
const corrections = {
    'SKYECHIP': 1.58,
    'MMCS': 0.24,
    'POWER': 0.41,
    'TOPVISN': 0.41,
    'EPB': 0.71,
    'VERDANT': 0.38,
    'CRPMATE': 0.23,
    'XPB': 0.25,
    'HOCKSOON': 0.63,
    'BWYS': 0.31,
    'EIPOWER': 0.61,
    'ISF': 0.69,
    'AMS': 0.33,
    'TEAMSTR': 0.32,
    'TECHSTORE': 0.28,
    'OGM': 0.30,
    'CREST': 0.32,
    'AZAMJAYA': 1.04,
    'ECOSHOP': 1.31,
    'SDCG': 0.54,
    'KEYFIELD': 2.14,
    'WINSTAR': 0.51,
    'SUPREME': 0.29,
    'SAG': 1.29,
    'KEEMING': 0.68,
    'CBHB': 0.38,
    'IAB': 0.71,
    'LWSABAH': 0.80,
    'AMBEST': 0.34,
    'ELRIDGE': 0.55,
    'KOPI': 0.55,
    'PENTECH': 0.33,
};

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

let data = [];
if (fs.existsSync(jsonPath)) {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} else {
    console.error('data.json not found!');
    process.exit(1);
}

let fixed = 0;
let log = [];

data.forEach((ipo) => {
    const sym = (ipo.symbol || '').toUpperCase();
    if (corrections[sym] !== undefined) {
        const oldTP = ipo.sifuTargetPrice;
        const newTP = corrections[sym];
        
        if (oldTP === undefined || Math.abs(oldTP - newTP) > 0.005) {
            ipo.sifuTargetPrice = newTP;
            fixed++;
            log.push(`✅ ${sym}: ${oldTP !== undefined ? oldTP : 'N/A'} → ${newTP}`);
        }
    }
});

if (fixed > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
}

console.log('═'.repeat(50));
console.log(`FIXED ${fixed} sifuTargetPrice values:`);
console.log('═'.repeat(50));
log.forEach(l => console.log(l));
console.log('\n✅ data.json and data.js updated successfully!');
