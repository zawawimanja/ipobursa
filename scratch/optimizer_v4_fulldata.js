/**
 * ============================================================
 * CK Optimizer V4.0 — FULL DATASET EDITION
 * ============================================================
 * Upgrade dari V3:
 *  - Dataset: 55 IPO → semua listed dari data.json (~200 kaunter)
 *  - Field: highPrice (bukan ath hardcoded)
 *  - Same V3 params (7 param) tapi train pada data lebih besar
 *  - Juga test V4 params baru dengan Nelder-Mead
 * ============================================================
 */

const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// ─── BUILD DATASET ────────────────────────────────────────────
// Need: IPO price, Sifu TP, ATH (highPrice), OS, sector, market
function getSectorGroup(sector) {
    const s = (sector || '').toLowerCase();
    if (s.includes('tech') || s.includes('consumer') || s.includes('energy') || 
        s.includes('food') || s.includes('beverage') || s.includes('solar') ||
        s.includes('semiconductor') || s.includes('software') || s.includes('hardware')) return 'theme';
    if (s.includes('health') || s.includes('medical') || s.includes('care') || 
        s.includes('pharma')) return 'health';
    if (s.includes('industrial') || s.includes('construction') || s.includes('property') || 
        s.includes('metal') || s.includes('manufacturing') || s.includes('shipping') ||
        s.includes('transport') || s.includes('logistic')) return 'trad';
    return 'other';
}

const dataset = raw
    .filter(d => {
        const hasIpo = d.price && d.price > 0;
        const hasSifu = d.sifuTargetPrice && d.sifuTargetPrice > 0;
        const hasHigh = d.highPrice && d.highPrice > 0;
        const isListed = d.stage >= 5;
        return hasIpo && hasSifu && hasHigh && isListed;
    })
    .map(d => ({
        name:   d.companyName || d.id,
        sym:    d.symbol || d.id,
        ipo:    d.price,
        cincai: d.sifuTargetPrice,
        ath:    d.highPrice,
        sg:     getSectorGroup(d.sector),
        mkt:    (d.market || '').toLowerCase().includes('main') ? 'main' : 'ace',
        os:     d.os || d.predictedOS || 10,
        gd:     (d.highPrice < d.price), // gap-down if ATH < IPO price
    }));

console.log(`\n📊 DATASET SUMMARY`);
console.log(`Total kaunter dengan data lengkap: ${dataset.length}`);
const gd = dataset.filter(d => d.gd);
const active = dataset.filter(d => !d.gd);
console.log(`Gap-down: ${gd.length} | Aktif (non-gap-down): ${active.length}`);

// Sector breakdown
const sectors = {};
active.forEach(d => { sectors[d.sg] = (sectors[d.sg]||0)+1; });
console.log('Sector groups:', sectors);

// ─── V3 PARAMS (CURRENT PRODUCTION) ──────────────────────────
const v3Params = { themeMult: 0.9602, healthMult: 0.9565, tradDisc: 0.7343, mainMult: 1.0220, osScale: -0.0855, upsideScale: 0.0646 };

function applyModel(cincai, d, p) {
    let t = cincai;
    if (d.sg === 'theme')  t *= p.themeMult;
    else if (d.sg === 'health') t *= p.healthMult;
    else if (d.sg === 'trad')   t *= p.tradDisc;
    if (d.mkt === 'main') t *= p.mainMult;
    if (d.os && d.os > 0) t *= (1 + p.osScale * Math.log1p(d.os) / 5);
    else t *= (1 + p.osScale * Math.log1p(15) / 5);
    const upsideRatio = (d.cincai - d.ipo) / d.ipo;
    t *= (1 + p.upsideScale * upsideRatio);
    return t;
}

