const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));

console.log('========================================================================');
console.log('🔍 FULL DIAGNOSTIC ANALYSIS OF ALL ACTIVE CHART SETUPS');
console.log('========================================================================');

const setups = {
    athBreakout: [],
    rbsRetest: [],
    deepPullbackRebound: [],
    healthyDipSwing: [],
    underwaterTurnaround: []
};

data.forEach(ipo => {
    if (ipo.stage !== 5 && ipo.status !== 'Listed') return;
    if (!ipo.shariah) return;

    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    
    const curPrice = ipo.currentPrice || 0;
    const highPrice = ipo.highPrice || 0;
    const ipoPrice = ipo.price || 0;
    const dailyChange = ipo.dailyChange || 0;
    const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    
    if (curPrice <= 0 || highPrice <= 0) return;
    if (curPrice > 3.00 && idLower !== 'solarvest') return; // Filter out high priced except solarvest

    const distToAth = ((highPrice - curPrice) / curPrice) * 100;
    const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
    
    const isUnderIpo = curPrice < ipoPrice;

    // Check setups
    if (distToAth <= 1.0) {
        setups.athBreakout.push({ ipo, distToAth, upside });
    } else if (distToAth <= 5.0) {
        setups.rbsRetest.push({ ipo, distToAth, upside });
    } else if (distToAth > 5.0 && dailyChange >= 10.0) {
        setups.deepPullbackRebound.push({ ipo, distToAth, upside, dailyChange });
    } else if (curPrice >= highPrice * 0.75 && !isUnderIpo && upside >= 10.0) {
        setups.healthyDipSwing.push({ ipo, distToAth, upside });
    } else if (isUnderIpo && dailyChange >= 5.0) {
        setups.underwaterTurnaround.push({ ipo, distToAth, upside, dailyChange });
    }
});

console.log(`\n🚀 SETUP 1: ATH BREAKOUT (Within 1% of ATH) - Count: ${setups.athBreakout.length}`);
setups.athBreakout.forEach(x => {
    console.log(`  • ${x.ipo.symbol || x.ipo.id.toUpperCase()} (RM ${x.ipo.currentPrice.toFixed(3)}): ATH RM ${x.ipo.highPrice.toFixed(3)} | Dist: ${x.distToAth.toFixed(2)}% | Calibrated TP: RM ${x.ipo.calibratedSifuTargetPrice || 'N/A'}`);
});

console.log(`\n🔥 SETUP 2: RBS RETEST / CONSOLIDATION (1% to 5% from ATH) - Count: ${setups.rbsRetest.length}`);
setups.rbsRetest.forEach(x => {
    console.log(`  • ${x.ipo.symbol || x.ipo.id.toUpperCase()} (RM ${x.ipo.currentPrice.toFixed(3)}): ATH RM ${x.ipo.highPrice.toFixed(3)} | Dist: ${x.distToAth.toFixed(2)}% | Daily Change: ${x.ipo.dailyChange}%`);
});

console.log(`\n⚡ SETUP 3: DEEP PULLBACK REBOUND (>5% from ATH + Daily Change >= 10%) - Count: ${setups.deepPullbackRebound.length}`);
setups.deepPullbackRebound.forEach(x => {
    console.log(`  • ${x.ipo.symbol || x.ipo.id.toUpperCase()} (RM ${x.ipo.currentPrice.toFixed(3)}): ATH RM ${x.ipo.highPrice.toFixed(3)} | Dist: ${x.distToAth.toFixed(2)}% | Rebound: +${x.dailyChange}%`);
});

console.log(`\n📈 SETUP 4: HEALTHY DIP SWING (Down 5% to 25% from ATH, Above IPO, Upside >= 10%) - Count: ${setups.healthyDipSwing.length}`);
setups.healthyDipSwing.forEach(x => {
    console.log(`  • ${x.ipo.symbol || x.ipo.id.toUpperCase()} (RM ${x.ipo.currentPrice.toFixed(3)}): IPO RM ${x.ipo.price.toFixed(3)} | ATH RM ${x.ipo.highPrice.toFixed(3)} | Upside: ${x.upside.toFixed(1)}%`);
});

console.log(`\n🔄 SETUP 5: UNDERWATER TURNAROUND (Below IPO + Daily Change >= 5%) - Count: ${setups.underwaterTurnaround.length}`);
setups.underwaterTurnaround.forEach(x => {
    console.log(`  • ${x.ipo.symbol || x.ipo.id.toUpperCase()} (RM ${x.ipo.currentPrice.toFixed(3)}): IPO RM ${x.ipo.price.toFixed(3)} | Rebound: +${x.dailyChange}%`);
});
