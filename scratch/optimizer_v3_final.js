/**
 * ============================================================
 * CK Optimizer V3.0 — FINAL BOSS
 * ============================================================
 * Improvements over V2:
 *  1. Fewer parameters (7 vs 10) → less overfitting
 *  2. Continuous log(OS) scaling instead of binary buckets
 *  3. CincaiUpside ratio as feature (Sifu rule: <10% = avoid)
 *  4. Sector groups reduced to 3 (theme/healthcare/trad)
 *  5. Multiple random restarts for DE to escape local optima
 *  6. LOOCV built-in
 * ============================================================
 */

const dataset = [
    { name:"OGX Group",            sym:"OGX",       ipo:0.350, cincai:0.490, ath:0.490, sg:"trad",    mkt:"ace",  os:110.1, gd:false },
    { name:"Sunmed",               sym:"SUNMED",    ipo:1.450, cincai:1.840, ath:1.850, sg:"health",  mkt:"main", os:5.58,  gd:false },
    { name:"MM Computer Sys",      sym:"MMCS",      ipo:0.220, cincai:0.240, ath:0.235, sg:"theme",   mkt:"ace",  os:5,     gd:false },
    { name:"Powertechnic",         sym:"POWER",     ipo:0.350, cincai:0.410, ath:0.400, sg:"theme",   mkt:"ace",  os:20,    gd:false },
    { name:"PSP Energy",           sym:"PSP",       ipo:0.160, cincai:0.170, ath:0.165, sg:"trad",    mkt:"ace",  os:10.2,  gd:false },
    { name:"5E Resources",         sym:"5ER",       ipo:0.260, cincai:0.290, ath:0.300, sg:"trad",    mkt:"ace",  os:7,     gd:false },
    { name:"Topvision Eye",        sym:"TOPVISN",   ipo:0.330, cincai:0.410, ath:0.395, sg:"health",  mkt:"ace",  os:18.18, gd:false },
    { name:"EPB Group",            sym:"EPB",       ipo:0.560, cincai:0.710, ath:0.680, sg:"trad",    mkt:"ace",  os:16.07, gd:false },
    { name:"Verdant Solar",        sym:"VERDANT",   ipo:0.310, cincai:0.380, ath:0.400, sg:"theme",   mkt:"ace",  os:19.35, gd:false },
    { name:"Metro Healthcare",     sym:"METRO",     ipo:0.250, cincai:0.290, ath:0.275, sg:"health",  mkt:"ace",  os:2,     gd:false },
    { name:"Cropmate",             sym:"CRPMATE",   ipo:0.200, cincai:0.230, ath:0.245, sg:"theme",   mkt:"ace",  os:22.5,  gd:false },
    { name:"Express Power",        sym:"XPB",       ipo:0.200, cincai:0.250, ath:0.235, sg:"theme",   mkt:"ace",  os:7.5,   gd:false },
    { name:"MTT Shipping",         sym:"MTTSL",     ipo:1.030, cincai:1.160, ath:1.090, sg:"trad",    mkt:"main", os:2.7,   gd:false },
    { name:"Bus Cap",              sym:"BUSCAP",    ipo:0.230, cincai:0.320, ath:0.355, sg:"trad",    mkt:"ace",  os:15.0,  gd:false },
    { name:"Inspace Creation",     sym:"INSPACE",   ipo:0.250, cincai:0.320, ath:0.290, sg:"theme",   mkt:"ace",  os:70.3,  gd:false },
    { name:"BMS Holdings",         sym:"BMS",       ipo:0.220, cincai:0.240, ath:0.215, sg:"trad",    mkt:"ace",  os:11.36, gd:false },
    { name:"Hock Soon",            sym:"HOCKSOON",  ipo:0.600, cincai:0.630, ath:0.560, sg:"theme",   mkt:"main", os:12.5,  gd:true  },
    { name:"Camaroe",              sym:"CAMAROE",   ipo:0.140, cincai:0.140, ath:0.160, sg:"trad",    mkt:"ace",  os:14.29, gd:false },
    { name:"Northern Solar",       sym:"NORTHE",    ipo:0.630, cincai:0.830, ath:0.950, sg:"theme",   mkt:"ace",  os:73.2,  gd:false },
    { name:"BWYS Group",           sym:"BWYS",      ipo:0.220, cincai:0.310, ath:0.360, sg:"trad",    mkt:"ace",  os:45.45, gd:false },
    { name:"AquaWalk",             sym:"AQUAWALK",  ipo:0.310, cincai:0.370, ath:0.430, sg:"theme",   mkt:"ace",  os:22.58, gd:false },
    { name:"EI Power",             sym:"EIPOWER",   ipo:0.480, cincai:0.610, ath:0.710, sg:"theme",   mkt:"ace",  os:85,    gd:false },
    { name:"ISF Group",            sym:"ISF",       ipo:0.330, cincai:0.690, ath:0.600, sg:"trad",    mkt:"ace",  os:20,    gd:false },
    { name:"Greenergy",            sym:"GENERGY",   ipo:1.000, cincai:0.830, ath:1.000, sg:"theme",   mkt:"main", os:4.2,   gd:false },
    { name:"MSB",                  sym:"MSB",       ipo:0.200, cincai:0.200, ath:0.170, sg:"trad",    mkt:"ace",  os:15,    gd:true  },
    { name:"ES Sunlogy",           sym:"SUNLOGY",   ipo:0.300, cincai:0.400, ath:0.490, sg:"theme",   mkt:"ace",  os:1.67,  gd:false },
    { name:"AMS Advanced",         sym:"AMS",       ipo:0.290, cincai:0.330, ath:0.410, sg:"trad",    mkt:"ace",  os:9.03,  gd:false },
    { name:"Teamstar",             sym:"TEAMSTR",   ipo:0.260, cincai:0.320, ath:0.267, sg:"trad",    mkt:"ace",  os:35.2,  gd:false },
    { name:"Techstore",            sym:"TECHSTORE", ipo:0.200, cincai:0.280, ath:0.350, sg:"theme",   mkt:"ace",  os:27.5,  gd:false },
    { name:"One Gasmaster",        sym:"OGM",       ipo:0.250, cincai:0.300, ath:0.250, sg:"trad",    mkt:"ace",  os:20,    gd:true  },
    { name:"Crest Group",          sym:"CREST",     ipo:0.350, cincai:0.320, ath:0.400, sg:"theme",   mkt:"ace",  os:12.86, gd:false },
    { name:"Azam Jaya",            sym:"AZAMJAYA",  ipo:0.780, cincai:1.040, ath:1.320, sg:"trad",    mkt:"main", os:23,    gd:false },
    { name:"Eco-Shop",             sym:"ECOSHOP",   ipo:1.130, cincai:1.310, ath:1.680, sg:"theme",   mkt:"main", os:10.62, gd:false },
    { name:"Solar District",       sym:"SDCG",      ipo:0.380, cincai:0.540, ath:0.695, sg:"theme",   mkt:"ace",  os:31.58, gd:false },
    { name:"ICT Zone Asia",        sym:"ICTZONE",   ipo:0.200, cincai:0.220, ath:0.285, sg:"theme",   mkt:"ace",  os:12.0,  gd:false },
    { name:"Pantech",              sym:"PGLOBAL",   ipo:0.680, cincai:0.710, ath:0.575, sg:"trad",    mkt:"main", os:20,    gd:true  },
    { name:"Hi Mobility",          sym:"HI",        ipo:1.220, cincai:1.710, ath:2.270, sg:"theme",   mkt:"main", os:20,    gd:false },
    { name:"Keyfield Int",         sym:"KEYFIELD",  ipo:0.900, cincai:2.140, ath:2.850, sg:"theme",   mkt:"main", os:9.69,  gd:false },
    { name:"Well Chip",            sym:"WELLCHIP",  ipo:1.150, cincai:1.330, ath:1.830, sg:"trad",    mkt:"main", os:43.48, gd:false },
    { name:"Winstar Capital",      sym:"WINSTAR",   ipo:0.350, cincai:0.510, ath:0.715, sg:"trad",    mkt:"ace",  os:40,    gd:false },
    { name:"Supreme Consolidated", sym:"SUPREME",   ipo:0.250, cincai:0.290, ath:0.415, sg:"theme",   mkt:"ace",  os:48,    gd:false },
    { name:"Empire Premium",       sym:"EMPIRE",    ipo:0.700, cincai:0.830, ath:1.210, sg:"theme",   mkt:"main", os:23.3,  gd:false },
    { name:"JPG",                  sym:"JPG",       ipo:0.840, cincai:1.270, ath:1.900, sg:"trad",    mkt:"main", os:20,    gd:false },
    { name:"LAC Med",              sym:"LACMED",    ipo:0.750, cincai:0.830, ath:1.300, sg:"health",  mkt:"main", os:8.5,   gd:false },
    { name:"Geohan",               sym:"GEOHAN",    ipo:0.550, cincai:0.720, ath:0.525, sg:"trad",    mkt:"main", os:15,    gd:false },
    { name:"KTI Landmark",         sym:"KTI",       ipo:0.300, cincai:0.360, ath:0.580, sg:"trad",    mkt:"ace",  os:8.73,  gd:false },
    { name:"PMW International",    sym:"PMW",       ipo:0.340, cincai:0.490, ath:0.355, sg:"trad",    mkt:"ace",  os:9.8,   gd:false },
    { name:"Sumi",                 sym:"SUMI",      ipo:0.240, cincai:0.250, ath:0.180, sg:"trad",    mkt:"ace",  os:20,    gd:true  },
    { name:"Signature Alliance",   sym:"SAG",       ipo:0.620, cincai:0.880, ath:0.920, sg:"trad",    mkt:"ace",  os:20,    gd:false },
    { name:"Keeming",              sym:"KEEMING",   ipo:0.380, cincai:0.680, ath:1.250, sg:"trad",    mkt:"ace",  os:85.4,  gd:false },
    { name:"CBH Engineering",      sym:"CBHB",      ipo:0.280, cincai:0.380, ath:0.700, sg:"theme",   mkt:"ace",  os:20,    gd:false },
    { name:"Insights Analytics",   sym:"IAB",       ipo:0.360, cincai:0.710, ath:1.310, sg:"theme",   mkt:"ace",  os:11.5,  gd:false },
    { name:"Cheeding",             sym:"CHEEDING",  ipo:0.360, cincai:0.470, ath:0.920, sg:"theme",   mkt:"ace",  os:20,    gd:false },
    { name:"Life Water",           sym:"LWSABAH",   ipo:0.650, cincai:0.800, ath:1.600, sg:"theme",   mkt:"main", os:18.46, gd:false },
    { name:"SkyeChip",             sym:"SKYECHIP",  ipo:0.880, cincai:1.580, ath:3.800, sg:"theme",   mkt:"ace",  os:20,    gd:false },
    { name:"LSH Capital",          sym:"LSH",       ipo:0.880, cincai:1.050, ath:2.550, sg:"trad",    mkt:"ace",  os:20,    gd:false },
    { name:"Ambest",               sym:"AMBEST",    ipo:0.250, cincai:0.340, ath:0.870, sg:"trad",    mkt:"ace",  os:46.07, gd:false },
    { name:"Elridge Energy",       sym:"ELRIDGE",   ipo:0.290, cincai:0.550, ath:1.450, sg:"theme",   mkt:"ace",  os:17.24, gd:false },
    { name:"Oriental Kopi",        sym:"KOPI",      ipo:0.440, cincai:0.550, ath:1.580, sg:"theme",   mkt:"ace",  os:20,    gd:false },
    { name:"Pentech Holdings",     sym:"PENTECH",   ipo:0.200, cincai:0.330, ath:0.325, sg:"theme",   mkt:"ace",  os:1.5,   gd:false },
];

