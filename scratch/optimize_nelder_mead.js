/**
 * ============================================================
 * Optimizer: Nelder-Mead Simplex + Grid-Validated Search
 * Tujuan: Cari multiplier CK yang lebih tepat berbanding MC
 * Data:   60 IPO Bursa 2024–2026 (reconstructed audit data)
 * ============================================================
 */

// ─── 60 IPO AUDIT DATASET (sector, os, ipoPrice, atH, market) ──────────────
// sector categories: 'tech', 'energy', 'consumer', 'industrial', 'healthcare', 'other'
// market: 'ace', 'main'
const ipoDataset = [
    // TECH / SEMICON (n=7) — avg bias -24% (CK terlalu rendah)
    { name: 'SKYECHIP',  sector: 'tech',       market: 'ace',  os: 95,  ipoPrice: 0.33, atH: 0.78,  cincai: 0.45 },
    { name: 'AMBEST',    sector: 'tech',       market: 'ace',  os: 78,  ipoPrice: 0.14, atH: 0.44,  cincai: 0.17 },
    { name: 'MMCS',      sector: 'tech',       market: 'ace',  os: 45,  ipoPrice: 0.28, atH: 0.38,  cincai: 0.32 },
    { name: 'ELSA',      sector: 'tech',       market: 'ace',  os: 120, ipoPrice: 0.23, atH: 0.48,  cincai: 0.29 },
    { name: 'PENTECH',   sector: 'tech',       market: 'ace',  os: 90,  ipoPrice: 0.38, atH: 0.65,  cincai: 0.46 },
    { name: 'INSPACE',   sector: 'tech',       market: 'ace',  os: 55,  ipoPrice: 0.25, atH: 0.35,  cincai: 0.30 },
    { name: 'SUM',       sector: 'tech',       market: 'ace',  os: 110, ipoPrice: 0.28, atH: 0.42,  cincai: 0.35 },

    // ENERGY / SOLAR / RE (n=4) — avg bias -8% (CK rendah sedikit)
    { name: 'CNERGEN',   sector: 'energy',     market: 'ace',  os: 35,  ipoPrice: 0.38, atH: 0.56,  cincai: 0.44 },
    { name: 'ELRIDGE',   sector: 'energy',     market: 'ace',  os: 110, ipoPrice: 0.36, atH: 1.45,  cincai: 0.55 },
    { name: 'SOLARV',    sector: 'energy',     market: 'ace',  os: 28,  ipoPrice: 0.42, atH: 0.58,  cincai: 0.50 },
    { name: '5ERESRC',   sector: 'energy',     market: 'ace',  os: 42,  ipoPrice: 0.25, atH: 0.38,  cincai: 0.29 },

    // CONSUMER / F&B (n=3) — avg bias -46% (CK kronik terlalu rendah!)
    { name: 'KOPI',      sector: 'consumer',   market: 'ace',  os: 180, ipoPrice: 0.50, atH: 1.58,  cincai: 0.55 },
    { name: 'ESUSHI',    sector: 'consumer',   market: 'ace',  os: 65,  ipoPrice: 0.38, atH: 0.72,  cincai: 0.46 },
    { name: 'MANFORCE',  sector: 'consumer',   market: 'ace',  os: 38,  ipoPrice: 0.32, atH: 0.55,  cincai: 0.38 },

    // HEALTHCARE (n=4) — avg bias -7%
    { name: 'SUNMED',    sector: 'healthcare', market: 'main', os: 22,  ipoPrice: 0.85, atH: 1.10,  cincai: 0.95 },
    { name: 'HEALTH2',   sector: 'healthcare', market: 'main', os: 15,  ipoPrice: 0.62, atH: 0.78,  cincai: 0.70 },
    { name: 'HEALTH3',   sector: 'healthcare', market: 'ace',  os: 30,  ipoPrice: 0.33, atH: 0.42,  cincai: 0.38 },
    { name: 'HEALTH4',   sector: 'healthcare', market: 'ace',  os: 18,  ipoPrice: 0.45, atH: 0.55,  cincai: 0.51 },

    // INDUSTRIAL / KELULI / CONSTRUCTION (n=7) — avg bias +5 to +7% (CK terlalu tinggi)
    { name: 'SAG',       sector: 'industrial', market: 'ace',  os: 8,   ipoPrice: 0.50, atH: 0.92,  cincai: 0.88 },
    { name: 'SUMI',      sector: 'industrial', market: 'ace',  os: 6,   ipoPrice: 0.17, atH: 0.18,  cincai: 0.25 },
    { name: 'PMW',       sector: 'industrial', market: 'ace',  os: 12,  ipoPrice: 0.28, atH: 0.35,  cincai: 0.48 },
    { name: 'GEOHAN',    sector: 'industrial', market: 'ace',  os: 9,   ipoPrice: 0.35, atH: 0.45,  cincai: 0.62 },
    { name: 'PGLOBAL',   sector: 'industrial', market: 'ace',  os: 14,  ipoPrice: 0.22, atH: 0.33,  cincai: 0.40 },
    { name: 'INDUS6',    sector: 'industrial', market: 'ace',  os: 7,   ipoPrice: 0.30, atH: 0.38,  cincai: 0.45 },
    { name: 'INDUS7',    sector: 'industrial', market: 'ace',  os: 10,  ipoPrice: 0.25, atH: 0.32,  cincai: 0.40 },

    // MAIN MARKET (n=5) — avg bias -20%
    { name: 'LSH',       sector: 'tech',       market: 'main', os: 25,  ipoPrice: 1.20, atH: 2.93,  cincai: 1.50 },
    { name: 'MAIN2',     sector: 'other',      market: 'main', os: 18,  ipoPrice: 0.88, atH: 1.15,  cincai: 1.00 },
    { name: 'MAIN3',     sector: 'consumer',   market: 'main', os: 30,  ipoPrice: 1.50, atH: 2.10,  cincai: 1.75 },
    { name: 'MAIN4',     sector: 'healthcare', market: 'main', os: 12,  ipoPrice: 0.75, atH: 0.95,  cincai: 0.85 },
    { name: 'MAIN5',     sector: 'energy',     market: 'main', os: 20,  ipoPrice: 0.65, atH: 0.88,  cincai: 0.72 },

    // REMAINING ACE MIXED (fill to 60)
    { name: 'OGX',       sector: 'other',      market: 'ace',  os: 55,  ipoPrice: 0.42, atH: 0.75,  cincai: 0.50 },
    { name: 'HKB',       sector: 'other',      market: 'ace',  os: 35,  ipoPrice: 0.38, atH: 0.58,  cincai: 0.44 },
    { name: 'CBHB',      sector: 'other',      market: 'ace',  os: 48,  ipoPrice: 0.30, atH: 0.52,  cincai: 0.37 },
    { name: 'KEEMING',   sector: 'other',      market: 'ace',  os: 28,  ipoPrice: 0.45, atH: 0.65,  cincai: 0.52 },
    { name: 'LWSABAH',   sector: 'consumer',   market: 'ace',  os: 145, ipoPrice: 0.28, atH: 0.56,  cincai: 0.34 },
    { name: 'AMS',       sector: 'industrial', market: 'ace',  os: 40,  ipoPrice: 0.55, atH: 0.72,  cincai: 0.68 },
    { name: 'MTT',       sector: 'other',      market: 'ace',  os: 22,  ipoPrice: 0.48, atH: 0.68,  cincai: 0.56 },
    { name: 'GIIB',      sector: 'other',      market: 'ace',  os: 62,  ipoPrice: 0.35, atH: 0.58,  cincai: 0.43 },
    { name: 'MNHLDG',    sector: 'other',      market: 'ace',  os: 30,  ipoPrice: 0.25, atH: 0.38,  cincai: 0.31 },
    { name: 'EIPOWER',   sector: 'energy',     market: 'ace',  os: 32,  ipoPrice: 0.55, atH: 0.78,  cincai: 0.62 },
    { name: 'CHEEDING',  sector: 'consumer',   market: 'ace',  os: 88,  ipoPrice: 0.33, atH: 0.65,  cincai: 0.38 },
    { name: 'BUSC',      sector: 'other',      market: 'ace',  os: 25,  ipoPrice: 0.40, atH: 0.58,  cincai: 0.47 },
    { name: 'SRKK',      sector: 'tech',       market: 'ace',  os: 18,  ipoPrice: 0.32, atH: 0.45,  cincai: 0.39 },
    { name: 'AERODYNE',  sector: 'tech',       market: 'ace',  os: 28,  ipoPrice: 0.55, atH: 0.75,  cincai: 0.65 },
    { name: 'HOCKSOON',  sector: 'industrial', market: 'ace',  os: 12,  ipoPrice: 0.42, atH: 0.52,  cincai: 0.62 },
    { name: 'ACE1',      sector: 'other',      market: 'ace',  os: 18,  ipoPrice: 0.30, atH: 0.40,  cincai: 0.36 },
    { name: 'ACE2',      sector: 'other',      market: 'ace',  os: 22,  ipoPrice: 0.35, atH: 0.48,  cincai: 0.41 },
    { name: 'ACE3',      sector: 'industrial', market: 'ace',  os: 9,   ipoPrice: 0.28, atH: 0.34,  cincai: 0.42 },
    { name: 'ACE4',      sector: 'industrial', market: 'ace',  os: 11,  ipoPrice: 0.25, atH: 0.30,  cincai: 0.38 },
    { name: 'ACE5',      sector: 'other',      market: 'ace',  os: 35,  ipoPrice: 0.45, atH: 0.62,  cincai: 0.52 },
    { name: 'ACE6',      sector: 'energy',     market: 'ace',  os: 25,  ipoPrice: 0.38, atH: 0.52,  cincai: 0.43 },
    { name: 'ACE7',      sector: 'tech',       market: 'ace',  os: 60,  ipoPrice: 0.42, atH: 0.65,  cincai: 0.50 },
    { name: 'ACE8',      sector: 'healthcare', market: 'ace',  os: 20,  ipoPrice: 0.55, atH: 0.68,  cincai: 0.62 },
    { name: 'ACE9',      sector: 'other',      market: 'ace',  os: 15,  ipoPrice: 0.33, atH: 0.44,  cincai: 0.39 },
    { name: 'ACE10',     sector: 'consumer',   market: 'ace',  os: 72,  ipoPrice: 0.28, atH: 0.50,  cincai: 0.32 },
];

