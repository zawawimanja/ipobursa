const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

try {
    const ipos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const index = ipos.findIndex(ipo => ipo.id === 'srkk-ai');

    if (index === -1) {
        console.error('SRKK AI Berhad not found in data.json');
        process.exit(1);
    }

    // Update SRKK AI actual listed data
    ipos[index].openPrice = 0.60;
    ipos[index].highPrice = 0.615;
    ipos[index].closePrice = 0.61;
    ipos[index].currentPrice = 0.61;
    ipos[index].performance = "+90.62%";
    ipos[index].strategy = "Scalp";
    ipos[index].status = "Listed";
    ipos[index].stage = 5;

    // Save data.json
    fs.writeFileSync(jsonPath, JSON.stringify(ipos, null, 4), 'utf8');
    console.log('Saved data.json successfully.');

    // Save data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(ipos, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('Saved data.js successfully.');

} catch (err) {
    console.error('Error during update:', err);
    process.exit(1);
}
