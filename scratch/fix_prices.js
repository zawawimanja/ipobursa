const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Accurate recent prices as of June 2026
    const updates = {
        'ei-power': { currentPrice: 0.62, performance: "+29.17%", closePrice: 0.62 },
        'bus-cap': { currentPrice: 0.265, performance: "+15.22%", closePrice: 0.265 },
        'gold-li': { currentPrice: 0.115, performance: "-11.54%", closePrice: 0.115 },
        'inspace-creation': { currentPrice: 0.235, performance: "-6.00%", closePrice: 0.235 },
        'mm-computer': { currentPrice: 0.225, performance: "+2.27%", closePrice: 0.225 },
        '5e-resources': { currentPrice: 0.25, performance: "-3.85%", closePrice: 0.25 },
        'keeming': { currentPrice: 1.09, performance: "+186.84%", closePrice: 1.09 }
    };

    let count = 0;
    data.forEach(ipo => {
        if (updates[ipo.id]) {
            Object.assign(ipo, updates[ipo.id]);
            console.log(`Updated ${ipo.id} -> price: ${ipo.currentPrice}, perf: ${ipo.performance}`);
            count++;
        }
    });

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log(`Successfully fixed ${count} prices in data.json and data.js`);

} catch (err) {
    console.error('Error fixing prices:', err);
    process.exit(1);
}
