/**
 * ============================================================
 * CK Optimizer V4+ — PE-AWARE EDITION
 * ============================================================
 * Upgrade dari V4:
 *  - Tambah PE sebagai feature langsung
 *  - PE rendah = pasaran re-rate lebih tinggi (growth premium)
 *  - PE tinggi = pasaran dah price-in, less upside
 *  - Target: Beat Sifu Overall Accuracy 74.11%
 * ============================================================
 */

const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// ─── BUILD DATASET ────────────────────────────────────────────
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
        return d.price > 0 &&
               d.sifuTargetPrice > 0 &&
               d.highPrice > 0 &&
               d.stage >= 5 &&
               d.pe && d.pe > 0; // PE is required for V4+
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
        pe:     d.pe,
        gd:     d.highPrice < d.price,
    }));

const active = dataset.filter(d => !d.gd);
const gd = dataset.filter(d => d.gd);

console.log(`\n📊 V4+ DATASET`);
console.log(`Total dengan PE data: ${dataset.length} | Gap-down: ${gd.length} | Aktif: ${active.length}`);

// PE distribution
const peValues = active.map(d => d.pe).sort((a,b)=>a-b);
const peMedian = peValues[Math.floor(peValues.length/2)];
const peMin = Math.min(...peValues);
const peMax = Math.max(...peValues);
console.log(`PE range: ${peMin.toFixed(1)}x – ${peMax.toFixed(1)}x | Median: ${peMedian.toFixed(1)}x`);

// ─── MODELS ──────────────────────────────────────────────────

// V3 original params
const v3P = { themeMult:0.9602, healthMult:0.9565, tradDisc:0.7343, mainMult:1.0220, osScale:-0.0855, upsideScale:0.0646 };

// V4 full-dataset params
const v4P = { themeMult:0.9654, healthMult:1.1956, tradDisc:0.8988, mainMult:0.9523, osScale:-0.1087, upsideScale:-0.0065 };

// ─── MODEL FUNCTIONS ──────────────────────────────────────────

function applyV3(d, p) {
    let t = d.cincai;
    if (d.sg === 'theme')  t *= p.themeMult;
    else if (d.sg === 'health') t *= p.healthMult;
    else if (d.sg === 'trad')   t *= p.tradDisc;
    if (d.mkt === 'main') t *= p.mainMult;
    t *= (1 + p.osScale * Math.log1p(d.os) / 5);
    const upsideRatio = (d.cincai - d.ipo) / d.ipo;
    t *= (1 + p.upsideScale * upsideRatio);
    return t;
}

// V4+ adds PE feature: low PE = re-rating premium
function applyV4Plus(d, p) {
    let t = d.cincai;

    // 1. Sector group
    if (d.sg === 'theme')  t *= p.themeMult;
    else if (d.sg === 'health') t *= p.healthMult;
    else if (d.sg === 'trad')   t *= p.tradDisc;

    // 2. Market
    if (d.mkt === 'main') t *= p.mainMult;

    // 3. OS influence (continuous log)
    t *= (1 + p.osScale * Math.log1p(d.os) / 5);

    // 4. Upside ratio
    const upsideRatio = (d.cincai - d.ipo) / d.ipo;
    t *= (1 + p.upsideScale * upsideRatio);

    // 5. PE feature — NEW in V4+
    // Low PE (cheap) = market tends to re-rate → higher ATH relative to CK
    // High PE (expensive) = already priced in → stays closer to CK
    // Normalize PE around sector median (~13x for ACE, ~18x for Main)
    const peMedianRef = d.mkt === 'main' ? 18 : 13;
    const peDeviation = (d.pe - peMedianRef) / peMedianRef; // negative = cheap, positive = expensive
    t *= (1 + p.peScale * peDeviation); // peScale < 0 means cheap PE → higher target

    return t;
}