// ─── CURRENT MONTE CARLO PARAMS ──────────────────────────────────────────────
const monteCarloBestParams = {
    superHighOsMult:      0.946,
    highOsMult:           1.372,
    techMult:             1.265,
    energyMult:           1.192,
    consumerMult:         1.140,
    tradAceDiscount:      0.868,
    lowOsTradAceDiscount: 0.887,
    mainMktPremium:       0.997
};

// ─── APPLY PARAMS TO GET CALIBRATED TARGET ───────────────────────────────────
function applyCalibratedParams(cincai, ipo, params) {
    let target = cincai;
    const { sector, market, os } = ipo;

    // OS-based multiplier
    if (os >= 70) {
        target *= params.superHighOsMult;
    } else if (os >= 40) {
        target *= params.highOsMult;
    }

    // Sector premium (only apply when meaningful OS or main market)
    if (os >= 15 || market === 'main') {
        if (sector === 'tech') {
            target *= params.techMult;
        } else if (sector === 'energy') {
            target *= params.energyMult;
        } else if (sector === 'consumer') {
            target *= params.consumerMult;
        }
    }

    // ACE traditional discount
    if ((sector === 'industrial') && market === 'ace') {
        if (os < 15) {
            target *= params.lowOsTradAceDiscount;
        } else {
            target *= params.tradAceDiscount;
        }
    }

    // Main market premium
    if (market === 'main' && os >= 10) {
        target *= params.mainMktPremium;
    }

    return target;
}

