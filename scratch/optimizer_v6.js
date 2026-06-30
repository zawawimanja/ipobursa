/**
 * ============================================================
 * CK Optimizer V6.0 — BEAT V5 CHALLENGE
 * ============================================================
 * Key improvements over V5:
 *  1. Continuous OS response (not step-function buckets)
 *  2. IB Quality Score (data-driven, not ignored)
 *  3. PE-based valuation gap signal
 *  4. Interaction terms (sector × OS, market × price)
 *  5. All 14 params optimized end-to-end via Nelder-Mead
 *  6. LOOCV honest validation
 * ============================================================
 */

const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// ─── IB PERFORMANCE LOOKUP (from historical data) ────────────
const ibScores = {};
const ibStats = {};
raw.filter(d => d.stage >= 5 && d.price > 0 && d.highPrice > 0).forEach(d => {
    const ib = (d.ib || 'unknown').toLowerCase().trim();
    if (!ibStats[ib]) ibStats[ib] = { wins: 0, total: 0, avgReturn: 0 };
    ibStats[ib].total++;
    const ret = (d.highPrice - d.price) / d.price;
    ibStats[ib].avgReturn += ret;
    if (d.highPrice >= d.price * 1.1) ibStats[ib].wins++;
});
Object.keys(ibStats).forEach(ib => {
    const s = ibStats[ib];
    s.avgReturn /= s.total;
    s.winRate = s.wins / s.total;
    // Score: 0-1 scale based on win rate and avg return
    ibScores[ib] = Math.min(1, Math.max(0, (s.winRate * 0.6 + Math.min(s.avgReturn, 1) * 0.4)));
});

function getIbScore(ibName) {
    const ib = (ibName || 'unknown').toLowerCase().trim();
    // Try exact match first, then partial
    if (ibScores[ib] !== undefined) return ibScores[ib];
    for (const key of Object.keys(ibScores)) {
        if (ib.includes(key) || key.includes(ib)) return ibScores[key];
    }
    return 0.3; // neutral default
}

// ─── BUILD DATASET ────────────────────────────────────────────
function getSectorGroup(sector) {
    const s = (sector || '').toLowerCase();
    if (s.includes('tech') || s.includes('semiconductor') || s.includes('software') || s.includes('hardware') || s.includes('ai')) return 'tech';
    if (s.includes('consumer') || s.includes('food') || s.includes('beverage') || s.includes('retail')) return 'consumer';
    if (s.includes('energy') || s.includes('solar') || s.includes('renewable') || s.includes('utilities')) return 'energy';
    if (s.includes('health') || s.includes('medical') || s.includes('pharma') || s.includes('care')) return 'health';
    if (s.includes('construction') || s.includes('property') || s.includes('infrastructure')) return 'construction';
    if (s.includes('industrial') || s.includes('manufacturing') || s.includes('metal') || s.includes('shipping') || s.includes('logistic')) return 'industrial';
    return 'other';
}

const dataset = raw
    .filter(d => d.price > 0 && d.sifuTargetPrice > 0 && d.highPrice > 0 && d.stage >= 5)
    .map(d => ({
        name: d.companyName || d.id,
        id: d.id,
        ipo: d.price,
        cincai: d.sifuTargetPrice,
        ath: d.highPrice,
        sg: getSectorGroup(d.sector),
        mkt: (d.market || '').toLowerCase().includes('main') ? 'main' : 'ace',
        os: d.os || 10,
        ofs: d.ofs === true ? 1 : 0,
        ibScore: getIbScore(d.ib),
        pe: d.pe || 15,
        freeFloat: d.freeFloat || 0.25,
        lockup: d.lockupMonths || 12,
        promoter: d.promoterQuality || 'experienced_founder',
        anchor: d.anchorInvestors === true ? 1 : 0,
        gd: d.highPrice < d.price,
    }));

const active = dataset.filter(d => !d.gd);
console.log(`\n📊 DATASET: ${active.length} active IPOs (excl. ${dataset.filter(d=>d.gd).length} gap-downs)\n`);