const activeData = dataset.filter(d => !d.gd);
const N = activeData.length;

// ─── V3 CALIBRATION (7 params, continuous features) ──────────────────────────
// Key insight: use FEWER params + continuous features → less overfitting
function applyV3(cincai, d, p) {
    let t = cincai;

    // 1. Sector group (3 groups: theme, health, trad)
    if      (d.sg === 'theme')  t *= p.themeMult;
    else if (d.sg === 'health') t *= p.healthMult;
    else if (d.sg === 'trad')   t *= p.tradDisc;
    // 'other' → no adjustment

    // 2. Market premium (Main vs ACE)
    if (d.mkt === 'main') t *= p.mainMult;

    // 3. Continuous OS influence: log(1 + OS) scaled
    //    Higher OS → slight boost/discount controlled by osScale
    //    osScale > 0 means higher OS = higher target
    //    osScale < 0 means higher OS = lower target (which makes sense for conservative model)
    t *= (1 + p.osScale * Math.log1p(d.os) / 5);

    // 4. Cincai-to-IPO upside ratio influence
    //    High upside (cincai >> ipo) = confident prediction → keep target
    //    Low upside (cincai ≈ ipo, <10%) = weak prediction → discount
    const upsideRatio = (d.cincai - d.ipo) / d.ipo; // e.g., 0.39 = 39% upside
    t *= (1 + p.upsideScale * upsideRatio);

    return t;
}

