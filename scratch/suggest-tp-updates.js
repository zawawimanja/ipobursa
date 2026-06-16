const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

console.log('Scanning all 2024-2026 Grade A/B stocks for outdated targets:');

const targetsToUpdate = [];

data.forEach(d => {
    if (d.stage !== 5) return;
    if (!d.shariah) return;
    if (d.predictedGrade !== 'A' && d.predictedGrade !== 'B') return;
    if (d.year < 2024) return;
    
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    
    if (curPrice > 0 && tp > 0 && curPrice > tp) {
        // Suggested target: 1.25 * currentPrice or 1.25 * highPrice, whichever is higher (rounded to nearest 2 decimals)
        const peak = Math.max(curPrice, highPrice);
        const newTP = parseFloat((peak * 1.25).toFixed(2));
        
        targetsToUpdate.push({
            id: d.id,
            symbol: d.symbol || d.id.toUpperCase(),
            companyName: d.companyName,
            currentPrice: curPrice,
            oldTP: tp,
            highPrice: highPrice,
            suggestedTP: newTP,
            year: d.year
        });
    }
});

targetsToUpdate.forEach(t => {
    console.log(`UPDATE|${t.symbol}|${t.companyName}|Current=RM ${t.currentPrice.toFixed(3)}|OldTP=RM ${t.oldTP.toFixed(3)}|High=RM ${t.highPrice.toFixed(3)}|SuggestedNewTP=RM ${t.suggestedTP.toFixed(2)}`);
});
