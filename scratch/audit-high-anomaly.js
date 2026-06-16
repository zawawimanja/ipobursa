const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

console.log('Auditing database for stocks where currentPrice > highPrice:');

const anomalous = [];

data.forEach(d => {
    if (d.stage !== 5) return;
    
    const high = d.highPrice || 0;
    const curPrice = d.currentPrice || d.price || 0;
    
    if (curPrice > high && curPrice > 0 && high > 0) {
        anomalous.push({
            id: d.id,
            symbol: d.symbol || d.id.toUpperCase(),
            companyName: d.companyName,
            currentPrice: curPrice,
            highPrice: high,
            year: d.year
        });
    }
});

anomalous.forEach(a => {
    console.log(`ANOMALY|${a.symbol}|${a.companyName}|Current=RM ${a.currentPrice.toFixed(3)}|High=RM ${a.highPrice.toFixed(3)}|Year=${a.year}`);
});
console.log(`Total anomalies: ${anomalous.length}`);
