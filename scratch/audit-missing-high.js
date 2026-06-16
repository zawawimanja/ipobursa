const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

console.log('Auditing database for listed stocks (Stage 5) with missing highPrice:');

const missingHigh = [];

data.forEach(d => {
    if (d.stage !== 5) return;
    if (!d.shariah) return;
    
    const high = d.highPrice;
    const curPrice = d.currentPrice || d.price || 0;
    
    if (high === undefined || high === null || high === 0) {
        missingHigh.push({
            id: d.id,
            symbol: d.symbol || d.id.toUpperCase(),
            companyName: d.companyName,
            currentPrice: curPrice,
            year: d.year
        });
    }
});

missingHigh.forEach(m => {
    console.log(`MISSING|${m.symbol}|${m.companyName}|Current=RM ${m.currentPrice.toFixed(3)}|Year=${m.year}`);
});
console.log(`Total missing highPrice: ${missingHigh.length}`);
