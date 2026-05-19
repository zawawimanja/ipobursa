const fs = require('fs');

const DATA_JSON_PATH = 'data.json';
const DATA_JS_PATH = 'data.js';

// Load
let ipoData = JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8'));
let count = 0;

// Revert
ipoData = ipoData.map(ipo => {
    if (ipo.stage === 3 && (ipo.price === 0 || !ipo.closingDate || ipo.closingDate.toLowerCase().includes('tba'))) {
        ipo.stage = 1;
        ipo.status = 'Draft / Exposure Phase';
        count++;
        console.log(`Reverted ${ipo.companyName} back to Stage 1 (Draft Phase)`);
    }
    return ipo;
});

if (count > 0) {
    // Save JSON
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(ipoData, null, 2), 'utf8');

    // Save JS
    const jsContent = `const IPO_DATA = ${JSON.stringify(ipoData, null, 2)};\n\nif (typeof module !== 'undefined') {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS_PATH, jsContent, 'utf8');
    
    console.log(`Successfully reverted ${count} draft listings back to Stage 1!`);
} else {
    console.log("No unpriced or TBA Public stage entries found.");
}
