const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const DATA_JS_FILE = path.join(__dirname, '../data.js');

if (!fs.existsSync(DATA_JSON_FILE)) {
    console.error('data.json not found!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

let count = 0;
data.forEach(d => {
    // Target listed (stage 5), shariah-compliant, high quality (Grade A/B) stocks
    if (d.stage === 5 && d.shariah && (d.predictedGrade === 'A' || d.predictedGrade === 'B')) {
        const curPrice = d.currentPrice || d.price || 0;
        const highPrice = d.highPrice || 0;
        
        // If no target price is set, use the historical high as the target price
        if (!d.sifuTargetPrice && highPrice > curPrice) {
            d.sifuTargetPrice = parseFloat(highPrice.toFixed(3));
            count++;
        }
    }
});

if (count > 0) {
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 2));
    
    // Regenerate data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(DATA_JS_FILE, jsContent);
    
    console.log(`Successfully updated ${count} legacy stocks in data.json and data.js.`);
} else {
    console.log('No legacy stocks needed updates.');
}