// ─── OBJECTIVE (Hit-Rate Dominant) ───────────────────────────────────────────
function score(p, data) {
    let hits = 0, overPen = 0, totalAbsErr = 0;
    const active = data.filter(d => !d.gd);
    const n = active.length;

    for (const d of active) {
        const cal = applyV3(d.cincai, d, p);
        if (d.ath >= cal) hits++;

        const err = (cal - d.ath) / d.ath;
        totalAbsErr += Math.abs(err);
        if (err > 0.10) overPen += (err - 0.10) * 4;
    }

    const hitRate = hits / n;
    const accuracy = 1 - totalAbsErr / n;

    // Hit rate 65%, accuracy 25%, overestimate penalty 10%
    return hitRate * 0.65 + accuracy * 0.25 - (overPen / n) * 0.10;
}

// ─── DE + NM OPTIMIZERS ──────────────────────────────────────────────────────
function de(fn, bounds, opts = {}) {
    const { popSize = 120, maxGen = 4000, F = 0.8, CR = 0.9 } = opts;
    const keys = Object.keys(bounds);
    const n = keys.length;
    const toObj = (v) => Object.fromEntries(keys.map((k, i) => [k, v[i]]));

    let pop = Array.from({ length: popSize }, () =>
        keys.map(k => bounds[k][0] + Math.random() * (bounds[k][1] - bounds[k][0]))
    );
    let scores = pop.map(v => fn(toObj(v)));

    for (let gen = 0; gen < maxGen; gen++) {
        for (let i = 0; i < popSize; i++) {
            let [a, b, c] = [i, i, i];
            while (a === i) a = Math.floor(Math.random() * popSize);
            while (b === i || b === a) b = Math.floor(Math.random() * popSize);
            while (c === i || c === a || c === b) c = Math.floor(Math.random() * popSize);

            const mutant = pop[a].map((v, j) => v + F * (pop[b][j] - pop[c][j]));
            const jRand = Math.floor(Math.random() * n);
            const trial = pop[i].map((v, j) => (j === jRand || Math.random() < CR) ? mutant[j] : v);
            const clipped = trial.map((v, j) => Math.max(bounds[keys[j]][0], Math.min(bounds[keys[j]][1], v)));

            const ts = fn(toObj(clipped));
            if (ts > scores[i]) { pop[i] = clipped; scores[i] = ts; }
        }
    }
    const bi = scores.indexOf(Math.max(...scores));
    return toObj(pop[bi]);
}