// ─── EVALUATE ─────────────────────────────────────────────────
function evaluate(data, fn) {
    let hits = 0, deTotal = 0, accTotal = 0, upsideMissedTotal = 0, upsideHits = 0;
    data.forEach(d => {
        const pred = fn(d);
        if (d.ath >= pred) {
            hits++;
            upsideMissedTotal += ((d.ath - pred) / pred) * 100;
            upsideHits++;
        } else {
            deTotal += ((pred - d.ath) / pred);
        }
        accTotal += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    const n = data.length;
    return {
        n,
        hitRate: (hits/n*100).toFixed(1),
        hitN: hits,
        downErr: (deTotal/n*100).toFixed(2),
        overallAcc: (accTotal/n*100).toFixed(2),
        avgUpsideMissed: upsideHits > 0 ? (upsideMissedTotal/upsideHits).toFixed(1) : '0',
    };
}

// Sifu baseline
const sifuStats = (() => {
    let hits=0, de=0, acc=0, um=0, uh=0;
    active.forEach(d => {
        if (d.ath >= d.cincai) { hits++; um += ((d.ath-d.cincai)/d.cincai)*100; uh++; }
        else de += ((d.cincai-d.ath)/d.cincai);
        acc += Math.min(d.cincai, d.ath) / Math.max(d.cincai, d.ath);
    });
    return { n:active.length, hitRate:(hits/active.length*100).toFixed(1), hitN:hits, downErr:(de/active.length*100).toFixed(2), overallAcc:(acc/active.length*100).toFixed(2), avgUpsideMissed:(um/uh).toFixed(1) };
})();

// ─── NELDER-MEAD ──────────────────────────────────────────────
function nelderMead(f, x0, maxIter=4000, tol=1e-8) {
    const n = x0.length;
    const alpha=1.0, gamma=2.0, rho=0.5, sigma=0.5;
    let simplex = [x0.slice()];
    for (let i = 0; i < n; i++) {
        const s = x0.slice();
        s[i] += Math.abs(s[i]) > 0.01 ? s[i]*0.15 : 0.05;
        simplex.push(s);
    }
    let fvals = simplex.map(f);
    for (let iter = 0; iter < maxIter; iter++) {
        const idx = fvals.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);
        simplex = idx.map(([,i])=>simplex[i]);
        fvals = idx.map(([v])=>v);
        if (Math.max(...fvals) - Math.min(...fvals) < tol) break;
        const centroid = Array(n).fill(0);
        for (let i=0; i<n; i++) for (let j=0; j<n; j++) centroid[j] += simplex[i][j]/n;
        const xr = centroid.map((c,j)=>c+alpha*(c-simplex[n][j]));
        const fr = f(xr);
        if (fr < fvals[0]) {
            const xe = centroid.map((c,j)=>c+gamma*(xr[j]-c));
            f(xe) < fr ? (simplex[n]=xe,fvals[n]=f(xe)) : (simplex[n]=xr,fvals[n]=fr);
        } else if (fr < fvals[n-1]) { simplex[n]=xr; fvals[n]=fr; }
        else {
            const xc = centroid.map((c,j)=>c+rho*(simplex[n][j]-c));
            const fc = f(xc);
            if (fc < fvals[n]) { simplex[n]=xc; fvals[n]=fc; }
            else {
                for (let i=1;i<=n;i++) simplex[i]=simplex[0].map((v,j)=>v+sigma*(simplex[i][j]-v));
                fvals = simplex.map(f);
            }
        }
    }
    return { x: simplex[0], fx: fvals[0] };
}

// ─── OPTIMIZE V4+ ─────────────────────────────────────────────
console.log('\n\n🚀  OPTIMIZING V4+ (PE-Aware)...');

// Objective: minimize downside error heavily, maximize overall accuracy
function objective4Plus(params) {
    const [themeMult, healthMult, tradDisc, mainMult, osScale, upsideScale, peScale] = params;
    const p = {themeMult, healthMult, tradDisc, mainMult, osScale, upsideScale, peScale};
    let de = 0, acc = 0;
    active.forEach(d => {
        const pred = applyV4Plus(d, p);
        if (d.ath < pred) de += ((pred - d.ath) / pred);
        acc += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    // Penalize downside error 4x, maximize accuracy
    return (de * 4) - (acc / active.length);
}

const starts = [
    [v4P.themeMult, v4P.healthMult, v4P.tradDisc, v4P.mainMult, v4P.osScale, v4P.upsideScale, -0.05],
    [0.98, 1.10, 0.90, 0.97, -0.10, 0.02, -0.08],
    [0.95, 1.15, 0.85, 0.98, -0.12, -0.01, -0.03],
    [1.00, 1.20, 0.88, 0.95, -0.09, 0.00, -0.10],
    [0.96, 1.05, 0.92, 0.96, -0.11, -0.02, -0.06],
    [0.93, 1.25, 0.82, 1.00, -0.08, 0.01, -0.12],
];

let bestResult=null, bestFx=Infinity;
starts.forEach((s, i) => {
    process.stdout.write(`  Restart ${i+1}/${starts.length}...`);
    const res = nelderMead(objective4Plus, s);
    if (res.fx < bestFx) { bestFx=res.fx; bestResult=res; }
    process.stdout.write(` fx=${res.fx.toFixed(6)}\n`);
});

const [tm,hm,td,mm,os,us,pe] = bestResult.x;
const v4PlusParams = {themeMult:tm, healthMult:hm, tradDisc:td, mainMult:mm, osScale:os, upsideScale:us, peScale:pe};

// ─── RESULTS ──────────────────────────────────────────────────
const v3Stats  = evaluate(active, d => applyV3(d, v3P));
const v4Stats  = evaluate(active, d => applyV3(d, v4P)); // v4 uses same fn shape
const v4pStats = evaluate(active, d => applyV4Plus(d, v4PlusParams));

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('📊  FINAL HEAD-TO-HEAD (n=' + active.length + ' aktif IPO dengan PE data)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`${'Model'.padEnd(22)} ${'Hit Rate'.padEnd(12)} ${'Down Err'.padEnd(12)} ${'Overall Acc'.padEnd(14)} ${'Upside Missed'}`);
console.log('─'.repeat(75));

const printRow = (label, s) =>
    console.log(`${label.padEnd(22)} ${(s.hitRate+'%').padEnd(12)} ${(s.downErr+'%').padEnd(12)} ${(s.overallAcc+'%').padEnd(14)} ${s.avgUpsideMissed}%`);

printRow('Sifu Baseline', sifuStats);
printRow('V3 (55 IPO)', v3Stats);
printRow('V4 (137 IPO)', v4Stats);
printRow('V4+ (PE-Aware) 🔥', v4pStats);

// Beat Sifu?
const beatSifu = parseFloat(v4pStats.overallAcc) > parseFloat(sifuStats.overallAcc);
console.log(`\n${beatSifu ? '🏆 V4+ BEAT SIFU!' : '📉 V4+ belum beat Sifu Overall Acc'}`);
console.log(`   Sifu Overall Acc: ${sifuStats.overallAcc}%`);
console.log(`   V4+ Overall Acc:  ${v4pStats.overallAcc}%  (${beatSifu ? '+' : ''}${(parseFloat(v4pStats.overallAcc)-parseFloat(sifuStats.overallAcc)).toFixed(2)}%)`);

// V4+ params
console.log('\n📌 V4+ Optimized Params:');
Object.entries(v4PlusParams).forEach(([k,v]) => console.log(`   ${k.padEnd(14)}: ${v.toFixed(4)}`));
console.log(`   peScale logic: ${v4PlusParams.peScale < 0 ? '✅ Betul! PE rendah → target naik' : '⚠️ PE naik → target naik (unexpected)'}`);

// LOOCV honest score
console.log('\n\n🧪  V4+ LOOCV (Honest)...');
let loocvHits=0, loocvAcc=0;
for (let i=0; i<active.length; i++) {
    const train = active.filter((_,j)=>j!==i);
    const test = active[i];
    const res = nelderMead(
        params => {
            const [tm,hm,td,mm,os,us,pe] = params;
            const p = {themeMult:tm,healthMult:hm,tradDisc:td,mainMult:mm,osScale:os,upsideScale:us,peScale:pe};
            let de=0, acc=0;
            train.forEach(d => {
                const pred = applyV4Plus(d, p);
                if (d.ath < pred) de += (pred-d.ath)/pred;
                acc += Math.min(pred,d.ath)/Math.max(pred,d.ath);
            });
            return (de*4) - (acc/train.length);
        },
        [tm,hm,td,mm,os,us,pe],
        600
    );
    const [tm2,hm2,td2,mm2,os2,us2,pe2] = res.x;
    const loocvP = {themeMult:tm2,healthMult:hm2,tradDisc:td2,mainMult:mm2,osScale:os2,upsideScale:us2,peScale:pe2};
    const pred = applyV4Plus(test, loocvP);
    if (test.ath >= pred) loocvHits++;
    loocvAcc += Math.min(pred, test.ath) / Math.max(pred, test.ath);
    if ((i+1)%20===0) process.stdout.write(`  ${i+1}/${active.length} done...\n`);
}
console.log(`\nV4+ LOOCV Hit Rate:     ${loocvHits}/${active.length} = ${(loocvHits/active.length*100).toFixed(1)}%`);
console.log(`V4+ LOOCV Overall Acc:  ${(loocvAcc/active.length*100).toFixed(2)}%`);
console.log(`Sifu Overall Acc:       ${sifuStats.overallAcc}%`);
const loocvBeat = (loocvAcc/active.length*100) > parseFloat(sifuStats.overallAcc);
console.log(`\n${loocvBeat ? '🏆🏆 V4+ LOOCV BEAT SIFU! 🏆🏆' : '📊 Sifu masih unggul secara LOOCV'}`);

// Save
fs.writeFileSync('scratch/v4plus_params.json', JSON.stringify({...v4PlusParams, loocvHitRate: (loocvHits/active.length*100).toFixed(1), loocvOverallAcc: (loocvAcc/active.length*100).toFixed(2)}, null, 2));
console.log('\n✅  V4+ params saved to scratch/v4plus_params.json');
