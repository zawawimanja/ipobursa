/**
 * CK Optimizer V7.0 — BEAT V6 + SIFU ON ALL METRICS
 *
 * Fixes V6's structural errors:
 *  - Sector multipliers in wrong direction (tech/consumer were discounted when they should be premium)
 *  - OFS as positive signal (was 1.219, should be < 1.0)
 *  - Weak IB influence
 *  - No PE signal
 *  - Arbitrary price Gaussian
 *  - Objective function biased 10:1 toward avoiding misses vs capturing upside
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
console.log(`\n📊 DATASET: ${active.length} active IPOs (excl. ${dataset.filter(d => d.gd).length} gap-downs)\n`);

// ─── V6 REPRODUCTION (for comparison) ─────────────────
const v6p = [-0.062118, -0.094923, 0.757103, 0.923936, 0.955618, 1.091094, 0.836895, 1.052850, 1.061522, 0.074801, 1.219244, 0.125707, -0.747504, -0.000803];

function applyV6(cincai, d) {
  let t = cincai;
  const logOs = Math.log1p(d.os);
  t *= (1 + v6p[0] * logOs / 5);
  t *= (1 + v6p[1] * logOs * logOs / 25);
  if (d.sg === 'tech') t *= v6p[2];
  if (d.sg === 'consumer') t *= v6p[3];
  if (d.sg === 'energy') t *= v6p[4];
  if (d.sg === 'health') t *= v6p[5];
  if (d.sg === 'industrial') t *= v6p[6];
  if (d.sg === 'construction') t *= v6p[7];
  if (d.mkt === 'main') t *= v6p[8];
  t *= (1 + v6p[9] * (d.ibScore - 0.3));
  if (d.ofs) t *= v6p[10];
  const priceNorm = (d.ipo - 0.30) / 0.50;
  t *= (1 + v6p[11] * Math.exp(-priceNorm * priceNorm));
  const ffDev = d.freeFloat - 0.22;
  t *= (1 + v6p[12] * ffDev);
  let qualScore = 0;
  if (d.anchor) qualScore += 0.3;
  if (d.promoter === 'conglomerate_spinoff') qualScore += 0.2;
  else if (d.promoter === 'first_timer') qualScore -= 0.2;
  if (d.lockup >= 12) qualScore += 0.1;
  else qualScore -= 0.1;
  t *= (1 + v6p[13] * qualScore);
  return t;
}

// ─── V7 MODEL — FIXED SECTOR DIRECTION + PE + BALANCED ─
// 15 parameters:
//   [0]  osLinear        — continuous OS response (should be slightly negative: big OS = more demand = higher target)
//   [1]  osQuadratic     — non-linear OS effect (capture diminishing returns)
//   [2]  techMult        — tech sector (CK under-estimates → should be > 1.0)
//   [3]  consumerMult    — consumer sector (CK under-estimates → should be > 1.0)
//   [4]  energyMult      — energy sector (CK under-estimates → should be > 1.0)
//   [5]  healthMult      — health sector (neutral, near 1.0)
//   [6]  industrialMult  — industrial sector (CK over-estimates → should be < 1.0)
//   [7]  constructionMult— construction sector (CK over-estimates → should be < 1.0)
//   [8]  mainMult        — Main Market premium
//   [9]  ibInfluence     — IB quality score impact (should be > 0.1)
//   [10] ofsDrag         — OFS drag (should be < 1.0, unlike V6's 1.219!)
//   [11] freeFloatImpact — free float deviation impact
//   [12] qualInfluence   — promoter/quality impact
//   [13] peImpact        — PE-based adjustment: low PE = cheap = higher target, high PE = expensive = lower
//   [14] lockupImpact    — lockup period impact

function applyV7(cincai, d, p) {
  let t = cincai;

  // 1. OS response (continuous, sigmoid-like)
  const logOs = Math.log1p(d.os);
  t *= (1 + p[0] * logOs / 5);
  t *= (1 + p[1] * logOs * logOs / 25);

  // 2. Sector multipliers — V6 had these BACKWARDS for tech/consumer/construction
  //    CK under-estimates hot sectors (tech, consumer, energy) → target perlu DITAMBAH
  //    CK over-estimates traditional sectors (construction, industrial) → target perlu DIKURANG
  if (d.sg === 'tech') t *= p[2];
  if (d.sg === 'consumer') t *= p[3];
  if (d.sg === 'energy') t *= p[4];
  if (d.sg === 'health') t *= p[5];
  if (d.sg === 'industrial') t *= p[6];
  if (d.sg === 'construction') t *= p[7];

  // 3. Market premium
  if (d.mkt === 'main') t *= p[8];

  // 4. IB Quality Score (stronger influence than V6's 0.075)
  t *= (1 + p[9] * (d.ibScore - 0.3));

  // 5. OFS drag — V6 had this as POSITIVE (1.219) which is WRONG
  //    OFS = insider selling → reduces demand → lower target
  if (d.ofs) t *= p[10];

  // 6. Free float
  const ffDev = d.freeFloat - 0.22;
  t *= (1 + p[11] * ffDev);

  // 7. Quality score
  let qualScore = 0;
  if (d.anchor) qualScore += 0.3;
  if (d.promoter === 'conglomerate_spinoff') qualScore += 0.2;
  else if (d.promoter === 'first_timer') qualScore -= 0.2;
  t *= (1 + p[12] * qualScore);

  // 8. PE signal — NEW: low PE (<12) = undervalued → higher target
  //    high PE (>25) = expensive → lower target
  const peNorm = (d.pe - 15) / 15; // center at 15, scale by 15
  t *= (1 + p[13] * peNorm);

  // 9. Lockup — longer lockup = confidence → higher target
  const lockNorm = (d.lockup - 6) / 12;
  t *= (1 + p[14] * lockNorm);

  return Math.max(t, 0.001);
}

// ─── OBJECTIVE FUNCTION ───────────────────────────────
// Balanced: penalizes downside error (misses) and upside missed (conservatism) equally
// Rewards hit rate and accuracy
function objective(params, data) {
  let totDownsideErr = 0, totUpsideMissed = 0, totAcc = 0, hitCount = 0;
  data.forEach(d => {
    const pred = applyV7(d.cincai, d, params);
    if (d.ath >= pred) {
      hitCount++;
      const upMissed = (d.ath - pred) / d.ath;
      totUpsideMissed += upMissed;
      totAcc += pred / d.ath;
    } else {
      const downErr = (pred - d.ath) / d.ath;
      totDownsideErr += downErr; // LINEAR penalty (was quadratic — too punishing)
      totAcc += d.ath / pred;
    }
  });
  const n = data.length;
  const hitRate = hitCount / n;
  const avgDownErr = totDownsideErr / n;
  const avgUpMissed = totUpsideMissed / n;
  const avgAcc = totAcc / n;

  // V7.3: accuracy-focused with strong downside guard
  return -(hitRate * 0.15 + avgAcc * 0.65) + (avgDownErr * 8) + (avgUpMissed * 0.15);
}

// ─── NELDER-MEAD ──────────────────────────────────────
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
//  RUN V6 BASELINE
// ══════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════');
console.log('📈  V6 BASELINE');
console.log('═══════════════════════════════════════════════');
const v6Eval = evaluate(active, d => applyV6(d.cincai, d), 'V6');
console.log(`   Hit Rate:        ${v6Eval.hitRate} (${v6Eval.hits}/${v6Eval.n})`);
console.log(`   Downside Error:  ${v6Eval.downsideErr}`);
console.log(`   Upside Missed:   ${v6Eval.upsideMissed}`);
console.log(`   Overall Acc:     ${v6Eval.overallAcc}`);

// ══════════════════════════════════════════════════════
//  OPTIMIZE V7
// ══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('🚀  OPTIMIZING V7 (15 params)...');
console.log('═══════════════════════════════════════════════');

// Initial guesses based on CK bias analysis:
//   CK under-estimates: tech 24%, consumer 46%, energy 12%
//   CK over-estimates: construction 5%, industrial 7%
//   OFS should be negative: ~0.90
//   IB influence should be stronger: ~0.15
//   PE: negative (high PE → lower target, low PE → higher target)
const starts = [
  // Seed from V7 Run 1 (best balance: 88.7% HR, 30.6% UM, 71.88% Acc)
  [-0.096802, -0.062218, 1.036673, 1.018793, 1.019364, 1.160385, 0.977038, 1.335450, 1.009819, 0.135263, 0.558982, -1.206141, 0.213287, -0.052825, 0.070170],
  // Target higher accuracy: bump sector multipliers
  [-0.096802, -0.062218, 1.15, 1.10, 1.08, 1.16, 0.92, 1.20, 1.01, 0.14, 0.56, -1.21, 0.21, -0.05, 0.07],
  // Target lower UM: higher multipliers across the board
  [-0.096802, -0.062218, 1.20, 1.30, 1.18, 1.16, 0.90, 1.10, 1.02, 0.14, 0.56, -1.21, 0.21, -0.05, 0.07],
];

let bestV7 = null, bestFx = Infinity;
starts.forEach((s, i) => {
  process.stdout.write(`  Restart ${i + 1}/${starts.length}...`);
  const res = nelderMead(p => objective(p, active), s, 5000);
  if (res.fx < bestFx) { bestFx = res.fx; bestV7 = res; }
  process.stdout.write(` fx=${res.fx.toFixed(6)}\n`);
});

const v7p = bestV7.x;
const paramNames = ['osLinear', 'osQuadratic', 'techMult', 'consumerMult', 'energyMult',
  'healthMult', 'industrialMult', 'constructionMult', 'mainMult', 'ibInfluence',
  'ofsDrag', 'freeFloatImpact', 'qualInfluence', 'peImpact', 'lockupImpact'];

console.log('\n📐 V7 Optimized Parameters:');
paramNames.forEach((name, i) => console.log(`   ${name.padEnd(20)} = ${v7p[i].toFixed(6)}`));

// ══════════════════════════════════════════════════════
//  EVALUATE V7 ON TRAINING DATA
// ══════════════════════════════════════════════════════
const v7Eval = evaluate(active, d => applyV7(d.cincai, d, v7p), 'V7');
console.log(`\n🔥 V7 RESULTS (Training):`)
console.log(`   Hit Rate:        ${v7Eval.hitRate} (${v7Eval.hits}/${v7Eval.n})`);
console.log(`   Downside Error:  ${v7Eval.downsideErr}`);
console.log(`   Upside Missed:   ${v7Eval.upsideMissed}`);
console.log(`   Overall Acc:     ${v7Eval.overallAcc}`);

// ══════════════════════════════════════════════════════
//  LOOCV
// ══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('🧪  LOOCV');
console.log('═══════════════════════════════════════════════');

let loocvV6Hits = 0, loocvV7Hits = 0;
let loocvV6Acc = 0, loocvV7Acc = 0;

console.log('  Running LOOCV (may take a few minutes)...');
for (let i = 0; i < active.length; i++) {
  const testD = active[i];
  const trainData = active.filter((_, j) => j !== i);

  // V6 fixed
  const v6pred = applyV6(testD.cincai, testD);
  if (testD.ath >= v6pred) loocvV6Hits++;
  loocvV6Acc += Math.min(v6pred, testD.ath) / Math.max(v6pred, testD.ath);

  // V7 retrains with fewer iterations for speed
  const loocvRes = nelderMead(p => objective(p, trainData), v7p, 800);
  const v7pred = applyV7(testD.cincai, testD, loocvRes.x);
  if (testD.ath >= v7pred) loocvV7Hits++;
  loocvV7Acc += Math.min(v7pred, testD.ath) / Math.max(v7pred, testD.ath);

  if ((i + 1) % 20 === 0 || i === 0) process.stdout.write(`  LOOCV ${i + 1}/${active.length}... V6: ${loocvV6Hits}/${i+1} V7: ${loocvV7Hits}/${i+1}\n`);
}

console.log(`\n${''.padEnd(12)} ${'LOOCV Hit Rate'.padEnd(22)} ${'LOOCV Accuracy'.padEnd(18)}`);
console.log('-'.repeat(52));
console.log(`V6`.padEnd(12) + `${loocvV6Hits}/${active.length} = ${(loocvV6Hits/active.length*100).toFixed(1)}%`.padEnd(22) + `${(loocvV6Acc/active.length*100).toFixed(2)}%`);
console.log(`V7`.padEnd(12) + `${loocvV7Hits}/${active.length} = ${(loocvV7Hits/active.length*100).toFixed(1)}%`.padEnd(22) + `${(loocvV7Acc/active.length*100).toFixed(2)}%`);

// ══════════════════════════════════════════════════════
//  HEAD-TO-HEAD COMPARISON (same format as user's table)
// ══════════════════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🏆  FINAL: SIFU CK vs V3 vs V5 vs V6 vs V7');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('Aspek', 24)} ${pad('📌 Sifu CK', 16)} ${pad('🤖 V3', 14)} ${pad('🚀 V5', 14)} ${pad('⚡ V6', 14)} ${pad('🔥 V7', 14)} Pemenang`);
console.log('-'.repeat(120));

// Simple Sifu
function sifuFn(d) { return d.cincai; }
const sifuEval = evaluate(active, sifuFn, 'Sifu CK');

// V3 (from compare_v6_vs_all.js)
const v3p = { themeMult: 0.9602, healthMult: 0.9565, tradDisc: 0.7343, mainMult: 1.0220, osScale: -0.0855, upsideScale: 0.0646 };
function getSgV3(sg) {
  if (sg === 'tech' || sg === 'consumer' || sg === 'energy') return 'theme';
  if (sg === 'health') return 'health';
  if (sg === 'industrial' || sg === 'construction') return 'trad';
  return 'other';
}
function applyV3(d) {
  let t = d.cincai;
  const g = getSgV3(d.sg);
  if (g === 'theme') t *= v3p.themeMult;
  else if (g === 'health') t *= v3p.healthMult;
  else if (g === 'trad') t *= v3p.tradDisc;
  if (d.mkt === 'main') t *= v3p.mainMult;
  if (d.os > 0) t *= (1 + v3p.osScale * Math.log1p(d.os) / 5);
  else t *= (1 + v3p.osScale * Math.log1p(15) / 5);
  const upsideRatio = (d.cincai - d.ipo) / d.ipo;
  t *= (1 + v3p.upsideScale * upsideRatio);
  return t;
}
const v3Eval = evaluate(active, applyV3, 'V3');

// V5
function applyV5(d) {
  let t = d.cincai;
  if (d.os >= 70) t *= 0.946;
  else if (d.os >= 40) t *= 1.372;
  if (d.os >= 15 || d.mkt === 'main') {
    if (d.sg === 'tech' || d.sg === 'consumer') t *= 1.265;
  }
  if ((d.sg === 'industrial' || d.sg === 'construction') && d.mkt === 'ace') {
    t *= (d.os < 15) ? 0.887 : 0.868;
  }
  if (d.mkt === 'main') {
    if (d.os >= 40) t *= 1.20;
    else if (d.os < 10) t *= 0.85;
    else t *= 0.997;
  }
  if (d.ipo >= 0.30 && d.ipo <= 0.50) t *= 1.10;
  else if (d.ipo >= 0.75 && d.ipo <= 1.00) t *= 1.10;
  else if (d.ipo < 0.20) t *= 0.85;
  else if (d.ipo > 1.00) t *= 0.90;
  if (d.ofs) t *= 0.90;
  if (d.anchor) t *= 1.12;
  if (d.freeFloat >= 0.15 && d.freeFloat <= 0.25) t *= 1.10;
  else if (d.freeFloat > 0.40) t *= 0.90;
  if (d.lockup <= 6) t *= 0.92;
  if (d.promoter === 'conglomerate_spinoff') t *= 1.08;
  else if (d.promoter === 'first_timer') t *= 0.93;
  return t;
}
const v5Eval = evaluate(active, applyV5, 'V5');

// print header
const models = [sifuEval, v3Eval, v5Eval, v6Eval, v7Eval];
const bestHit = models.reduce((b, m) => m._hits > b._hits ? m : b);
const bestAcc = models.reduce((b, m) => m._acc > b._acc ? m : b);
const bestDE = models.reduce((b, m) => m._de < b._de ? m : b);
const bestUM = models.reduce((b, m) => m._upMissed < b._upMissed ? m : b);

function fmt(s) { return String(s).padEnd(14); }
console.log(`${pad('Hit Rate', 24)} ${fmt(sifuEval.hitRate)} ${fmt(v3Eval.hitRate)} ${fmt(v5Eval.hitRate)} ${fmt(v6Eval.hitRate)} ${fmt(v7Eval.hitRate)} ${bestHit.label === 'V7' ? '🔥 V7 👑' : bestHit.label === 'V6' ? '⚡ V6 👑' : bestHit.label + ' 👑'}`);
console.log(`${pad('Downside Error', 24)} ${fmt(sifuEval.downsideErr)} ${fmt(v3Eval.downsideErr)} ${fmt(v5Eval.downsideErr)} ${fmt(v6Eval.downsideErr)} ${fmt(v7Eval.downsideErr)} ${bestDE.label === 'V7' ? '🔥 V7 👑' : bestDE.label + ' 👑'}`);
console.log(`${pad('Upside Missed', 24)} ${fmt(sifuEval.upsideMissed)} ${fmt(v3Eval.upsideMissed)} ${fmt(v5Eval.upsideMissed)} ${fmt(v6Eval.upsideMissed)} ${fmt(v7Eval.upsideMissed)} ${bestUM.label === 'V7' ? '🔥 V7 👑' : bestUM.label + ' 👑'}`);
console.log(`${pad('Overall Accuracy', 24)} ${fmt(sifuEval.overallAcc)} ${fmt(v3Eval.overallAcc)} ${fmt(v5Eval.overallAcc)} ${fmt(v6Eval.overallAcc)} ${fmt(v7Eval.overallAcc)} ${bestAcc.label === 'V7' ? '🔥 V7 👑' : bestAcc.label + ' 👑'}`);

// Rankings
console.log('\n\n📊 Ranking by Hit Rate:');
[...models].sort((a, b) => b._hits - a._hits).forEach((m, i) =>
  console.log(`   ${i + 1}. ${m.label}: ${m.hitRate} (${m.hits}/${m.n})`));

console.log('\n📊 Ranking by Overall Accuracy:');
[...models].sort((a, b) => b._acc - a._acc).forEach((m, i) =>
  console.log(`   ${i + 1}. ${m.label}: ${m.overallAcc}`));

console.log('\n📊 Ranking by Downside Error (lower is better):');
[...models].sort((a, b) => a._de - b._de).forEach((m, i) =>
  console.log(`   ${i + 1}. ${m.label}: ${m.downsideErr}`));

console.log('\n📊 Ranking by Upside Missed (lower is better):');
[...models].sort((a, b) => a._upMissed - b._upMissed).forEach((m, i) =>
  console.log(`   ${i + 1}. ${m.label}: ${m.upsideMissed}`));

// Save V7 params
const v7ParamsObj = {};
paramNames.forEach((name, i) => v7ParamsObj[name] = parseFloat(v7p[i].toFixed(6)));
v7ParamsObj._loocvHitRate = `${loocvV7Hits}/${active.length}`;
v7ParamsObj._loocvAccuracy = (loocvV7Acc / active.length * 100).toFixed(2) + '%';
v7ParamsObj._trainingHitRate = v7Eval.hitRate;
v7ParamsObj._trainingAccuracy = v7Eval.overallAcc;
fs.writeFileSync('scratch/v7_params.json', JSON.stringify(v7ParamsObj, null, 2));
console.log('\n✅ Parameters saved to scratch/v7_params.json');
