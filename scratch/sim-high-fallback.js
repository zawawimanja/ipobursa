const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

let count = 0;
console.log('Simulating High-Price fallback for legacy IPOs:');

data.forEach(d => {
    if (d.stage === 5 && d.shariah && (d.predictedGrade === 'A' || d.predictedGrade === 'B')) {
        const curPrice = d.currentPrice || d.price || 0;
        const highPrice = d.highPrice || 0;
        
        if (!d.sifuTargetPrice && highPrice > curPrice) {
            const upside = ((highPrice - curPrice) / curPrice) * 100;
            console.log(`- ${d.symbol || d.id} (${d.companyName}): Grade=${d.predictedGrade}, Current=${curPrice}, High/TP=${highPrice}, Upside=+${upside.toFixed(1)}%`);
            count++;
        }
    }
});

console.log(`\nTotal stocks that can be restored with High-Price fallback: ${count}`);
