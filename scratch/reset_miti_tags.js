const fs = require('fs');
let data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Reset all bulk-tagged hasMitiTranche (no mitiOpenDate = unconfirmed)
// Only keep confirmed MITI entries that have actual mitiOpenDate
let resetCount = 0;
let keptTrue = 0;
let keptFalse = 0;

data = data.map(x => {
    if (x.mitiOpenDate) {
        // Has actual dates - confirmed MITI
        x.hasMitiTranche = true;
        keptTrue++;
        return x;
    }
    if (x.hasMitiTranche === true) {
        // Generic/bulk tag with no dates - unconfirmed, remove it
        delete x.hasMitiTranche;
        resetCount++;
        return x;
    }
    if (x.hasMitiTranche === false) {
        // Explicitly confirmed NO MITI (e.g. SRKK AI) - keep false
        keptFalse++;
        return x;
    }
    return x;
});

fs.writeFileSync('data.json', JSON.stringify(data, null, 4), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync('data.js', jsContent, 'utf8');

console.log('Reset generic hasMitiTranche=true (unconfirmed):', resetCount);
console.log('Kept hasMitiTranche=true (confirmed, has dates):', keptTrue);
console.log('Kept hasMitiTranche=false (confirmed no MITI):', keptFalse);
console.log('Total with mitiOpenDate:', data.filter(x => x.mitiOpenDate).length);
