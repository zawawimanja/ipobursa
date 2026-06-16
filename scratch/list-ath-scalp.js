const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Sifu Portfolio Set
const sifuPortfolio = ["skyechip", "pentech", "elsa", "orkim", "ecoshop", "keyfield", "tanco"];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));

console.log('Searching for ATH & 52w Breakout Candidates (within 5% of historical high):');

const athPicks = [];

data.forEach(d => {
    if (d.stage !== 5) return false;
    if (!d.shariah) return false;
    if (d.predictedGrade !== 'A' && d.predictedGrade !== 'B') return false;
    
    const curPrice = d.currentPrice || d.price || 0;
    const highPrice = d.highPrice || 0;
    const dailyChange = d.dailyChange || 0;
    
    if (curPrice <= 0 || highPrice <= 0) return;
    
    const distanceToHigh = ((highPrice - curPrice) / highPrice) * 100;
    
    // Within 5% of high? (meaning it's either breaking out or extremely close)
    if (curPrice >= highPrice * 0.95) {
        const isRecent = d.year >= 2024;
        const isSifuPick = sifuPortfolioSet.has(d.id.toLowerCase()) || sifuPortfolioSet.has((d.symbol || '').toLowerCase());
        
        if (isRecent || isSifuPick) {
            athPicks.push({
                symbol: d.symbol || d.id.toUpperCase(),
                companyName: d.companyName,
                grade: d.predictedGrade,
                currentPrice: curPrice,
                highPrice: highPrice,
                distance: parseFloat(distanceToHigh.toFixed(1)),
                dailyChange: dailyChange,
                year: d.year
            });
        }
    }
});

// Sort by dailyChange descending or distance to high ascending
athPicks.sort((a, b) => b.dailyChange - a.dailyChange);

athPicks.forEach(p => {
    console.log(`ATH|${p.symbol}|${p.companyName}|${p.grade}|Current=RM ${p.currentPrice.toFixed(3)}|High=RM ${p.highPrice.toFixed(3)}|Dist=${p.distance}%|DailyChange=${p.dailyChange}%|${p.year}`);
});
