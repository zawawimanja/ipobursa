const fs = require('fs');
const jsonPath = 'data.json';
const jsPath = 'data.js';

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Update KEEMING - MITI portal: 21 Jan - 27 Jan 2026
const keemingIdx = data.findIndex(x => x.id === 'keeming');
if (keemingIdx !== -1) {
    data[keemingIdx].mitiOpenDate = '21-Jan-2026';
    data[keemingIdx].mitiCloseDate = '27-Jan-2026';
    data[keemingIdx].hasMitiTranche = true;
    console.log('KEEMING updated:', data[keemingIdx].companyName);
}

// Update SRKK AI - MITI portal same as public: 18 Jun - 25 Jun 2026
const srkkIdx = data.findIndex(x => x.id === 'srkk-ai');
if (srkkIdx !== -1) {
    data[srkkIdx].mitiOpenDate = '18-Jun-2026';
    data[srkkIdx].mitiCloseDate = '25-Jun-2026';
    data[srkkIdx].hasMitiTranche = true;
    console.log('SRKK updated:', data[srkkIdx].companyName);
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('data.json and data.js updated!');
