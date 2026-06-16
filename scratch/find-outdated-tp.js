const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Full Sifu Portfolio from sifu-picks.html
const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));

console.log('Scanning Sifu Portfolio Watchlist for Outdated Target Prices (currentPrice > sifuTargetPrice):');

const outdated = [];

data.forEach(d => {
    const isSifuPick = sifuPortfolioSet.has(d.id.toLowerCase()) || sifuPortfolioSet.has((d.symbol || '').toLowerCase());
    if (!isSifuPick) return;
    
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    
    if (curPrice > 0 && tp > 0 && curPrice > tp) {
        outdated.push({
            id: d.id,
            symbol: d.symbol || d.id.toUpperCase(),
            companyName: d.companyName,
            currentPrice: curPrice,
            sifuTP: tp,
            highPrice: highPrice,
            year: d.year
        });
    }
});

outdated.forEach(o => {
    console.log(`OUTDATED|${o.symbol}|${o.companyName}|Current=RM ${o.currentPrice.toFixed(3)}|TP=RM ${o.sifuTP.toFixed(3)}|High=RM ${o.highPrice.toFixed(3)}|${o.year}`);
});