function nm(fn, init, opts = {}) {
    const { maxIter = 300000, tol = 1e-13 } = opts;
    const keys = Object.keys(init);
    const n = keys.length;
    const f = (p) => -fn(p);
    const toArr = (p) => keys.map(k => p[k]);
    const toObj = (a) => Object.fromEntries(keys.map((k, i) => [k, a[i]]));

    let sim = [toArr(init)];
    for (let i = 0; i < n; i++) {
        const v = [...toArr(init)]; v[i] += Math.abs(v[i]) > 0.01 ? v[i] * 0.10 : 0.03;
        sim.push(v);
    }
    let sc = sim.map(v => f(toObj(v)));

    for (let iter = 0; iter < maxIter; iter++) {
        const idx = sc.map((_, i) => i).sort((a, b) => sc[a] - sc[b]);
        sim = idx.map(i => sim[i]); sc = idx.map(i => sc[i]);
        if (sc[n] - sc[0] < tol) break;

        const cen = keys.map((_, ki) => sim.slice(0, n).reduce((s, v) => s + v[ki], 0) / n);
        const xr = cen.map((c, i) => c + (c - sim[n][i]));
        const fr = f(toObj(xr));

        if (fr < sc[0]) {
            const xe = cen.map((c, i) => c + 2 * (xr[i] - c));
            const fe = f(toObj(xe));
            sim[n] = fe < fr ? xe : xr; sc[n] = fe < fr ? fe : fr;
        } else if (fr < sc[n - 1]) {
            sim[n] = xr; sc[n] = fr;
        } else {
            const xc = cen.map((c, i) => c + 0.5 * (sim[n][i] - c));
            const fc = f(toObj(xc));
            if (fc < sc[n]) { sim[n] = xc; sc[n] = fc; }
            else { for (let i = 1; i <= n; i++) { sim[i] = sim[0].map((v, ki) => v + 0.5 * (sim[i][ki] - v)); sc[i] = f(toObj(sim[i])); } }
        }
    }
    const bi = sc.indexOf(Math.min(...sc));
    return toObj(sim[bi]);
}