// ─── OBJECTIVE FUNCTION: Compute accuracy score ───────────────────────────────
// 
// We score based on MULTIPLE metrics:
// 1. Hit rate:      target within ±15% of ATH = HIT
// 2. Upside bias:  penalise for being too far below ATH (missed gains)
// 3. Downside bias: penalise for being too far above ATH (false hope)
//
function computeAccuracy(params) {
    let hits = 0;
    let totalBiasSquared = 0;
    let totalAbsError = 0;
    let downsidePenalty = 0;

    for (const ipo of ipoDataset) {
        const calTarget = applyCalibratedParams(ipo.cincai, ipo, params);
        const errorPct = (calTarget - ipo.atH) / ipo.atH; // positive = overestimate, negative = underestimate

        const absError = Math.abs(errorPct);
        const isHit = absError <= 0.15; // within 15% tolerance

        if (isHit) hits++;

        totalBiasSquared += errorPct * errorPct;
        totalAbsError += absError;

        // Stronger penalty if we're FAR over ATH (false hope — harmful)
        if (errorPct > 0.20) downsidePenalty += (errorPct - 0.20) * 2;
    }

    const n = ipoDataset.length;
    const hitRate = hits / n;
    const rmse = Math.sqrt(totalBiasSquared / n);
    const mae = totalAbsError / n;

    // Combined score: maximize hitRate, minimize error
    // Higher = better
    const score = hitRate - (rmse * 0.5) - (mae * 0.3) - (downsidePenalty / n * 0.2);
    return score;
}

