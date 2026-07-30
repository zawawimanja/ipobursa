/**
 * CK Optimizer V8.2 — BEAT V7 WITH SMARTER OPTIMIZATION
 *
 * Fixes V8.1 failures:
 * 1. Keep 15 params (don't reduce)
 * 2. Use Nelder-Mead (not grid search)
 * 3. Standard MSE loss (not quantile)
 * 4. Mild L2 regularization only
 * 5. Ensemble: V7 + V8 average
 */
const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// ─── IB PERFORMANCE LOOKUP ────────────────────────────
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
    ibScores[ib] = Math.min(1, Math.max(0, (s.winRate * 0.6 + Math.min(s.avgReturn, 1) * 0.4)));
});

function getIbScore(ibName) {
    const ib = (ibName || 'unknown').toLowerCase().trim();
    if (ibScores[ib] !== undefined) return ibScores[ib];
    for (const key of Object.keys(ibScores)) {
        if (ib.includes(key) || key.includes(ib)) return ibScores[key];
    }
    return 0.3;
}

// ─── SECTOR GROUPING ──────────────────────────────────
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

// ─── BUILD DATASET ────────────────────────────────────
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
console.log(`\n📊 DATASET: ${active.length} active IPOs\n`);

// ─── V7 MODEL (baseline) ──────────────────────────────
const v7p = [-0.107735, -0.070908, 0.906636, 0.985379, 0.927531, 1.138717, 0.911724, 1.358268, 0.933178, 0.135963, 0.547878, -1.452607, 0.211533, -0.048137, 0.073639];

function applyV7(cincai, d, p) {
    let t = cincai;
    const logOs = Math.log1p(d.os);
    t *= (1 + p[0] * logOs / 5);
    t *= (1 + p[1] * logOs * logOs / 25);
    if (d.sg === 'tech') t *= p[2];
    if (d.sg === 'consumer') t *= p[3];
    if (d.sg === 'energy') t *= p[4];
    if (d.sg === 'health') t *= p[5];
    if (d.sg === 'industrial') t *= p[6];
    if (d.sg === 'construction') t *= p[7];
    if (d.mkt === 'main') t *= p[8];
    t *= (1 + p[9] * (d.ibScore - 0.3));
    if (d.ofs) t *= p[10];
    const ffDev = d.freeFloat - 0.22;
    t *= (1 + p[11] * ffDev);
    let qualScore = 0;
    if (d.anchor) qualScore += 0.3;
    if (d.promoter === 'conglomerate_spinoff') qualScore += 0.2;
    else if (d.promoter === 'first_timer') qualScore -= 0.2;
    t *= (1 + p[12] * qualScore);
    const peNorm = (d.pe - 15) / 15;
    t *= (1 + p[13] * peNorm);
    const lockNorm = (d.lockup - 6) / 12;
    t *= (1 + p[14] * lockNorm);
    return Math.max(t, 0.001);
}

// ─── V8 MODEL — SAME STRUCTURE, BETTER OPTIMIZATION ───
// Key difference: Add interaction terms + mild regularization
function applyV8(cincai, d, p) {
    let t = cincai;

    // Base V7 terms
    const logOs = Math.log1p(d.os);
    t *= (1 + p[0] * logOs / 5);
    t *= (1 + p[1] * logOs * logOs / 25);

    // Sector
    if (d.sg === 'tech') t *= p[2];
    if (d.sg === 'consumer') t *= p[3];
    if (d.sg === 'energy') t *= p[4];
    if (d.sg === 'health') t *= p[5];
    if (d.sg === 'industrial') t *= p[6];
    if (d.sg === 'construction') t *= p[7];

    // Market
    if (d.mkt === 'main') t *= p[8];

    // IB
    t *= (1 + p[9] * (d.ibScore - 0.3));

    // OFS
    if (d.ofs) t *= p[10];

    // Free float
    const ffDev = d.freeFloat - 0.22;
    t *= (1 + p[11] * ffDev);

    // Quality
    let qualScore = 0;
    if (d.anchor) qualScore += 0.3;
    if (d.promoter === 'conglomerate_spinoff') qualScore += 0.2;
    else if (d.promoter === 'first_timer') qualScore -= 0.2;
    t *= (1 + p[12] * qualScore);

    // PE
    const peNorm = (d.pe - 15) / 15;
    t *= (1 + p[13] * peNorm);

    // Lockup
    const lockNorm = (d.lockup - 6) / 12;
    t *= (1 + p[14] * lockNorm);

    // NEW: Interaction term — tech + main market
    if (d.sg === 'tech' && d.mkt === 'main') t *= p[15];

    // NEW: Interaction — high OS + tech
    if (d.sg === 'tech' && d.os > 50) t *= p[16];

    return Math.max(t, 0.001);
}

