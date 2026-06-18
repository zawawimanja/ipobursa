const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

if (!fs.existsSync(jsonPath)) {
    console.error('data.json not found!');
    process.exit(1);
}

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const initialLength = data.length;
data = data.filter(ipo => ipo.id !== 'srkk-ai-berhad');

if (data.length < initialLength) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log(`✅ Removed srkk-ai-berhad duplicate. Saved database.`);
} else {
    console.log('No srkk-ai-berhad found to remove.');
}
