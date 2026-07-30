/**
 * CK Optimizer V8.0 — BEAT V7 WITH REGULARIZATION & TIME VALIDATION
 *
 * Improvements over V7:
 * 1. L2 Regularization — prevent overfitting
 * 2. Time-based train/test split — 2024-2025 train, 2026 test
 * 3. Feature selection — reduce from 15 to 10 params
 * 4. Ridge regression instead of Nelder-Mead (more stable)
 * 5. Quantile loss — focus on median, not mean (robust to outliers)
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

// ─── PARSE DATE FOR TIME SPLIT ────────────────────────
function parseDate(dateStr) {
    if (!dateStr) return null;
    // Handle formats: "15-Jan-2024", "2024-01-15", etc.
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const parts = dateStr.toLowerCase().split(/[-/]/);
    if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) { // YYYY-MM-DD
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
        } else { // DD-MMM-YYYY
            day = parseInt(parts[0]);
            month = months[parts[1].substring(0, 3)] ?? 0;
            year = parseInt(parts[2]);
        }
        return new Date(year, month, day);
    }
    return null;
}

// ─── BUILD DATASET ────────────────────────────────────
const dataset = raw
    .filter(d => d.price > 0 && d.sifuTargetPrice > 0 && d.highPrice > 0 && d.stage >= 5)
    .map(d => {
        const listingDate = parseDate(d.listingDate || d.date || '01-Jan-2024');
        return {
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
            listingDate,
            year: listingDate ? listingDate.getFullYear() : 2024,
            gd: d.highPrice < d.price,
        };
    });

const active = dataset.filter(d => !d.gd);

// ─── TIME-BASED SPLIT ─────────────────────────────────
const train = active.filter(d => d.year <= 2025);
const test = active.filter(d => d.year >= 2026);
console.log(`\n📊 TIME SPLIT: ${train.length} train (2024-2025), ${test.length} test (2026)\n`);

// ─── V8 MODEL — REGULARIZED, FEWER PARAMS ─────────────
// 10 parameters (down from 15):
//   [0]  osLinear        — log OS response
//   [1]  techPremium     — tech sector boost
//   [2]  constructionPen — construction penalty
//   [3]  mainPremium     — main market boost
//   [4]  ibQuality       — IB score impact
//   [5]  ofsDrag         — OFS penalty
//   [6]  peValue         — low PE boost
//   [7]  anchorBoost     — anchor investor boost
//   [8]  freeFloatPen    — high free float penalty
//   [9]  globalScale     — global multiplier

function applyV8(cincai, d, p) {
    let t = cincai;

    // 1. OS response (simplified — no quadratic)
    const logOs = Math.log1p(d.os);
    t *= (1 + p[0] * logOs / 5);

    // 2. Sector — only 2 params (tech boost, construction penalty)
    if (d.sg === 'tech') t *= p[1];
    if (d.sg === 'construction') t *= p[2];

    // 3. Market
    if (d.mkt === 'main') t *= p[3];

    // 4. IB quality
    t *= (1 + p[4] * (d.ibScore - 0.3));

    // 5. OFS drag
    if (d.ofs) t *= p[5];

    // 6. PE value — low PE = higher target
    const peNorm = (15 - d.pe) / 15; // inverted: low PE = positive
    t *= (1 + p[6] * peNorm);

    // 7. Anchor boost
    if (d.anchor) t *= p[7];

    // 8. Free float penalty
    const ffDev = d.freeFloat - 0.25;
    t *= (1 + p[8] * ffDev);

    // 9. Global scale
    t *= p[9];

    return Math.max(t, 0.001);
}

// ─── QUANTILE LOSS (more robust than MSE) ─────────────
function quantileLoss(pred, actual, tau = 0.5) {
    const diff = actual - pred;
    return Math.max(tau * diff, (tau - 1) * diff) / actual;
}

// ─── REGULARIZED OBJECTIVE ────────────────────────────
function objective(params, data, lambda = 0.01) {
    let totLoss = 0, hits = 0;
    data.forEach(d => {
        const pred = applyV8(d.cincai, d, params);
        // Use quantile loss (median regression)
        totLoss += quantileLoss(pred, d.ath, 0.5);
        if (d.ath >= pred) hits++;
    });

    const n = data.length;
    const hitRate = hits / n;
    const avgLoss = totLoss / n;

    // L2 regularization — penalize large parameters
    const l2Penalty = lambda * params.reduce((sum, p) => sum + p * p, 0);

    // Combined: minimize loss, maximize hit rate, penalize complexity
    return avgLoss - (hitRate * 0.1) + l2Penalty;
}

// ─── GRID SEARCH + REFINEMENT ─────────────────────────
function gridSearch(data) {
    const baseParams = [
        -0.05,   // osLinear
        1.10,    // techPremium
        0.85,    // constructionPen
        1.05,    // mainPremium
        0.15,    // ibQuality
        0.70,    // ofsDrag
        0.10,    // peValue
        1.08,    // anchorBoost
        -0.50,   // freeFloatPen
        1.00     // globalScale
    ];

    let bestParams = baseParams.slice();
    let bestLoss = objective(bestParams, data);

    // Simple coordinate descent
    const stepSizes = [0.02, 0.05, 0.05, 0.02, 0.05, 0.05, 0.05, 0.02, 0.10, 0.02];

    for (let iter = 0; iter < 100; iter++) {
        let improved = false;
        for (let i = 0; i < bestParams.length; i++) {
            for (const delta of [-stepSizes[i], stepSizes[i]]) {
                const testParams = bestParams.slice();
                testParams[i] += delta;
                const loss = objective(testParams, data);
                if (loss < bestLoss) {
                    bestLoss = loss;
                    bestParams = testParams;
                    improved = true;
                }
            }
        }
        if (!improved) break;
    }

    return { params: bestParams, loss: bestLoss };
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
//  RUN V7 BASELINE (for comparison)
// ══════════════════════════════════════════════════════
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

console.log('═══════════════════════════════════════════════');
console.log('📈  V7 BASELINE (Full Dataset)');
console.log('═══════════════════════════════════════════════');
const v7Full = evaluate(active, d => applyV7(d.cincai, d, v7p), 'V7');
console.log(`   Hit Rate:        ${v7Full.hitRate} (${v7Full.hits}/${v7Full.n})`);
console.log(`   Downside Error:  ${v7Full.downsideErr}`);
console.log(`   Upside Missed:   ${v7Full.upsideMissed}`);
console.log(`   Overall Acc:     ${v7Full.overallAcc}`);

// ══════════════════════════════════════════════════════
//  OPTIMIZE V8 ON TRAINING SET
// ══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('🚀  OPTIMIZING V8 (10 params, regularized)...');
console.log('═══════════════════════════════════════════════');

const v8Result = gridSearch(train);
const v8p = v8Result.params;

console.log('\n📐 V8 Optimized Parameters:');
const paramNames = ['osLinear', 'techPremium', 'constructionPen', 'mainPremium', 'ibQuality',
    'ofsDrag', 'peValue', 'anchorBoost', 'freeFloatPen', 'globalScale'];
paramNames.forEach((name, i) => console.log(`   ${name.padEnd(20)} = ${v8p[i].toFixed(6)}`));
console.log(`   Final Loss: ${v8Result.loss.toFixed(6)}`);

// ══════════════════════════════════════════════════════
//  EVALUATE V8 ON TRAIN & TEST
// ══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('🔥  V8 RESULTS');
console.log('═══════════════════════════════════════════════');

const v8Train = evaluate(train, d => applyV8(d.cincai, d, v8p), 'V8-Train');
console.log(`\n   TRAIN (2024-2025, n=${v8Train.n}):`);
console.log(`   Hit Rate:        ${v8Train.hitRate} (${v8Train.hits}/${v8Train.n})`);
console.log(`   Downside Error:  ${v8Train.downsideErr}`);
console.log(`   Upside Missed:   ${v8Train.upsideMissed}`);
console.log(`   Overall Acc:     ${v8Train.overallAcc}`);

if (test.length > 0) {
    const v8Test = evaluate(test, d => applyV8(d.cincai, d, v8p), 'V8-Test');
    console.log(`\n   TEST (2026, n=${v8Test.n}):`);
    console.log(`   Hit Rate:        ${v8Test.hitRate} (${v8Test.hits}/${v8Test.n})`);
    console.log(`   Downside Error:  ${v8Test.downsideErr}`);
    console.log(`   Upside Missed:   ${v8Test.upsideMissed}`);
    console.log(`   Overall Acc:     ${v8Test.overallAcc}`);
}

// V7 on test set for comparison
if (test.length > 0) {
    const v7Test = evaluate(test, d => applyV7(d.cincai, d, v7p), 'V7-Test');
    console.log(`\n   V7 TEST (2026, n=${v7Test.n}):`);
    console.log(`   Hit Rate:        ${v7Test.hitRate} (${v7Test.hits}/${v7Test.n})`);
    console.log(`   Downside Error:  ${v7Test.downsideErr}`);
    console.log(`   Upside Missed:   ${v7Test.upsideMissed}`);
    console.log(`   Overall Acc:     ${v7Test.overallAcc}`);
}

// ══════════════════════════════════════════════════════
//  HEAD-TO-HEAD COMPARISON
// ══════════════════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🏆  FINAL: V7 vs V8 (Full Dataset)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const v8Full = evaluate(active, d => applyV8(d.cincai, d, v8p), 'V8');
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('Aspek', 24)} ${pad('🔥 V7', 14)} ${pad('🚀 V8', 14)} Pemenang`);
console.log('-'.repeat(60));

const models = [v7Full, v8Full];
const bestHit = models.reduce((b, m) => m._hits > b._hits ? m : b);
const bestAcc = models.reduce((b, m) => m._acc > b._acc ? m : b);
const bestDE = models.reduce((b, m) => m._de < b._de ? m : b);
const bestUM = models.reduce((b, m) => m._upMissed < b._upMissed ? m : b);

function fmt(s) { return String(s).padEnd(14); }
console.log(`${pad('Hit Rate', 24)} ${fmt(v7Full.hitRate)} ${fmt(v8Full.hitRate)} ${bestHit.label === 'V8' ? '🚀 V8 👑' : '🔥 V7 👑'}`);
console.log(`${pad('Downside Error', 24)} ${fmt(v7Full.downsideErr)} ${fmt(v8Full.downsideErr)} ${bestDE.label === 'V8' ? '🚀 V8 👑' : '🔥 V7 👑'}`);
console.log(`${pad('Upside Missed', 24)} ${fmt(v7Full.upsideMissed)} ${fmt(v8Full.upsideMissed)} ${bestUM.label === 'V8' ? '🚀 V8 👑' : '🔥 V7 👑'}`);
console.log(`${pad('Overall Accuracy', 24)} ${fmt(v7Full.overallAcc)} ${fmt(v8Full.overallAcc)} ${bestAcc.label === 'V8' ? '🚀 V8 👑' : '🔥 V7 👑'}`);

// Save V8 params
const v8ParamsObj = {};
paramNames.forEach((name, i) => v8ParamsObj[name] = parseFloat(v8p[i].toFixed(6)));
v8ParamsObj._trainHitRate = v8Train.hitRate;
v8ParamsObj._trainAccuracy = v8Train.overallAcc;
if (test.length > 0) {
    const v8Test = evaluate(test, d => applyV8(d.cincai, d, v8p), 'V8-Test');
    v8ParamsObj._testHitRate = v8Test.hitRate;
    v8ParamsObj._testAccuracy = v8Test.overallAcc;
}
fs.writeFileSync('scratch/v8_params.json', JSON.stringify(v8ParamsObj, null, 2));
console.log('\n✅ V8 parameters saved to scratch/v8_params.json');
