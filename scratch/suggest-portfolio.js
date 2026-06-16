const fs = require('fs');

const raw = fs.readFileSync('data.json', 'utf8');
const ipos = JSON.parse(raw);

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar'
];

console.log('=== Portfolio Allocation Analyzer ===');

// 1. Swing / Hold candidates (Grade A/B, currentPrice <= sifuTargetPrice, shariah: true)
const swingHold = ipos.filter(ipo => 
    ipo.shariah === true &&
    (ipo.predictedGrade === 'A' || ipo.predictedGrade === 'B') &&
    ipo.currentPrice > 0 &&
    ipo.sifuTargetPrice > 0 &&
    ipo.currentPrice <= ipo.sifuTargetPrice
);

// 2. Intraday / Scalp / Breakout candidates (Grade A/B, high dailyChange, shariah: true)
const intradayBreakout = ipos.filter(ipo =>
    ipo.shariah === true &&
    (ipo.predictedGrade === 'A' || ipo.predictedGrade === 'B') &&
    ipo.currentPrice > 0 &&
    typeof ipo.dailyChange === 'number' &&
    ipo.dailyChange >= 3.0 // Strong daily momentum
);

// 3. Pentech Specific Pullback Level
const pentech = ipos.find(ipo => ipo.id === 'pentech');

console.log(`\n--- CDS ACCOUNT 1: SWING / HOLD (RM 5,000 Capital) ---`);
console.log('Strategy: Buy near/below Sifu Target Price and hold for major upside.');
swingHold.slice(0, 8).forEach(ipo => {
    const upside = ((ipo.sifuTargetPrice - ipo.currentPrice) / ipo.currentPrice * 100).toFixed(1);
    console.log(`- ${ipo.companyName} (${ipo.symbol || ipo.id.toUpperCase()}): Current: RM ${ipo.currentPrice.toFixed(3)} | Target: RM ${ipo.sifuTargetPrice.toFixed(2)} | Upside: +${upside}% | Grade: ${ipo.predictedGrade}`);
});

console.log(`\n--- CDS ACCOUNT 2: INTRADAY / SCALP (RM 5,000 Capital) ---`);
console.log('Strategy: Fast entry on daily momentum breakout (>3% gain) and exit quick.');
intradayBreakout.slice(0, 8).forEach(ipo => {
    console.log(`- ${ipo.companyName} (${ipo.symbol || ipo.id.toUpperCase()}): Current: RM ${ipo.currentPrice.toFixed(3)} | Daily Gain: +${ipo.dailyChange.toFixed(1)}% | Grade: ${ipo.predictedGrade}`);
});

if (pentech) {
    console.log(`\n--- PENTECH ANALYTICS ---`);
    console.log(`Current Price: RM ${pentech.currentPrice.toFixed(3)}`);
    console.log(`Sifu Target Price (TP): RM ${pentech.sifuTargetPrice.toFixed(2)}`);
    const isAboveTP = pentech.currentPrice > pentech.sifuTargetPrice;
    console.log(`Status: ${isAboveTP ? 'Dah hit/melepasi TP Sifu' : 'Bawah TP Sifu'}`);
    
    // Pullback level is usually at the previous support (the IPO price or the listing day open/close)
    const pullbackSupport1 = pentech.sifuTargetPrice; // Target price acts as support once broken
    const pullbackSupport2 = pentech.openPrice || 0.29; // Listing day open
    console.log(`Zon Pullback Disyorkan:`);
    console.log(`  - Entri Selamat (Key Support): RM ${pullbackSupport2.toFixed(3)} (Listing Day Open)`);
    console.log(`  - Entri Agresif (Broken Resistance): RM ${pullbackSupport1.toFixed(3)}`);
}
