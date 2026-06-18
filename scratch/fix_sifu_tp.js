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

const dataPath = path.join(__dirname, '..', 'data.js');
let content = fs.readFileSync(dataPath, 'utf8');
const data = require(dataPath);

let fixed = 0;
let log = [];

data.forEach((ipo, idx) => {
    const sym = (ipo.symbol || '').toUpperCase();
    if (corrections[sym] !== undefined) {
        const oldTP = ipo.sifuTargetPrice;
        const newTP = corrections[sym];
        
        if (Math.abs(oldTP - newTP) > 0.005) {
            // Find and replace in the raw content
            // We need to find this specific IPO's sifuTargetPrice line
            // Strategy: find the id line, then find the next sifuTargetPrice line
            const idStr = `"id": "${ipo.id}"`;
            const idPos = content.indexOf(idStr);
            
            if (idPos !== -1) {
                // Find sifuTargetPrice after this id
                const searchStart = idPos;
                const nextIdPos = content.indexOf('"id":', idPos + idStr.length);
                const searchEnd = nextIdPos !== -1 ? nextIdPos : content.length;
                
                const block = content.substring(searchStart, searchEnd);
                const tpRegex = /"sifuTargetPrice":\s*([0-9.]+)/;
                const match = block.match(tpRegex);
                
                if (match) {
                    const oldLine = match[0];
                    const newLine = `"sifuTargetPrice": ${newTP}`;
                    
                    // Replace only within this block
                    const newBlock = block.replace(oldLine, newLine);
                    content = content.substring(0, searchStart) + newBlock + content.substring(searchEnd);
                    
                    fixed++;
                    log.push(`✅ ${sym}: ${oldTP} → ${newTP}`);
                }
            }
        }
    }
});

fs.writeFileSync(dataPath, content, 'utf8');

console.log('═'.repeat(50));
console.log(`FIXED ${fixed} sifuTargetPrice values:`);
console.log('═'.repeat(50));
log.forEach(l => console.log(l));
console.log('\n✅ data.js updated successfully!');
