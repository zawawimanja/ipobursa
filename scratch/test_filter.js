const IPO_DATA = require('../data.js');

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'ogx'
];
const explicitSkips = ['adnex', 'mmcs', 'agmo', 'wentel-engineering', 'wentel'];

const list = IPO_DATA;

const validPicks = list.filter(ipo => {
    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolio.includes(idLower) || sifuPortfolio.includes(symbolLower);

    if (ipo.predictedGrade !== 'A' && ipo.predictedGrade !== 'B' && !isSifuPick) return false;

    const isMatch = ipo.shariah === true && 
        (ipo.stage === 5 || ipo.status === 'Listed') &&
        ipo.currentPrice > 0 && 
        ipo.currentPrice >= ipo.price;
    
    if (!isMatch) return false;

    const isRecent = ipo.year >= 2024;
    if (!isRecent && !isSifuPick) return false;

    if (ipo.outlier && !isSifuPick) return false;

    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;

    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.sifuTargetPrice || ipo.avgTP || 0;
    
    const isActualAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);

    if (!isActualAth && highPrice > 0 && Math.abs(targetPrice - highPrice) < 0.005) return false;

    if (targetPrice > 0) {
        const upside = ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100;
        if (upside < 10.0 && !isActualAth) return false;
    } else {
        return false;
    }

    const ipoPrice = ipo.price || 0;
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0) return false;

    const isDowntrend = highPrice ? (ipo.currentPrice <= highPrice * 0.75) : false;
    if (!isSifuPick && isRecent && isDowntrend) return false;

    return true;
}).map(ipo => {
    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0
        ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100
        : null;
        
    const isAthOrNear = highPrice ? (ipo.currentPrice >= highPrice * 0.95) : false;
    const dailyChange = ipo.dailyChange || null;
    const isScalpTrend = isAthOrNear || (dailyChange !== null && dailyChange >= 3.0);
    const strategy = ipo.strategy || (isScalpTrend ? 'Scalp' : 'Swing');

    return {
        id: ipo.id,
        symbol: ipo.symbol,
        currentPrice: ipo.currentPrice,
        highPrice: ipo.highPrice,
        sifuTargetPrice: ipo.sifuTargetPrice,
        upside: upside ? upside.toFixed(1) + '%' : 'N/A',
        strategy: strategy
    };
});

console.log('SWING PICKS:');
validPicks.filter(p => p.strategy.toLowerCase() === 'swing').forEach(p => console.log(p));

console.log('\nSCALP PICKS:');
validPicks.filter(p => p.strategy.toLowerCase() === 'scalp').forEach(p => console.log(p));
