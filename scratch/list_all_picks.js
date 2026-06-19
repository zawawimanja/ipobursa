const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '..', 'data.json');
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

const results = [];

data.forEach(ipo => {
    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    
    // Grade Check
    if (ipo.predictedGrade !== 'A' && ipo.predictedGrade !== 'B' && !isSifuPick) return;
    
    // Listed and Shariah Check
    if (ipo.stage !== 5 && ipo.status !== 'Listed') return;
    if (!ipo.shariah) return;
    
    // Recent Check: Only show recent IPOs (listed within 365 days) unless explicitly handpicked by Sifu OR currently near ATH (within 5%)
    let isRecent = false;
    const highPriceVal = ipo.highPrice || 0;
    const isNearAth = highPriceVal ? (ipo.currentPrice >= highPriceVal * 0.95) : false;
    if (ipo.listingDate) {
        const listDate = new Date(ipo.listingDate);
        const ageInDays = (new Date() - listDate) / (1000 * 60 * 60 * 24);
        isRecent = ageInDays <= 365;
    } else {
        isRecent = ipo.year >= 2024;
    }
    if (!isRecent && !isSifuPick && !isNearAth) return;
    
    // Outlier Check
    if (ipo.outlier && !isSifuPick) return;
    
    // Skips
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return;
    
    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.sifuTargetPrice || ipo.avgTP || 0;
    const currentPrice = ipo.currentPrice || ipo.price || 0;
    const ipoPrice = ipo.price || 0;
    
    if (currentPrice <= 0 || targetPrice <= 0) return;
    
    // Breakout Check
    const isActualAth = highPrice > 0 && currentPrice >= (highPrice - 0.005);
    
    // Fake TP Placeholder Filter (unless in active breakout)
    if (!isActualAth && highPrice > 0 && Math.abs(targetPrice - highPrice) < 0.005) return;
    
    // Upside and Downtrend Check
    const upside = ((targetPrice - currentPrice) / currentPrice) * 100;
    const isDowntrendVal = highPrice ? (currentPrice <= highPrice * 0.75) : false;
    
    if (upside < 10.0 && !isActualAth) {
        // If it has low/negative upside and is not at ATH, it can ONLY be included if it is in pullback accumulation (not in a downtrend)
        if (isDowntrendVal) return;
    }
    
    // Anti-Stagnant (Sikat/Dead) Rule
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0) return;
    
    // Downtrend Safety Check
    const isDowntrend = highPrice ? (currentPrice <= highPrice * 0.75) : false;
    if (isDowntrend) return;
    
    // Strategy determination
    const isAthOrNear = highPrice ? (currentPrice >= highPrice * 0.95) : false;
    const dailyChange = ipo.dailyChange || 0;
    const isScalpTrend = isAthOrNear || dailyChange >= 3.0;
    
    let strategy = 'Swing';
    const isPullback = (upside < 10.0 && !isAthOrNear && !isDowntrendVal);
    
    if (isPullback) {
        strategy = 'Pullback';
    } else if (isScalpTrend || ipo.strategy === 'Scalp') {
        strategy = 'Scalp';
    } else {
        strategy = ipo.strategy || 'Swing';
    }
    
    // Trend Text
    let trendText = 'Uptrend';
    if (isDowntrend) {
        trendText = 'Bearish/Downtrend';
    } else if (highPrice > 0 && currentPrice <= highPrice * 0.90) {
        trendText = 'Pullback (Healthy)';
    } else if (dailyChange >= 3.0) {
        trendText = '⚡ Breakout';
    } else if (Math.abs(dailyChange) < 1.0) {
        trendText = 'Consolidating';
    }
    
    results.push({
        symbol: ipo.symbol || ipo.id.toUpperCase(),
        companyName: ipo.companyName,
        grade: ipo.predictedGrade || 'N/A',
        currentPrice: currentPrice,
        highPrice: highPrice,
        ipoPrice: ipoPrice,
        sifuTP: targetPrice,
        upside: parseFloat(upside.toFixed(1)),
        trend: trendText,
        strategy: strategy,
        year: ipo.year,
        os: ipo.os || 'N/A'
    });
});

// Group by strategy
const swing = results.filter(r => r.strategy === 'Swing').sort((a, b) => b.upside - a.upside);
const scalp = results.filter(r => r.strategy === 'Scalp').sort((a, b) => b.upside - a.upside);
const pullback = results.filter(r => r.strategy === 'Pullback').sort((a, b) => b.upside - a.upside);

console.log('--- SWING PICKS ---');
swing.forEach(p => {
    console.log(`${p.symbol}|${p.companyName}|Gred ${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|OS: ${p.os}x`);
});

console.log('\n--- SCALP PICKS ---');
scalp.forEach(p => {
    console.log(`${p.symbol}|${p.companyName}|Gred ${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|OS: ${p.os}x`);
});

console.log('\n--- PULLBACK PICKS ---');
pullback.forEach(p => {
    console.log(`${p.symbol}|${p.companyName}|Gred ${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|OS: ${p.os}x`);
});