// ─── OBJECTIVE WITH MILD REGULARIZATION ───────────────
function objective(params, data, lambda = 0.001) {
    let totSE = 0, hits = 0;
    data.forEach(d => {
        const pred = applyV8(d.cincai, d, params);
        const err = (pred - d.ath) / d.ath;
        totSE += err * err;
        if (d.ath >= pred) hits++;
    });

    const n = data.length;
    const mse = totSE / n;
    const hitRate = hits / n;

    // Mild L2 penalty
    const l2Penalty = lambda * params.reduce((sum, p) => sum + p * p, 0);

    // Balance MSE and hit rate
    return mse - (hitRate * 0.05) + l2Penalty;
}

// ─── NELDER-MEAD OPTIMIZER ────────────────────────────
function nelderMead(f, x0, maxIter = 6000, tol = 1e-8) {
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

// ─── EVALUATE ─────────────────────────────────────────
function evaluate(data, modelFn, label) {
    let hits = 0, downsideErr = 0, upsideMissed = 0, totalAcc = 0;
    data.forEach(d => {
        const pred = modelFn(d);
        if (d.ath >= pred) {
            hits++;
            upsideMissed += ((d.ath - pred) / d.ath) * 100;
        } else {
            downsideErr++;
        }
        totalAcc += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    const n = data.length;
    return {
        label, n, hits,
        hitRate: (hits / n * 100).toFixed(1) + '%',
        downsideErr: (downsideErr / n * 100).toFixed(1) + '%',
        upsideMissed: hits > 0 ? (upsideMissed / hits).toFixed(1) + '%' : 'N/A',
        overallAcc: (totalAcc / n * 100).toFixed(2) + '%',
        _hits: hits, _de: downsideErr, _upMissed: hits > 0 ? upsideMissed / hits : 0, _acc: totalAcc / n
    };
}

// ══════════════════════════════════════════════════════
//  RUN V7 BASELINE
// ══════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════');
console.log('📈  V7 BASELINE');
console.log('═══════════════════════════════════════════════');
const v7Eval = evaluate(active, d => applyV7(d.cincai, d, v7p), 'V7');
console.log(`   Hit Rate:        ${v7Eval.hitRate} (${v7Eval.hits}/${v7Eval.n})`);
console.log(`   Downside Error:  ${v7Eval.downsideErr}`);
console.log(`   Upside Missed:   ${v7Eval.upsideMissed}`);
console.log(`   Overall Acc:     ${v7Eval.overallAcc}`);

// ══════════════════════════════════════════════════════
//  OPTIMIZE V8 (17 params — V7 + 2 interaction terms)
// ══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('🚀  OPTIMIZING V8 (17 params, Nelder-Mead)...');
console.log('═══════════════════════════════════════════════');

// Start from V7 params + zeros for interaction terms
const starts = [
    [...v7p, 1.0, 1.0], // V7 baseline + neutral interactions
    [...v7p, 1.1, 1.05], // Slight tech+main boost
    [...v7p.map(p => p * 1.02), 1.05, 1.02], // Slightly scaled up
];

let bestV8 = null, bestFx = Infinity;
starts.forEach((s, i) => {
    process.stdout.write(`  Restart ${i + 1}/${starts.length}...`);
    const res = nelderMead(p => objective(p, active), s, 4000);
    if (res.fx < bestFx) { bestFx = res.fx; bestV8 = res; }
    process.stdout.write(` fx=${res.fx.toFixed(6)}\n`);
});

const v8p = bestV8.x;
console.log('\n📐 V8 Optimized Parameters:');
const paramNames = ['osLinear', 'osQuadratic', 'techMult', 'consumerMult', 'energyMult',
    'healthMult', 'industrialMult', 'constructionMult', 'mainMult', 'ibInfluence',
    'ofsDrag', 'freeFloatImpact', 'qualInfluence', 'peImpact', 'lockupImpact',
    'techMainInteract', 'techOsInteract'];
paramNames.forEach((name, i) => console.log(`   ${name.padEnd(20)} = ${v8p[i].toFixed(6)}`));

// ══════════════════════════════════════════════════════
//  EVALUATE V8
// ══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('🔥  V8 RESULTS (Training)');
console.log('═══════════════════════════════════════════════');
const v8Eval = evaluate(active, d => applyV8(d.cincai, d, v8p), 'V8');
console.log(`   Hit Rate:        ${v8Eval.hitRate} (${v8Eval.hits}/${v8Eval.n})`);
console.log(`   Downside Error:  ${v8Eval.downsideErr}`);
console.log(`   Upside Missed:   ${v8Eval.upsideMissed}`);
console.log(`   Overall Acc:     ${v8Eval.overallAcc}`);

// ══════════════════════════════════════════════════════
//  ENSEMBLE: V7 + V8
// ══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('🤝  ENSEMBLE (V7 + V8 average)');
console.log('═══════════════════════════════════════════════');
const ensembleEval = evaluate(active, d => {
    const pred7 = applyV7(d.cincai, d, v7p);
    const pred8 = applyV8(d.cincai, d, v8p);
    return (pred7 + pred8) / 2;
}, 'Ensemble');
console.log(`   Hit Rate:        ${ensembleEval.hitRate} (${ensembleEval.hits}/${ensembleEval.n})`);
console.log(`   Downside Error:  ${ensembleEval.downsideErr}`);
console.log(`   Upside Missed:   ${ensembleEval.upsideMissed}`);
console.log(`   Overall Acc:     ${ensembleEval.overallAcc}`);

// ══════════════════════════════════════════════════════
//  HEAD-TO-HEAD
// ══════════════════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🏆  FINAL: V7 vs V8 vs ENSEMBLE');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('Aspek', 24)} ${pad('🔥 V7', 14)} ${pad('🚀 V8', 14)} ${pad('🤝 Ensemble', 14)} Pemenang`);
console.log('-'.repeat(80));

const models = [v7Eval, v8Eval, ensembleEval];
const bestHit = models.reduce((b, m) => m._hits > b._hits ? m : b);
const bestAcc = models.reduce((b, m) => m._acc > b._acc ? m : b);
const bestDE = models.reduce((b, m) => m._de < b._de ? m : b);
const bestUM = models.reduce((b, m) => m._upMissed < b._upMissed ? m : b);

function fmt(s) { return String(s).padEnd(14); }
console.log(`${pad('Hit Rate', 24)} ${fmt(v7Eval.hitRate)} ${fmt(v8Eval.hitRate)} ${fmt(ensembleEval.hitRate)} ${bestHit.label} 👑`);
console.log(`${pad('Downside Error', 24)} ${fmt(v7Eval.downsideErr)} ${fmt(v8Eval.downsideErr)} ${fmt(ensembleEval.downsideErr)} ${bestDE.label} 👑`);
console.log(`${pad('Upside Missed', 24)} ${fmt(v7Eval.upsideMissed)} ${fmt(v8Eval.upsideMissed)} ${fmt(ensembleEval.upsideMissed)} ${bestUM.label} 👑`);
console.log(`${pad('Overall Accuracy', 24)} ${fmt(v7Eval.overallAcc)} ${fmt(v8Eval.overallAcc)} ${fmt(ensembleEval.overallAcc)} ${bestAcc.label} 👑`);

// Save V8 params
const v8ParamsObj = {};
paramNames.forEach((name, i) => v8ParamsObj[name] = parseFloat(v8p[i].toFixed(6)));
v8ParamsObj._trainingHitRate = v8Eval.hitRate;
v8ParamsObj._trainingAccuracy = v8Eval.overallAcc;
fs.writeFileSync('scratch/v8_2_params.json', JSON.stringify(v8ParamsObj, null, 2));
console.log('\n✅ V8.2 parameters saved to scratch/v8_2_params.json');
