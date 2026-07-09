const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const ipos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const srkk = ipos.find(ipo => ipo.id === 'srkk-ai');

if (!srkk) {
    console.error('SRKK AI Berhad not found in data.json');
    process.exit(1);
}

// V6 Engine Calibration Parameters
const v6p = [-0.062118, -0.094923, 0.757103, 0.923936, 0.955618, 1.091094, 0.836895, 1.052850, 1.061522, 0.074801, 1.219244, 0.125707, -0.747504, -0.000803];

// Calculate IB quality score
const data = ipos;
const ibPerf = {};
const ibCalc = {};
data.filter(d => d.stage >= 5 && d.price > 0 && d.highPrice > 0).forEach(d => {
    const ib = (d.ib || 'unknown').toLowerCase().trim();
    if (!ibCalc[ib]) ibCalc[ib] = { wins: 0, total: 0, avgRet: 0 };
    ibCalc[ib].total++;
    ibCalc[ib].avgRet += (d.highPrice - d.price) / d.price;
    if (d.highPrice >= d.price * 1.1) ibCalc[ib].wins++;
});
Object.keys(ibCalc).forEach(ib => {
    const s = ibCalc[ib];
    s.avgRet /= s.total;
    ibPerf[ib] = Math.min(1, Math.max(0, (s.wins / s.total) * 0.6 + Math.min(s.avgRet, 1) * 0.4));
});
function getIbScore(ibName) {
    const ib = (ibName || 'unknown').toLowerCase().trim();
    if (ibPerf[ib] !== undefined) return ibPerf[ib];
    for (const key of Object.keys(ibPerf)) {
        if (ib.includes(key) || key.includes(ib)) return ibPerf[key];
    }
    return 0.3;
}

function getSectorGroupV6(sector) {
    const s = sector.toLowerCase();
    if (s.includes('tech') || s.includes('semiconductor') || s.includes('software') || s.includes('hardware') || s.includes('ai')) return 'tech';
    if (s.includes('consumer') || s.includes('food') || s.includes('beverage') || s.includes('retail')) return 'consumer';
    if (s.includes('energy') || s.includes('solar') || s.includes('renewable') || s.includes('utilities')) return 'energy';
    if (s.includes('health') || s.includes('medical') || s.includes('pharma') || s.includes('care')) return 'health';
    if (s.includes('construction') || s.includes('property') || s.includes('infrastructure')) return 'construction';
    if (s.includes('industrial') || s.includes('manufacturing') || s.includes('metal') || s.includes('shipping') || s.includes('logistic')) return 'industrial';
    return 'other';
}

function getCalibratedTarget(cincaiVal, sector, market, os, price, geography, ofs, anchorInvestors, freeFloat, lockupMonths, promoterQuality, ibName) {
    let target = cincaiVal;
    const sg = getSectorGroupV6(sector);
    
    // 1. Continuous OS response (logarithmic + quadratic)
    const logOs = Math.log1p(os);
    target *= (1 + v6p[0] * logOs / 5);
    target *= (1 + v6p[1] * logOs * logOs / 25);
    
    // 2. Sector multipliers
    if (sg === 'tech')         target *= v6p[2];
    if (sg === 'consumer')     target *= v6p[3];
    if (sg === 'energy')       target *= v6p[4];
    if (sg === 'health')       target *= v6p[5];
    if (sg === 'industrial')   target *= v6p[6];
    if (sg === 'construction') target *= v6p[7];
    
    // 3. Main market premium
    if (market.includes('main')) target *= v6p[8];
    
    // 4. IB Quality Score
    const ibScore = getIbScore(ibName);
    target *= (1 + v6p[9] * (ibScore - 0.3));
    
    // 5. OFS multiplier
    if (ofs === true) target *= v6p[10];
    
    // 6. Gaussian price sweet spot
    const priceNorm = (price - 0.30) / 0.50;
    target *= (1 + v6p[11] * Math.exp(-priceNorm * priceNorm));
    
    // 7. Free float deviation from ideal 22%
    const ffDev = (freeFloat || 0.25) - 0.22;
    target *= (1 + v6p[12] * ffDev);
    
    // 8. Combined quality signal
    let qualScore = 0;
    if (anchorInvestors === true) qualScore += 0.3;
    if (promoterQuality === 'conglomerate_spinoff') qualScore += 0.2;
    else if (promoterQuality === 'first_timer') qualScore -= 0.2;
    if ((lockupMonths || 12) >= 12) qualScore += 0.1;
    else qualScore -= 0.1;
    target *= (1 + v6p[13] * qualScore);
    
    return target;
}

const cincaiVal = srkk.sifuTargetPrice; // 0.66 (Sifu Valuation 1)
const os = srkk.os; // 312.3
const actualOpen = 0.60;
const actualClose = 0.61;
const actualHigh = 0.615;

const calibratedVal = getCalibratedTarget(
    cincaiVal,
    srkk.sector,
    srkk.market,
    os,
    srkk.price,
    srkk.geography,
    srkk.ofs,
    srkk.anchorInvestors,
    srkk.freeFloat,
    srkk.lockupMonths,
    srkk.promoterQuality,
    srkk.ib
);

console.log('═════════════════════════════════════════════════════════');
console.log('  SRKK AI — PREDICTION VS ACTUAL PERFORMANCE EVALUATION');
console.log('═════════════════════════════════════════════════════════');
console.log(`  IPO Price:            RM ${srkk.price.toFixed(2)}`);
console.log(`  Oversubscription:     ${os}x`);
console.log('');
console.log('  ─── ACTUAL LISTING PERFORMANCE (9 JULY 2026) ───');
console.log(`  Actual Open Price:    RM ${actualOpen.toFixed(3)}  (+${((actualOpen/srkk.price-1)*100).toFixed(1)}%)`);
console.log(`  Actual High Price:    RM ${actualHigh.toFixed(3)}  (+${((actualHigh/srkk.price-1)*100).toFixed(1)}%)`);
console.log(`  Actual Close Price:   RM ${actualClose.toFixed(3)}  (+${((actualClose/srkk.price-1)*100).toFixed(1)}%)`);
console.log('');
console.log('  ─── MODEL TARGETS ───');
console.log(`  Sifu target (Bull):   RM ${srkk.sifuTargetPrice.toFixed(3)}  (+${((srkk.sifuTargetPrice/srkk.price-1)*100).toFixed(1)}%)`);
console.log(`  V6 Calibrated (Safe): RM ${calibratedVal.toFixed(3)}  (+${((calibratedVal/srkk.price-1)*100).toFixed(1)}%)`);
console.log(`  V3 Target (Old):      RM ${srkk.v3TargetPrice.toFixed(3)}  (+${((srkk.v3TargetPrice/srkk.price-1)*100).toFixed(1)}%)`);
console.log('');
console.log('  ─── ACCURACY METRICS ───');
console.log(`  Sifu Bull vs Actual High:  ${(100 - Math.abs(srkk.sifuTargetPrice - actualHigh)/actualHigh*100).toFixed(2)}% accuracy`);
console.log(`  V6 Calibrated vs Actual Open: ${(100 - Math.abs(calibratedVal - actualOpen)/actualOpen*100).toFixed(2)}% accuracy`);
console.log(`  V6 Calibrated vs Actual Close: ${(100 - Math.abs(calibratedVal - actualClose)/actualClose*100).toFixed(2)}% accuracy`);
console.log('═════════════════════════════════════════════════════════');