// ─── BOUNDS (only 7 params!) ─────────────────────────────────────────────────
const bounds = {
    themeMult:    [0.70, 1.50],
    healthMult:   [0.60, 1.40],
    tradDisc:     [0.40, 1.10],
    mainMult:     [0.80, 1.50],
    osScale:      [-0.30, 0.20],
    upsideScale:  [-1.50, 1.00],
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   CK Optimizer V3.0 — FINAL BOSS (7 params, clean)        ║');
console.log('║   Continuous OS + CincaiUpside ratio + 3 sector groups     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Sifu baseline
const sifuP = { themeMult:1, healthMult:1, tradDisc:1, mainMult:1, osScale:0, upsideScale:0 };
let sifuHits = 0;
for (const d of activeData) { if (d.ath >= d.cincai) sifuHits++; }
console.log(`📌 Sifu Asal: Hit ${(sifuHits/N*100).toFixed(1)}% (${sifuHits}/${N})\n`);

// Multi-restart DE (3 restarts) to escape local optima
console.log('🌐 Running 3x DE restarts (120 pop × 4000 gen each)...');
let bestScore = -Infinity, bestP = null;
for (let r = 0; r < 3; r++) {
    const t0 = Date.now();
    const scoreAll = (p) => score(p, dataset);
    const deP = de(scoreAll, bounds, { popSize: 120, maxGen: 4000 });
    const nmP = nm(scoreAll, deP);
    const s = scoreAll(nmP);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    let h = 0;
    for (const d of activeData) { if (d.ath >= applyV3(d.cincai, d, nmP)) h++; }
    console.log(`  Restart ${r+1}: Score=${s.toFixed(6)} Hit=${(h/N*100).toFixed(1)}% (${elapsed}s)`);

    if (s > bestScore) { bestScore = s; bestP = nmP; }
}

// Count hits
let v3Hits = 0, totalAbsErr = 0, upsideSum = 0, upsideN = 0, downSum = 0, downN = 0;
let exceed20 = 0, exceed50 = 0;
for (const d of activeData) {
    const cal = applyV3(d.cincai, d, bestP);
    const hit = d.ath >= cal;
    const absErr = Math.abs((cal - d.ath) / d.ath);
    totalAbsErr += absErr;
    if (hit) {
        v3Hits++;
        const up = (d.ath - cal) / cal;
        upsideSum += up; upsideN++;
        if (d.ath >= cal * 1.2) exceed20++;
        if (d.ath >= cal * 1.5) exceed50++;
    } else {
        downSum += (cal - d.ath) / d.ath; downN++;
    }
}
const v3Acc = ((1 - totalAbsErr / N) * 100);

console.log('\n' + '═'.repeat(80));
console.log('📊 HEAD-TO-HEAD FINAL: SIFU vs V3');
console.log('═'.repeat(80));

const rows = [
    ['Total IPO (excl gap-down)', N, N],
    ['✅ Hit Rate', `${(sifuHits/N*100).toFixed(1)}%`, `${(v3Hits/N*100).toFixed(1)}%`],
    ['Bilangan Capai', `${sifuHits}/${N}`, `${v3Hits}/${N}`],
    ['Overall Accuracy', '76.39%', `${v3Acc.toFixed(2)}%`],
    ['Downside Error', '13.0%', downN > 0 ? `${(downSum/downN*100).toFixed(1)}%` : '0.0%'],
    ['Upside Missed', '50.6%', upsideN > 0 ? `${(upsideSum/upsideN*100).toFixed(1)}%` : '0.0%'],
    ['Exceed >20%', '50.9%', `${(exceed20/N*100).toFixed(1)}%`],
    ['Exceed >50%', '21.8%', `${(exceed50/N*100).toFixed(1)}%`],
];

console.log(`${'Metrik'.padEnd(30)} | ${'📌 Sifu'.padEnd(14)} | ${'🏆 V3 Final'.padEnd(14)}`);
console.log('─'.repeat(62));
for (const [l, s, v] of rows) console.log(`${l.padEnd(30)} | ${String(s).padEnd(14)} | ${String(v).padEnd(14)}`);

// Parameters
console.log('\n' + '═'.repeat(80));
console.log('🔧 V3 PARAMETERS:');
console.log('═'.repeat(80));
const pLabels = {
    themeMult: 'Theme (Tech/Energy/Consumer)',
    healthMult: 'Healthcare',
    tradDisc: 'Trad ACE (Industrial/Const)',
    mainMult: 'Main Market Multiplier',
    osScale: 'OS Log-Scale Factor',
    upsideScale: 'CincaiUpside Ratio Factor',
};
for (const [k, label] of Object.entries(pLabels)) {
    if (bestP[k] !== undefined) {
        const v = bestP[k];
        console.log(`  ${label.padEnd(32)} = ${v.toFixed(4)}`);
    }
}

// Changed kaunters
console.log('\n🔄 KAUNTER BERUBAH STATUS:');
let imp = 0, wor = 0;
for (const d of activeData) {
    const sH = d.ath >= d.cincai;
    const vH = d.ath >= applyV3(d.cincai, d, bestP);
    if (sH !== vH) {
        const st = !sH && vH ? '✅ Miss→Hit' : '❌ Hit→Miss';
        if (!sH && vH) imp++; else wor++;
        console.log(`  ${d.sym.padEnd(10)} | Sifu RM${d.cincai.toFixed(3)} → V3 RM${applyV3(d.cincai, d, bestP).toFixed(3)} vs ATH RM${d.ath.toFixed(3)} | ${st}`);
    }
}
console.log(`  🟢 +${imp} improved | 🔴 -${wor} worsened | 📈 Net: ${imp-wor >= 0 ? '+' : ''}${imp-wor}`);

// ─── LOOCV ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(80));
console.log('🔬 LEAVE-ONE-OUT CROSS-VALIDATION (55 folds)...');
console.log('═'.repeat(80));

let loocvHits = 0;
for (let i = 0; i < activeData.length; i++) {
    const test = activeData[i];
    const train = dataset.filter(d => d !== test);

    const trainScore = (p) => score(p, train);
    const deP = de(trainScore, bounds, { popSize: 50, maxGen: 800 });
    const nmP = nm(trainScore, deP, { maxIter: 50000 });

    const cal = applyV3(test.cincai, test, nmP);
    if (test.ath >= cal) loocvHits++;

    if ((i + 1) % 10 === 0 || i === activeData.length - 1) {
        console.log(`  Fold ${i+1}/${N} — Running: ${(loocvHits/(i+1)*100).toFixed(1)}%`);
    }
}

console.log(`\n${'═'.repeat(80)}`);
console.log(`🏆 KEPUTUSAN FINAL V3:`);
console.log(`   In-Sample Hit Rate:  ${v3Hits}/${N} = ${(v3Hits/N*100).toFixed(1)}%`);
console.log(`   LOOCV Hit Rate:      ${loocvHits}/${N} = ${(loocvHits/N*100).toFixed(1)}%  ← HONEST SCORE`);
console.log(`   Sifu Baseline:       ${sifuHits}/${N} = ${(sifuHits/N*100).toFixed(1)}%`);
console.log(`   V3 vs Sifu:          ${loocvHits > sifuHits ? '🏆 V3 MENANG' : loocvHits === sifuHits ? '🟡 SERI' : '🔴 Sifu menang'} (+${loocvHits - sifuHits} kaunter)`);
console.log(`${'═'.repeat(80)}`);

// Export
console.log('\n📋 COPY PARAMS:');
console.log('const v3Params = {');
for (const [k, v] of Object.entries(bestP)) {
    console.log(`    ${k}: ${v.toFixed(4)},  // ${pLabels[k] || k}`);
}
console.log('};');