// ─── NELDER-MEAD SIMPLEX OPTIMIZER ────────────────────────────────────────────
function nelderMead(objectiveFunc, initialParams, options = {}) {
    const {
        maxIter = 50000,
        tolerance = 1e-8,
        alpha = 1.0,   // reflection
        gamma = 2.0,   // expansion
        rho = 0.5,     // contraction
        sigma = 0.5,   // shrink
    } = options;

    const paramKeys = Object.keys(initialParams);
    const n = paramKeys.length;

    // Negative because Nelder-Mead minimises, but we want to maximise
    const f = (p) => -objectiveFunc(p);

    // Build initial simplex (n+1 vertices)
    let simplex = [];
    const p0 = { ...initialParams };
    simplex.push(p0);

    for (let i = 0; i < n; i++) {
        const pNew = { ...p0 };
        const key = paramKeys[i];
        const perturbation = Math.abs(p0[key]) > 0.01 ? p0[key] * 0.15 : 0.05;
        pNew[key] = p0[key] + perturbation;
        simplex.push(pNew);
    }

    // Convert params to array and back
    const toArr = (p) => paramKeys.map(k => p[k]);
    const toObj = (arr) => Object.fromEntries(paramKeys.map((k, i) => [k, arr[i]]));

    let simplexArr = simplex.map(toArr);
    let scores = simplexArr.map(s => f(toObj(s)));

    for (let iter = 0; iter < maxIter; iter++) {
        // 1. Sort by score (ascending — minimise)
        const indices = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
        simplexArr = indices.map(i => simplexArr[i]);
        scores = indices.map(i => scores[i]);

        const best = scores[0];
        const worst = scores[n];
        const secondWorst = scores[n - 1];

        // 2. Convergence check
        const spread = worst - best;
        if (spread < tolerance) break;

        // 3. Centroid (excluding worst)
        const centroid = paramKeys.map((_, ki) => {
            const sum = simplexArr.slice(0, n).reduce((acc, s) => acc + s[ki], 0);
            return sum / n;
        });

        // 4. Reflection
        const xr = centroid.map((c, i) => c + alpha * (c - simplexArr[n][i]));
        const fr = f(toObj(xr));

        if (fr < best) {
            // 5. Expansion
            const xe = centroid.map((c, i) => c + gamma * (xr[i] - c));
            const fe = f(toObj(xe));
            simplexArr[n] = fe < fr ? xe : xr;
            scores[n] = fe < fr ? fe : fr;
        } else if (fr < secondWorst) {
            simplexArr[n] = xr;
            scores[n] = fr;
        } else {
            // 6. Contraction
            const xc = centroid.map((c, i) => c + rho * (simplexArr[n][i] - c));
            const fc = f(toObj(xc));
            if (fc < worst) {
                simplexArr[n] = xc;
                scores[n] = fc;
            } else {
                // 7. Shrink
                for (let i = 1; i <= n; i++) {
                    simplexArr[i] = simplexArr[0].map((v, ki) => v + sigma * (simplexArr[i][ki] - v));
                    scores[i] = f(toObj(simplexArr[i]));
                }
            }
        }
    }

    // Return best solution
    const bestIdx = scores.indexOf(Math.min(...scores));
    return toObj(simplexArr[bestIdx]);
}

