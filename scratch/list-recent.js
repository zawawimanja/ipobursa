const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Sifu Portfolio Set
const sifuPortfolio = ["skyechip", "pentech", "elsa", "orkim", "ecoshop", "keyfield", "tanco"]; // typical portfolio picks
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));

const activeStocks = data.filter(d => {
    if (d.stage !== 5) return false;
    if (!d.shariah) return false;
    if (d.predictedGrade !== 'A' && d.predictedGrade !== 'B') return false;
    
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    
    if (curPrice <= 0 || tp <= 0) return false;
    if (curPrice > tp) return false;
    
    // Downtrend Check
    const isDowntrend = highPrice ? (curPrice <= highPrice * 0.75) : false;
    if (isDowntrend) return false;
    
    // Age Rule: Must be 2024, 2025, 2026 OR explicitly in Sifu's Watchlist
    const isRecent = d.year >= 2024;
    const isSifuPick = sifuPortfolioSet.has(d.id.toLowerCase()) || sifuPortfolioSet.has((d.symbol || '').toLowerCase());
    
    if (!isRecent && !isSifuPick) return false;
    
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

    const strategy = d.strategy || 'Swing';
    if (strategy.toLowerCase() === 'scalp') {
        scalpPicks.push(stockInfo);
    } else {
        swingPicks.push(stockInfo);
    }
});

swingPicks.sort((a, b) => b.upside - a.upside);
scalpPicks.sort((a, b) => b.upside - a.upside);

console.log('--- RECENT ACTIVE SWING ---');
swingPicks.forEach(p => {
    console.log(`SWING|${p.symbol}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|${p.year}`);
});

console.log('\n--- RECENT ACTIVE SCALP ---');
scalpPicks.forEach(p => {
    console.log(`SCALP|${p.symbol}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|+${p.upside}%|${p.trend}|${p.year}`);
});
