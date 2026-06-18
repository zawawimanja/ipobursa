const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const countByYear = {};
const sifuCountByYear = {};
const countByStageAndYear = {};

data.forEach(ipo => {
    const y = ipo.year;
    if (!y) return;
    
    countByYear[y] = (countByYear[y] || 0) + 1;
    
    const stage = ipo.stage || 0;
    if (!countByStageAndYear[y]) {
        countByStageAndYear[y] = {};
    }
    countByStageAndYear[y][stage] = (countByStageAndYear[y][stage] || 0) + 1;

    if (ipo.sifuTargetPrice !== undefined && ipo.sifuTargetPrice !== null) {
        sifuCountByYear[y] = (sifuCountByYear[y] || 0) + 1;
    }
});

console.log('Total IPOs in database by Year:');
console.log(countByYear);

console.log('\nIPOs with Sifu Target Price by Year:');
console.log(sifuCountByYear);

console.log('\nIPOs by Year and Stage (Stage 5 = Listed):');
console.log(countByStageAndYear);

// Let's also count total from 2024 to 2026
let total24_26 = 0;
let totalSifu24_26 = 0;
for (let y = 2024; y <= 2026; y++) {
    total24_26 += (countByYear[y] || 0);
    totalSifu24_26 += (sifuCountByYear[y] || 0);
}

console.log(`\nFrom 2024 to 2026:`);
console.log(`- Total IPOs: ${total24_26}`);
console.log(`- IPOs with Sifu Target Price: ${totalSifu24_26}`);
