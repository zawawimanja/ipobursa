const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
if (!fs.existsSync(DATA_JSON_FILE)) {
    console.error('data.json not found!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Sifu Portfolio Set
const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));
const explicitSkips = ['adnex', 'mmcs', 'agmo', 'wentel-engineering', 'wentel'];

console.log('Searching for ATH & 52w Breakout Candidates (within 5% of historical high):');

const athPicks = [];

data.forEach(d => {
    if (d.stage !== 5) return;
    if (!d.shariah) return;
    
    const idLower = d.id.toLowerCase();
    const symbolLower = (d.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    const isMomentumRebound = typeof d.dailyChange === 'number' && d.dailyChange >= 10.0;

    if (d.predictedGrade !== 'A' && d.predictedGrade !== 'B' && !isSifuPick && !isMomentumRebound) return;
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return;
    if (d.outlier && !isSifuPick && !isMomentumRebound) return;
    
    const curPrice = d.currentPrice || d.price || 0;
    const highPrice = d.highPrice || 0;
    const ipoPrice = d.price || 0;
    const dailyChange = d.dailyChange || 0;
    
    if (curPrice <= 0) return;
    
    // Quality check: must not be below IPO price (unless momentum rebound)
    if (curPrice < ipoPrice && !isMomentumRebound) return;
    
    const distanceToHigh = highPrice > 0 ? (((highPrice - curPrice) / highPrice) * 100) : 0;
    
    // Within 5% of high? (meaning it's either breaking out or extremely close) OR is momentum rebound
    if ((highPrice > 0 && curPrice >= highPrice * 0.95) || isMomentumRebound) {
        let isRecent = false;
        if (d.listingDate) {
            const listDate = new Date(d.listingDate);
            const ageInDays = (new Date() - listDate) / (1000 * 60 * 60 * 24);
            isRecent = ageInDays <= 365;
        } else {
            isRecent = d.year >= 2024;
        }
        
        if (isRecent || isSifuPick || isMomentumRebound) {
            athPicks.push({
                symbol: d.symbol || d.id.toUpperCase(),
                companyName: d.companyName,
                grade: d.predictedGrade || 'N/A',
                currentPrice: curPrice,
                highPrice: highPrice,
                distance: parseFloat(distanceToHigh.toFixed(1)),
                dailyChange: dailyChange,
                year: d.year,
                os: d.os || 'N/A'
            });
        }
    }
});

// Sort by dailyChange descending
athPicks.sort((a, b) => b.dailyChange - a.dailyChange);

athPicks.forEach(p => {
    console.log(`ATH|${p.symbol}|${p.companyName}|${p.grade}|Current=RM ${p.currentPrice.toFixed(3)}|High=RM ${p.highPrice.toFixed(3)}|Dist=${p.distance}%|DailyChange=${p.dailyChange}%|${p.year}|${p.os}x`);
});
