const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const gbbond = data.find(ipo => ipo.id === 'gb-bond-holdings-berhad');

if (!gbbond) {
    console.error('GB Bond not found!');
    process.exit(1);
}

// V6 Engine Calibration Parameters
const v6p = [-0.062118, -0.094923, 0.757103, 0.923936, 0.955618, 1.091094, 0.836895, 1.052850, 1.061522, 0.074801, 1.219244, 0.125707, -0.747504, -0.000803];

// Mock IB score calculation matching calc_sifu_targets.js
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

console.log('--- GB BOND V6 TARGET SIMULATION ---');
console.log('Base Sifu TP:', gbbond.sifuTargetPrice);
console.log('IPO Price:', gbbond.price);
console.log('Sector Group:', getSectorGroupV6(gbbond.sector));
console.log('IB:', gbbond.ib);
console.log('Geography:', gbbond.geography);
console.log('');

const osLevels = [0, 5, 10, 20, 50, 100, 200];
osLevels.forEach(os => {
    let rawTarget = getCalibratedTarget(
        gbbond.sifuTargetPrice, // 0.30
        gbbond.sector,
        gbbond.market,
        os,
        gbbond.price,
        gbbond.geography,
        true, // OFS is true
        false, // anchor
        0.25, // freeFloat
        12, // lockup
        'experienced_founder', // promoter
        'Malacca Securities' // IB
    );
    
    let cappedTarget = rawTarget;
    // Apply MITI 50% target price cap (for Stage 2 IPOs)
    let isCapped = false;
    if (cappedTarget > gbbond.price * 1.5) {
        cappedTarget = gbbond.price * 1.5;
        isCapped = true;
    }

    const returnPct = ((cappedTarget - gbbond.price) / gbbond.price) * 100;
    console.log(`OS: ${os.toString().padEnd(3)}x | Raw V6: RM ${rawTarget.toFixed(3)} | Calibrated V6: RM ${cappedTarget.toFixed(2)} (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%)${isCapped ? ' [MITI 50% Capped]' : ''}`);
});