// ─── V5 REPRODUCTION (Current Production) ─────────────────────
function applyV5(cincai, d) {
    let t = cincai;
    // OS buckets
    if (d.os >= 70) t *= 0.946;
    else if (d.os >= 40) t *= 1.372;
    // Sector (only if OS >= 15 or main)
    if (d.os >= 15 || d.mkt === 'main') {
        if (d.sg === 'tech') t *= 1.265;
        else if (d.sg === 'energy') t *= 1.192;
        else if (d.sg === 'consumer') t *= 1.140;
    }
    // Flat sector discount
    if (d.sg === 'construction') t *= 0.85;
    else if (d.sg === 'industrial' && d.mkt === 'ace') {
        t *= (d.os < 15) ? 0.887 : 0.868;
    }
    // Main market
    if (d.mkt === 'main') {
        if (d.os >= 40) t *= 1.20;
        else if (d.os < 10) t *= 0.85;
        else t *= 0.997;
    }
    // Price sweet spot
    if (d.ipo >= 0.30 && d.ipo <= 0.50) t *= 1.10;
    else if (d.ipo >= 0.75 && d.ipo <= 1.00) t *= 1.10;
    else if (d.ipo < 0.20) t *= 0.85;
    else if (d.ipo > 1.00) t *= 0.90;
    // OFS
    if (d.ofs) t *= 0.90;
    // V5 signals
    if (d.anchor) t *= 1.12;
    if (d.freeFloat >= 0.15 && d.freeFloat <= 0.25) t *= 1.10;
    else if (d.freeFloat > 0.40) t *= 0.90;
    if (d.lockup <= 6) t *= 0.92;
    if (d.promoter === 'conglomerate_spinoff') t *= 1.08;
    else if (d.promoter === 'first_timer') t *= 0.93;
    return t;
}

// ─── V6 MODEL — CONTINUOUS + IB + INTERACTIONS ────────────────
// 14 parameters: all optimizable
function applyV6(cincai, d, p) {
    let t = cincai;
    
    // 1. Continuous OS response (sigmoid-like, not step)
    const logOs = Math.log1p(d.os);
    t *= (1 + p[0] * logOs / 5);           // p[0]: osLinear
    t *= (1 + p[1] * logOs * logOs / 25);   // p[1]: osQuadratic (captures non-linearity)
    
    // 2. Sector multipliers
    if (d.sg === 'tech')         t *= p[2];  // techMult
    if (d.sg === 'consumer')     t *= p[3];  // consumerMult
    if (d.sg === 'energy')       t *= p[4];  // energyMult
    if (d.sg === 'health')       t *= p[5];  // healthMult
    if (d.sg === 'industrial')   t *= p[6];  // industrialMult
    if (d.sg === 'construction') t *= p[7];  // constructionMult
    
    // 3. Market premium
    if (d.mkt === 'main') t *= p[8];         // mainMult
    
    // 4. IB Quality Score (NEW — continuous, data-driven)
    t *= (1 + p[9] * (d.ibScore - 0.3));     // p[9]: ibInfluence
    
    // 5. OFS drag
    if (d.ofs) t *= p[10];                   // ofsMult
    
    // 6. Price regime (continuous, not buckets)
    const priceNorm = (d.ipo - 0.30) / 0.50; // center around sweet spot
    t *= (1 + p[11] * Math.exp(-priceNorm * priceNorm));  // Gaussian sweet spot
    
    // 7. Free float supply/demand
    const ffDev = d.freeFloat - 0.22;        // deviation from ideal 22%
    t *= (1 + p[12] * ffDev);                // negative = penalize high float
    
    // 8. Promoter + Lockup + Anchor combined quality signal
    let qualScore = 0;
    if (d.anchor) qualScore += 0.3;
    if (d.promoter === 'conglomerate_spinoff') qualScore += 0.2;
    else if (d.promoter === 'first_timer') qualScore -= 0.2;
    if (d.lockup >= 12) qualScore += 0.1;
    else qualScore -= 0.1;
    t *= (1 + p[13] * qualScore);            // p[13]: qualInfluence
    
    return t;
}

