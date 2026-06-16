const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
if (!fs.existsSync(DATA_JSON_FILE)) {
    console.error('data.json not found!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Filter rules:
// - Listed (stage 5)
// - Shariah-compliant
// - Grade A or B
// - Has currentPrice > 0 and sifuTargetPrice > 0
// - Inside buy zone (currentPrice <= sifuTargetPrice)
// - NOT in a downtrend (currentPrice > highPrice * 0.75)

const activeStocks = data.filter(d => {
    if (d.stage !== 5) return false;
    if (!d.shariah) return false;
    if (d.predictedGrade !== 'A' && d.predictedGrade !== 'B') return false;
    
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    
    if (curPrice <= 0 || tp <= 0) return false;
    
    // In Buy Zone?
    if (curPrice > tp) return false;
    
    // Downtrend Safety Check
    const isDowntrend = highPrice ? (curPrice <= highPrice * 0.75) : false;
    if (isDowntrend) return false;
    
    return true;
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
        year: d.year
    };

    // Classify into Swing vs Scalp
    const strategy = d.strategy || 'Swing';
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
    console.log(`SWING|${p.symbol}|${p.companyName}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|${p.year}`);
});

console.log('\n--- ACTIVE SCALP PICKS ---');
scalpPicks.forEach(p => {
    console.log(`SCALP|${p.symbol}|${p.companyName}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|${p.year}`);
});
