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

    // Only Grade A, B or Sifu Picks
    if (ipo.predictedGrade !== 'A' && ipo.predictedGrade !== 'B' && !isSifuPick) return false;

    // Filter listed and Syariah-compliant stocks
    const isMatch = ipo.shariah === true && 
        (ipo.stage === 5 || ipo.status === 'Listed') &&
        ipo.currentPrice > 0;
    
    if (!isMatch) return false;

    // Exclude explicit skips
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;

    // Must be under RM 3.00
    if (ipo.currentPrice >= 3.00) return false;

    const highPrice = ipo.highPrice || 0;
    
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