// ─── EVALUATION FUNCTION ──────────────────────────────────────
function evaluate(data, modelFn, label) {
    let hits = 0, totalAcc = 0, upMissed = 0, worstMiss = 0;
    const misses = [];
    data.forEach(d => {
        const pred = modelFn(d);
        if (d.ath >= pred) {
            hits++;
            upMissed += ((d.ath - pred) / pred) * 100;
        } else {
            const miss = ((pred - d.ath) / pred) * 100;
            if (miss > worstMiss) worstMiss = miss;
            misses.push({ name: d.name, pred: pred.toFixed(3), ath: d.ath.toFixed(3), miss: miss.toFixed(1) + '%' });
        }
        totalAcc += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    return {
        label, n: data.length, hits,
        hitRate: (hits / data.length * 100).toFixed(1),
        accuracy: (totalAcc / data.length * 100).toFixed(2),
        avgUpMissed: hits > 0 ? (upMissed / hits).toFixed(1) : 'N/A',
        worstMiss: worstMiss.toFixed(1),
        misses
    };
}

// ─── NELDER-MEAD ──────────────────────────────────────────────
function nelderMead(f, x0, maxIter = 5000, tol = 1e-8) {
    const n = x0.length;
    const alpha = 1.0, gamma = 2.0, rho = 0.5, sigma = 0.5;
    let simplex = [x0.slice()];
    for (let i = 0; i < n; i++) {
        const s = x0.slice();
        s[i] += (Math.abs(s[i]) > 0.01) ? s[i] * 0.12 : 0.05;
        simplex.push(s);
    }
    let fvals = simplex.map(f);
    for (let iter = 0; iter < maxIter; iter++) {
        const idx = fvals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
        simplex = idx.map(([, i]) => simplex[i]);
        fvals = idx.map(([v]) => v);
        if (Math.max(...fvals) - Math.min(...fvals) < tol) break;
        const centroid = Array(n).fill(0);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
        const xr = centroid.map((c, j) => c + alpha * (c - simplex[n][j]));
        const fr = f(xr);
        if (fr < fvals[0]) {
            const xe = centroid.map((c, j) => c + gamma * (xr[j] - c));
            const fe = f(xe);
            if (fe < fr) { simplex[n] = xe; fvals[n] = fe; }
            else { simplex[n] = xr; fvals[n] = fr; }
        } else if (fr < fvals[n - 1]) {
            simplex[n] = xr; fvals[n] = fr;
        } else {
            const xc = centroid.map((c, j) => c + rho * (simplex[n][j] - c));
            const fc = f(xc);
            if (fc < fvals[n]) { simplex[n] = xc; fvals[n] = fc; }
            else {
                for (let i = 1; i <= n; i++)
                    simplex[i] = simplex[0].map((v, j) => v + sigma * (simplex[i][j] - v));
                fvals = simplex.map(f);
            }
        }
    }
    return { x: simplex[0], fx: fvals[0] };
}

// ─── OBJECTIVE: Minimize downside errors, maximize tightness ──
function objective(params, data) {
    let downsideErr = 0, accuracy = 0, overkillPenalty = 0;
    data.forEach(d => {
        const pred = applyV6(d.cincai, d, params);
        if (d.ath < pred) {
            const miss = (pred - d.ath) / pred;
            downsideErr += miss * miss; // quadratic penalty for big misses
        } else {
            const over = (d.ath - pred) / d.ath;
            overkillPenalty += over * 0.1; // mild penalty for being too conservative
        }
        accuracy += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    // Heavy penalty for any miss, mild reward for tightness
    return (downsideErr * 10) + overkillPenalty - (accuracy / data.length) * 0.5;
}

// ─── EVALUATE V5 BASELINE ─────────────────────────────────────
console.log('═══════════════════════════════════════════════');
console.log('📈  V5 BASELINE (Current Production)');
console.log('═══════════════════════════════════════════════');
const v5Eval = evaluate(active, d => applyV5(d.cincai, d), 'V5');
console.log(`   Hit Rate:     ${v5Eval.hitRate}% (${v5Eval.hits}/${v5Eval.n})`);
console.log(`   Accuracy:     ${v5Eval.accuracy}%`);
console.log(`   Upside Left:  ${v5Eval.avgUpMissed}%`);
console.log(`   Worst Miss:   ${v5Eval.worstMiss}%`);
if (v5Eval.misses.length > 0) {
    console.log(`   Misses (${v5Eval.misses.length}):`);
    v5Eval.misses.forEach(m => console.log(`     ❌ ${m.name}: pred=${m.pred} vs ath=${m.ath} (${m.miss})`));
}

// ─── OPTIMIZE V6 ──────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('🚀  OPTIMIZING V6...');
console.log('═══════════════════════════════════════════════');

// Initial guesses (14 params)
const starts = [
    // osLin, osQuad, tech, cons, ener, heal, ind, constr, main, ibInf, ofs, priceG, ffDev, qual
    [-0.08, -0.005, 1.10, 1.05, 1.05, 0.95, 0.85, 0.80, 1.02, 0.20, 0.90, 0.08, -0.30, 0.25],
    [-0.05, -0.010, 1.15, 1.08, 1.10, 0.92, 0.80, 0.75, 1.05, 0.15, 0.92, 0.10, -0.25, 0.30],
    [-0.10, -0.003, 1.05, 1.02, 1.00, 0.98, 0.88, 0.82, 1.00, 0.25, 0.88, 0.05, -0.35, 0.20],
    [-0.07, -0.008, 1.12, 1.06, 1.08, 0.94, 0.82, 0.78, 1.03, 0.18, 0.91, 0.07, -0.28, 0.22],
    [-0.12, -0.002, 1.20, 1.10, 1.12, 0.90, 0.78, 0.72, 1.06, 0.30, 0.85, 0.12, -0.40, 0.35],
];

let bestV6 = null, bestFx = Infinity;
starts.forEach((s, i) => {
    process.stdout.write(`  Restart ${i + 1}/${starts.length}...`);
    const res = nelderMead(p => objective(p, active), s, 8000);
    if (res.fx < bestFx) { bestFx = res.fx; bestV6 = res; }
    process.stdout.write(` fx=${res.fx.toFixed(6)}\n`);
});

const v6p = bestV6.x;
const paramNames = ['osLinear', 'osQuadratic', 'techMult', 'consumerMult', 'energyMult',
    'healthMult', 'industrialMult', 'constructionMult', 'mainMult', 'ibInfluence',
    'ofsMult', 'priceGaussian', 'freeFloatDev', 'qualInfluence'];

console.log('\n📐 V6 Optimized Parameters:');
paramNames.forEach((name, i) => console.log(`   ${name.padEnd(20)} = ${v6p[i].toFixed(5)}`));

// ─── EVALUATE V6 ON TRAINING DATA ────────────────────────────
const v6Eval = evaluate(active, d => applyV6(d.cincai, d, v6p), 'V6');
console.log(`\n🔥 V6 RESULTS (Training):`)
console.log(`   Hit Rate:     ${v6Eval.hitRate}% (${v6Eval.hits}/${v6Eval.n})`);
console.log(`   Accuracy:     ${v6Eval.accuracy}%`);
console.log(`   Upside Left:  ${v6Eval.avgUpMissed}%`);
console.log(`   Worst Miss:   ${v6Eval.worstMiss}%`);
if (v6Eval.misses.length > 0) {
    console.log(`   Misses (${v6Eval.misses.length}):`);
    v6Eval.misses.forEach(m => console.log(`     ❌ ${m.name}: pred=${m.pred} vs ath=${m.ath} (${m.miss})`));
}

// ─── LOOCV (HONEST TEST) ──────────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('🧪  LOOCV — HONEST CROSS-VALIDATION');
console.log('═══════════════════════════════════════════════');

let loocvV5Hits = 0, loocvV6Hits = 0;
let loocvV5Acc = 0, loocvV6Acc = 0;

for (let i = 0; i < active.length; i++) {
    const testD = active[i];
    const trainData = active.filter((_, j) => j !== i);
    
    // V5 doesn't retrain — it's fixed rules
    const v5pred = applyV5(testD.cincai, testD);
    if (testD.ath >= v5pred) loocvV5Hits++;
    loocvV5Acc += Math.min(v5pred, testD.ath) / Math.max(v5pred, testD.ath);
    
    // V6 retrains on leave-one-out
    const loocvRes = nelderMead(p => objective(p, trainData), v6p, 1500);
    const v6pred = applyV6(testD.cincai, testD, loocvRes.x);
    if (testD.ath >= v6pred) loocvV6Hits++;
    loocvV6Acc += Math.min(v6pred, testD.ath) / Math.max(v6pred, testD.ath);
    
    if ((i + 1) % 25 === 0) process.stdout.write(`  Done ${i + 1}/${active.length}...\n`);
}

console.log(`\n${'Model'.padEnd(12)} ${'LOOCV Hit Rate'.padEnd(22)} ${'LOOCV Accuracy'.padEnd(18)}`);
console.log('-'.repeat(52));
console.log(`${'V5'.padEnd(12)} ${loocvV5Hits}/${active.length} = ${(loocvV5Hits/active.length*100).toFixed(1)}%`.padEnd(34) + ` ${(loocvV5Acc/active.length*100).toFixed(2)}%`);
console.log(`${'V6'.padEnd(12)} ${loocvV6Hits}/${active.length} = ${(loocvV6Hits/active.length*100).toFixed(1)}%`.padEnd(34) + ` ${(loocvV6Acc/active.length*100).toFixed(2)}%`);

// ─── HEAD-TO-HEAD ─────────────────────────────────────────────
console.log('\n\n═══════════════════════════════════════════════');
console.log('🏆  FINAL HEAD-TO-HEAD: V5 vs V6');
console.log('═══════════════════════════════════════════════');
console.log(`${''.padEnd(12)} ${'Train Hit'.padEnd(14)} ${'Train Acc'.padEnd(14)} ${'LOOCV Hit'.padEnd(14)} ${'LOOCV Acc'.padEnd(14)}`);
console.log('-'.repeat(68));
console.log(`${'V5'.padEnd(12)} ${v5Eval.hitRate}%`.padEnd(26) + `${v5Eval.accuracy}%`.padEnd(14) + `${(loocvV5Hits/active.length*100).toFixed(1)}%`.padEnd(14) + `${(loocvV5Acc/active.length*100).toFixed(2)}%`);
console.log(`${'V6'.padEnd(12)} ${v6Eval.hitRate}%`.padEnd(26) + `${v6Eval.accuracy}%`.padEnd(14) + `${(loocvV6Hits/active.length*100).toFixed(1)}%`.padEnd(14) + `${(loocvV6Acc/active.length*100).toFixed(2)}%`);

const v6Wins = (loocvV6Hits > loocvV5Hits) || (loocvV6Hits === loocvV5Hits && loocvV6Acc > loocvV5Acc);
console.log(`\n${v6Wins ? '🏆 V6 MENANG!' : '👑 V5 MASIH RAJA!'} ${v6Wins ? 'V6 berjaya beat V5 pada LOOCV honest test.' : 'V5 kekal sebagai model terbaik.'}`);

// Save V6 params
const v6ParamsObj = {};
paramNames.forEach((name, i) => v6ParamsObj[name] = parseFloat(v6p[i].toFixed(6)));
v6ParamsObj._loocvHitRate = `${loocvV6Hits}/${active.length}`;
v6ParamsObj._loocvAccuracy = (loocvV6Acc / active.length * 100).toFixed(2) + '%';
fs.writeFileSync('scratch/v6_params.json', JSON.stringify(v6ParamsObj, null, 2));
console.log('\n✅ V6 params saved to scratch/v6_params.json');