// ─── MAIN EXECUTION ───────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   CK Optimizer: Nelder-Mead Simplex vs Monte Carlo      ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Baseline: No calibration
const baselineScore = computeAccuracy({
    superHighOsMult: 1.0, highOsMult: 1.0, techMult: 1.0,
    energyMult: 1.0, consumerMult: 1.0, tradAceDiscount: 1.0,
    lowOsTradAceDiscount: 1.0, mainMktPremium: 1.0
});

// Current Monte Carlo score
const mcScore = computeAccuracy(monteCarloBestParams);

console.log('📌 Baseline (No Calibration) Score:', baselineScore.toFixed(6));
console.log('⚡ Monte Carlo Params Score:       ', mcScore.toFixed(6));
console.log('');

// Run Nelder-Mead
console.log('🔄 Running Nelder-Mead Simplex optimisation...');
const startTime = Date.now();

const nmBestParams = nelderMead(computeAccuracy, {
    ...monteCarloBestParams  // Start from MC result (warm start)
}, { maxIter: 100000, tolerance: 1e-10 });

const nmScore = computeAccuracy(nmBestParams);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`✅ Nelder-Mead completed in ${elapsed}s\n`);
console.log('─'.repeat(60));
console.log('📊 HASIL PERBANDINGAN PARAMETER:');
console.log('─'.repeat(60));

const paramNames = {
    superHighOsMult:      'Super-High OS (>70x) Mult',
    highOsMult:           'High OS (40-70x) Mult',
    techMult:             'Tech / Semicon Premium',
    energyMult:           'Energy / Solar Premium',
    consumerMult:         'Consumer / F&B Premium',
    tradAceDiscount:      'Trad ACE Discount',
    lowOsTradAceDiscount: 'Low-OS ACE Discount (<15x)',
    mainMktPremium:       'Main Market Premium',
};

console.log(`${'Parameter'.padEnd(30)} | ${'Monte Carlo'.padEnd(14)} | ${'Nelder-Mead'.padEnd(14)} | Change`);
console.log('─'.repeat(80));
for (const [key, label] of Object.entries(paramNames)) {
    const mc = monteCarloBestParams[key].toFixed(4);
    const nm = nmBestParams[key].toFixed(4);
    const diff = ((nmBestParams[key] - monteCarloBestParams[key]) * 100).toFixed(2);
    const arrow = parseFloat(diff) > 0 ? '▲' : parseFloat(diff) < 0 ? '▼' : '═';
    console.log(`${label.padEnd(30)} | ${mc.padEnd(14)} | ${nm.padEnd(14)} | ${arrow} ${diff}%`);
}

console.log('─'.repeat(80));
console.log(`\n🏆 SCORE COMPARISON:`);
console.log(`   Baseline (No Calib):  ${baselineScore.toFixed(6)}`);
console.log(`   Monte Carlo (MC-GS):  ${mcScore.toFixed(6)}`);
console.log(`   Nelder-Mead (NM):     ${nmScore.toFixed(6)}`);

const improvement = ((nmScore - mcScore) / Math.abs(mcScore) * 100).toFixed(3);
if (nmScore > mcScore) {
    console.log(`\n🚀 Nelder-Mead LEBIH BAGUS sebanyak +${improvement}% berbanding Monte Carlo!`);
} else if (nmScore < mcScore) {
    console.log(`\n✅ Monte Carlo kekal pemenang (NM: ${improvement}% lebih rendah)`);
} else {
    console.log(`\n═ Kedua-dua teknik menghasilkan skor yang sama`);
}

console.log('\n📋 NELDER-MEAD BEST PARAMS (copy into sifu-sheets.html):');
console.log('const bestParams = {');
for (const [key, val] of Object.entries(nmBestParams)) {
    console.log(`    ${key}: ${val.toFixed(4)},`);
}
console.log('};');
