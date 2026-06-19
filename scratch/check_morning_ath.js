const fs = require('fs');
const path = require('path');

// Load database
const DATA_FILE = path.join(__dirname, '..', 'data.json');
if (!fs.existsSync(DATA_FILE)) {
    console.error('Error: data.json not found!');
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'ogx'
];

const explicitSkips = ['adnex', 'mmcs', 'agmo', 'wentel-engineering', 'wentel'];

console.log('========================================================================');
console.log('🔍 SCANNING IPO STOCKS FOR ATH / 52W BREAKOUTS (PRICE < RM 3.00)');
console.log('========================================================================');

const results = db.filter(ipo => {
    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolio.includes(idLower) || sifuPortfolio.includes(symbolLower);

    // 1. Only Grade A, B or Sifu Picks
    if (ipo.predictedGrade !== 'A' && ipo.predictedGrade !== 'B' && !isSifuPick) return false;

    // 2. Filter listed and Syariah-compliant stocks
    const isMatch = ipo.shariah === true && 
        (ipo.stage === 5 || ipo.status === 'Listed') &&
        ipo.currentPrice > 0;
    
    if (!isMatch) return false;

    // 3. Age & Trend Filter: Only show recent IPOs (listed within 365 days) unless explicitly handpicked by Sifu OR currently near ATH (within 5%)
    let isRecent = false;
    const highPriceVal = ipo.highPrice || 0;
    const isNearAthCheck = highPriceVal ? (ipo.currentPrice >= highPriceVal * 0.95) : false;
    
    if (ipo.listingDate) {
        const listDate = new Date(ipo.listingDate);
        const ageInDays = (new Date() - listDate) / (1000 * 60 * 60 * 24);
        isRecent = ageInDays <= 365;
    } else {
        isRecent = ipo.year >= 2024;
    }
    if (!isRecent && !isSifuPick && !isNearAthCheck) return false;

    // 4. Exclude outlier stocks unless they are explicitly handpicked in Sifu's Portfolio
    if (ipo.outlier && !isSifuPick) return false;

    // 5. Exclude explicit skips
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;

    // 6. Must be under RM 3.00
    if (ipo.currentPrice >= 3.00) return false;

    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.sifuTargetPrice || ipo.avgTP || 0;
    const isActualAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);

    // 7. Anti-Fake TP Placeholder Filter (unless in active breakout)
    if (!isActualAth && highPrice > 0 && Math.abs(targetPrice - highPrice) < 0.005) return false;

    // 8. Anti-Stagnant (Sikat/Dead) Rule:
    const ipoPrice = ipo.price || 0;
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0) return false;

    // 9. Downtrend Safety Check
    const isDowntrend = highPrice ? (ipo.currentPrice <= highPrice * 0.75) : false;
    if (isDowntrend) return false;

    // Check if hitting ATH (or within 0.5 sen) or near breakout (within 5% of ATH)
    const isAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);
    const isNearAth = highPrice > 0 && ipo.currentPrice >= (highPrice * 0.95);

    return isAth || isNearAth;
}).map(ipo => {
    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0
        ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100
        : null;

    const isAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);

    return {
        symbol: ipo.symbol || ipo.id.toUpperCase(),
        companyName: ipo.companyName,
        currentPrice: `RM ${ipo.currentPrice.toFixed(3)}`,
        highPrice: `RM ${highPrice.toFixed(3)}`,
        targetPrice: targetPrice > 0 ? `RM ${targetPrice.toFixed(2)}` : 'N/A',
        upside: upside ? `${upside.toFixed(1)}%` : 'N/A',
        status: isAth ? '🔥 BREAKOUT ATH' : '📈 NEAR ATH (Consolidation)',
        grade: `Gred ${ipo.predictedGrade || 'N/A'}`
    };
});

if (results.length === 0) {
    console.log('❌ Tiada kaunter yang memenuhi kriteria (ATH/Near ATH bawah RM 3.00) pada masa ini.');
} else {
    console.table(results);
}
console.log('========================================================================\n');
