const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
if (!fs.existsSync(DATA_JSON_FILE)) {
    console.error('data.json not found!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Sifu Portfolio (Watchlist) & Skips
const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));
const explicitSkips = ['adnex', 'mmcs', 'agmo', 'wentel-engineering', 'wentel'];

// Filter rules:
// - Listed (stage 5)
// - Shariah-compliant
// - Grade A or B (or Sifu portfolio pick)
// - Has currentPrice > 0 and sifuTargetPrice > 0
// - Inside buy zone (currentPrice <= sifuTargetPrice)
// - NOT below IPO price (currentPrice >= price)
// - NOT in a downtrend (currentPrice > highPrice * 0.75)
// - Age Rule: Year >= 2024 OR in Sifu's Watchlist
// - Not in explicit skips

const activeStocks = data.filter(d => {
    if (d.stage !== 5) return false;
    if (!d.shariah) return false;
    
    const idLower = d.id.toLowerCase();
    const symbolLower = (d.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    
    // Allow Grade A or B, or Sifu picks regardless of grade
    if (d.predictedGrade !== 'A' && d.predictedGrade !== 'B' && !isSifuPick) return false;
    
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;
    
    // Exclude outlier stocks unless they are explicitly handpicked in Sifu's Portfolio
    if (d.outlier && !isSifuPick) return false;
    
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    const ipoPrice = d.price || 0;
    
    if (curPrice <= 0 || tp <= 0) return false;
    
    // In Buy Zone?
    if (curPrice > tp) return false;
    
    // Above or equal to IPO price? (No failed/bocor IPOs)
    if (curPrice < ipoPrice) return false;
    
    // 0. Fake TP Placeholder Filter:
    // If TP is equal to (or within 0.005 of) highPrice, it is a fake TP placeholder.
    if (highPrice > 0 && Math.abs(tp - highPrice) < 0.005) return false;
    
    // 1. Minimum Upside Rule: Must have at least 10% upside to TP Sifu
    const upside = ((tp - curPrice) / curPrice) * 100;
    if (upside < 10.0) return false;
    
    // 2. Anti-Stagnant (Sikat/Dead) Rule:
    // If listed before 2026 and its historical high is less than 8% above its IPO price, it is stagnant.
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (d.year < 2026 && highAboveIpo < 8.0) return false;
    
    // Downtrend Safety Check
    const isDowntrend = highPrice ? (curPrice <= highPrice * 0.75) : false;
    // Exempt Sifu portfolio picks from strict downtrend filter since they are fundamentally vetted
    const isRecent = d.year >= 2024;
    
    if (!isSifuPick && isRecent && isDowntrend) return false;
    
    return isRecent || isSifuPick;
});

const swingPicks = [];
const scalpPicks = [];

activeStocks.forEach(d => {
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    const dailyChange = d.dailyChange || 0;
    
    const upside = ((tp - curPrice) / curPrice) * 100;
    
    // Determine trend status
    let trend = 'Uptrend';
    if (highPrice > 0 && curPrice <= highPrice * 0.90) {
        trend = 'Pullback (Healthy)';
    } else if (dailyChange >= 3.0) {
        trend = 'Breakout';
    } else if (Math.abs(dailyChange) < 1.0) {
        trend = 'Consolidating';
    }
    
    const stockInfo = {
        symbol: d.symbol || d.id.toUpperCase(),
        companyName: d.companyName,
        grade: d.predictedGrade,
        currentPrice: curPrice,
        sifuTP: tp,
        upside: parseFloat(upside.toFixed(1)),
        trend: trend,
        year: d.year,
        os: d.os || 'N/A'
    };

    // Classify into Swing vs Scalp
    // If dailyChange >= 3% or is near ATH (>= 95% of highPrice), treat as Scalp
    const isAthOrNear = highPrice ? (curPrice >= highPrice * 0.95) : false;
    const isScalpTrend = isAthOrNear || dailyChange >= 3.0;
    
    const strategy = d.strategy || (isScalpTrend ? 'Scalp' : 'Swing');
    
    if (strategy.toLowerCase() === 'scalp') {
        scalpPicks.push(stockInfo);
    } else {
        swingPicks.push(stockInfo);
    }
});

// Sort by upside descending
swingPicks.sort((a, b) => b.upside - a.upside);
scalpPicks.sort((a, b) => b.upside - a.upside);

console.log('--- ACTIVE SWING PICKS ---');
swingPicks.forEach(p => {
    console.log(`SWING|${p.symbol}|${p.companyName}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|${p.year}|${p.os}x`);
});

console.log('\n--- ACTIVE SCALP PICKS ---');
scalpPicks.forEach(p => {
    console.log(`SCALP|${p.symbol}|${p.companyName}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|${p.year}|${p.os}x`);
});