function evaluate(data, p, label='') {
    let hits = 0, downsideErr = 0, upside = 0, totalAccuracy = 0;
    data.forEach(d => {
        const pred = applyModel(d.cincai, d, p);
        if (d.ath >= pred) hits++;
        else downsideErr++;
        if (d.ath >= pred) {
            upside += ((d.ath - pred) / pred) * 100; // upside missed above pred
        }
        totalAccuracy += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    const n = data.length;
    return {
        label,
        n,
        hitRate: (hits/n*100).toFixed(1),
        downErr: (downsideErr/n*100).toFixed(1),
        avgUpsideMissed: hits > 0 ? (upside/hits).toFixed(1) : 'N/A',
        overallAccuracy: (totalAccuracy/n*100).toFixed(2),
    };
}

// ─── EVALUATE V3 ON ALL DATA ──────────────────────────────────
console.log('\n\n═══════════════════════════════════════════════');
console.log('📈  V3 PARAMS — TESTED ON FULL DATASET');
console.log('═══════════════════════════════════════════════');

// Sifu baseline
let sifuHits = 0, sifuDE = 0, sifuUpside = 0, sifuAcc = 0;
active.forEach(d => {
    if (d.ath >= d.cincai) sifuHits++;
    else sifuDE++;
    if (d.ath >= d.cincai) sifuUpside += ((d.ath - d.cincai)/d.cincai)*100;
    sifuAcc += Math.min(d.cincai, d.ath) / Math.max(d.cincai, d.ath);
});
console.log(`\n🧠 SIFU BASELINE (${active.length} kaunter aktif):`);
console.log(`   Hit Rate:        ${(sifuHits/active.length*100).toFixed(1)}% (${sifuHits}/${active.length})`);
console.log(`   Downside Error:  ${(sifuDE/active.length*100).toFixed(1)}%`);
console.log(`   Overall Acc:     ${(sifuAcc/active.length*100).toFixed(2)}%`);
console.log(`   Avg Upside Missed: ${(sifuUpside/sifuHits).toFixed(1)}%`);

const v3Result = evaluate(active, v3Params, 'V3 Full Dataset');
console.log(`\n🤖 V3 MODEL (${active.length} kaunter aktif):`);
console.log(`   Hit Rate:        ${v3Result.hitRate}% (${Math.round(active.length*parseFloat(v3Result.hitRate)/100)}/${active.length})`);
console.log(`   Downside Error:  ${v3Result.downErr}%`);
console.log(`   Overall Acc:     ${v3Result.overallAccuracy}%`);
console.log(`   Avg Upside Missed: ${v3Result.avgUpsideMissed}%`);

// ─── NELDER-MEAD OPTIMIZER FOR V4 ────────────────────────────
console.log('\n\n═══════════════════════════════════════════════');
console.log('🚀  OPTIMIZING V4 ON FULL DATASET...');
console.log('═══════════════════════════════════════════════');

function objective(params) {
    const [themeMult, healthMult, tradDisc, mainMult, osScale, upsideScale] = params;
    const p = { themeMult, healthMult, tradDisc, mainMult, osScale, upsideScale };
    let downsideError = 0;
    let overallAcc = 0;
    active.forEach(d => {
        const pred = applyModel(d.cincai, d, p);
        if (d.ath < pred) downsideError += (pred - d.ath) / pred;
        overallAcc += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    // Minimize: downside error heavily penalized, maximize accuracy
    return (downsideError * 3) - (overallAcc / active.length);
}

// Nelder-Mead
function nelderMead(f, x0, maxIter=3000, tol=1e-7) {
    const n = x0.length;
    const alpha=1.0, gamma=2.0, rho=0.5, sigma=0.5;
    let simplex = [x0.slice()];
    for (let i = 0; i < n; i++) {
        const s = x0.slice();
        s[i] += (Math.abs(s[i]) > 0.01) ? s[i]*0.15 : 0.05;
        simplex.push(s);
    }
    let fvals = simplex.map(f);
    for (let iter = 0; iter < maxIter; iter++) {
        const idx = fvals.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);
        simplex = idx.map(([,i])=>simplex[i]);
        fvals = idx.map(([v])=>v);
        if (Math.max(...fvals) - Math.min(...fvals) < tol) break;
        const centroid = Array(n).fill(0);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j]/n;
        const xr = centroid.map((c,j)=>c+alpha*(c-simplex[n][j]));
        const fr = f(xr);
        if (fr < fvals[0]) {
            const xe = centroid.map((c,j)=>c+gamma*(xr[j]-c));
            const fe = f(xe);
            if (fe < fr) { simplex[n]=xe; fvals[n]=fe; }
            else { simplex[n]=xr; fvals[n]=fr; }
        } else if (fr < fvals[n-1]) {
            simplex[n]=xr; fvals[n]=fr;
        } else {
            const xc = centroid.map((c,j)=>c+rho*(simplex[n][j]-c));
            const fc = f(xc);
            if (fc < fvals[n]) { simplex[n]=xc; fvals[n]=fc; }
            else {
                for (let i = 1; i <= n; i++)
                    simplex[i] = simplex[0].map((v,j)=>v+sigma*(simplex[i][j]-v));
                fvals = simplex.map(f);
            }
        }
    }
    return { x: simplex[0], fx: fvals[0] };
}

// Multiple random restarts
let bestResult = null;
let bestFx = Infinity;
const starts = [
    [v3Params.themeMult, v3Params.healthMult, v3Params.tradDisc, v3Params.mainMult, v3Params.osScale, v3Params.upsideScale],
    [0.95, 0.95, 0.75, 1.02, -0.10, 0.07],
    [0.92, 0.90, 0.80, 1.03, -0.07, 0.05],
    [0.97, 0.96, 0.70, 1.01, -0.12, 0.08],
    [0.90, 0.92, 0.85, 1.00, -0.06, 0.10],
];

starts.forEach((s, i) => {
    process.stdout.write(`  Restart ${i+1}/${starts.length}...`);
    const res = nelderMead(objective, s);
    if (res.fx < bestFx) { bestFx = res.fx; bestResult = res; }
    process.stdout.write(` fx=${res.fx.toFixed(6)}\n`);
});

const [themeMult, healthMult, tradDisc, mainMult, osScale, upsideScale] = bestResult.x;
const v4Params = { themeMult, healthMult, tradDisc, mainMult, osScale, upsideScale };

const v4Result = evaluate(active, v4Params, 'V4 Optimized');
console.log(`\n🔥 V4 OPTIMIZED (${active.length} kaunter):`);
console.log(`   themeMult:  ${themeMult.toFixed(4)}`);
console.log(`   healthMult: ${healthMult.toFixed(4)}`);
console.log(`   tradDisc:   ${tradDisc.toFixed(4)}`);
console.log(`   mainMult:   ${mainMult.toFixed(4)}`);
console.log(`   osScale:    ${osScale.toFixed(4)}`);
console.log(`   upsideScale:${upsideScale.toFixed(4)}`);
console.log(`\n   Hit Rate:        ${v4Result.hitRate}% (${Math.round(active.length*parseFloat(v4Result.hitRate)/100)}/${active.length})`);
console.log(`   Downside Error:  ${v4Result.downErr}%`);
console.log(`   Overall Acc:     ${v4Result.overallAccuracy}%`);
console.log(`   Avg Upside Missed: ${v4Result.avgUpsideMissed}%`);

// ─── COMPARISON TABLE ─────────────────────────────────────────
console.log('\n\n═══════════════════════════════════════════════');
console.log('📊  HEAD-TO-HEAD COMPARISON');
console.log('═══════════════════════════════════════════════');
console.log(`${'Model'.padEnd(20)} ${'Hit Rate'.padEnd(12)} ${'Down Err'.padEnd(12)} ${'Overall Acc'.padEnd(14)} Dataset`);
console.log('-'.repeat(70));
console.log(`${'Sifu Baseline'.padEnd(20)} ${(sifuHits/active.length*100).toFixed(1)+'%'.padEnd(12)} ${(sifuDE/active.length*100).toFixed(1)+'%'.padEnd(12)} ${(sifuAcc/active.length*100).toFixed(2)+'%'.padEnd(14)} ${active.length} IPO`);
console.log(`${'V3 (55 IPO params)'.padEnd(20)} ${v3Result.hitRate+'%'.padEnd(12)} ${v3Result.downErr+'%'.padEnd(12)} ${v3Result.overallAccuracy+'%'.padEnd(14)} ${active.length} IPO`);
console.log(`${'V4 (Full dataset)'.padEnd(20)} ${v4Result.hitRate+'%'.padEnd(12)} ${v4Result.downErr+'%'.padEnd(12)} ${v4Result.overallAccuracy+'%'.padEnd(14)} ${active.length} IPO`);

// LOOCV for V4
console.log('\n\n═══════════════════════════════════════════════');
console.log('🧪  V4 LOOCV (Honest Cross-Validation)...');
console.log('═══════════════════════════════════════════════');
let loocvHits = 0;
for (let i = 0; i < active.length; i++) {
    const trainData = active.filter((_, j) => j !== i);
    const testD = active[i];
    // Quick optimize on train data
    const loocvRes = nelderMead(
        (params) => {
            const [tm, hm, td, mm, os, us] = params;
            const p = {themeMult:tm, healthMult:hm, tradDisc:td, mainMult:mm, osScale:os, upsideScale:us};
            let de = 0, acc = 0;
            trainData.forEach(d => {
                const pred = applyModel(d.cincai, d, p);
                if (d.ath < pred) de += (pred - d.ath)/pred;
                acc += Math.min(pred, d.ath)/Math.max(pred, d.ath);
            });
            return (de*3) - (acc/trainData.length);
        },
        [v4Params.themeMult, v4Params.healthMult, v4Params.tradDisc, v4Params.mainMult, v4Params.osScale, v4Params.upsideScale],
        500
    );
    const [tm,hm,td,mm,os,us] = loocvRes.x;
    const loocvP = {themeMult:tm, healthMult:hm, tradDisc:td, mainMult:mm, osScale:os, upsideScale:us};
    const pred = applyModel(testD.cincai, testD, loocvP);
    if (testD.ath >= pred) loocvHits++;
    if ((i+1) % 20 === 0) process.stdout.write(`  Done ${i+1}/${active.length}...\n`);
}
console.log(`\nV4 LOOCV Hit Rate: ${loocvHits}/${active.length} = ${(loocvHits/active.length*100).toFixed(1)}%`);

// Save V4 params
fs.writeFileSync('scratch/v4_params.json', JSON.stringify(v4Params, null, 2));
console.log('\n✅  V4 params saved to scratch/v4_params.json');
