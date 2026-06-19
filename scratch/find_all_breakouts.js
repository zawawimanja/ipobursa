const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

console.log('========================================================================');
console.log('🔍 SCANNING ALL SHARIAH COMPLIANT LISTED STOCKS FOR BREAKOUTS');
console.log('========================================================================');

const results = db.filter(ipo => {
    // 1. Filter listed and Syariah-compliant stocks
    const isMatch = ipo.shariah === true && 
        (ipo.stage === 5 || ipo.status === 'Listed') &&
        ipo.currentPrice > 0 &&
        ipo.currentPrice < 3.00;
    
    if (!isMatch) return false;

    const highPrice = ipo.highPrice || 0;
    if (highPrice === 0) return false;

    // Check if hitting ATH (or within 0.5 sen) or near breakout (within 5% of ATH)
    const isAth = ipo.currentPrice >= (highPrice - 0.005);
    const isNearAth = ipo.currentPrice >= (highPrice * 0.95);

    return isAth || isNearAth;
}).map(ipo => {
    const highPrice = ipo.highPrice || 0;
    const isAth = ipo.currentPrice >= (highPrice - 0.005);
    const ipoPrice = ipo.price || 0;
    const perfVal = ((ipo.currentPrice - ipoPrice) / ipoPrice) * 100;

    return {
        id: ipo.id,
        symbol: ipo.symbol || 'N/A',
        company: ipo.companyName,
        currentPrice: ipo.currentPrice,
        highPrice: highPrice,
        perf: perfVal.toFixed(1) + '%',
        status: isAth ? '🔥 BREAKOUT' : '📈 NEAR ATH',
        year: ipo.year,
        grade: ipo.predictedGrade || 'N/A'
    };
});

console.table(results);
