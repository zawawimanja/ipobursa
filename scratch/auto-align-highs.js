const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

console.log('Aligning recorded high prices to current prices where currentPrice > highPrice:');

let alignedCount = 0;

data.forEach(d => {
    if (d.stage !== 5) return;
    
    const curPrice = d.currentPrice || d.price || 0;
    const oldHigh = d.highPrice || 0;
    
    if (curPrice > oldHigh && curPrice > 0) {
        console.log(`- ${d.symbol || d.id.toUpperCase()}: High updated from RM ${oldHigh.toFixed(3)} -> RM ${curPrice.toFixed(3)}`);
        d.highPrice = curPrice;
        alignedCount++;
    }
});

if (alignedCount > 0) {
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\nSuccessfully aligned ${alignedCount} stocks in data.json.`);
} else {
    console.log('\nNo anomalies found to align.');
}
