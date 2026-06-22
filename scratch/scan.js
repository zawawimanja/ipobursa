const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const gainers = d.filter(x => typeof x.dailyChange === 'number' && x.dailyChange > 0).sort((a,b) => b.dailyChange - a.dailyChange).slice(0, 15);
console.log('\nTOP GAINERS HARI INI (LIVE):');
gainers.forEach((x, i) => {
    console.log(`${i+1}. ${x.symbol || x.id} : RM ${x.currentPrice.toFixed(3)} (+${x.dailyChange.toFixed(2)}%) [Sifu TP: RM ${(x.calibratedSifuTargetPrice || x.sifuTargetPrice || x.avgTP || 0).toFixed(2)}]`);
});
