/**
 * ============================================================
 * CK Optimizer V2.0 — CLEAN MODEL (No Data Leakage)
 * ============================================================
 * FIXES:
 *  1. NO ATH-based features (momentum removed) — only pre-listing data
 *  2. Standardized sector grouping
 *  3. Leave-One-Out Cross-Validation (LOOCV)
 *  4. Hit-rate-prioritized objective function
 *  5. Dual-zone targeting (Safe TP + Bull TP)
 * ============================================================
 */

// ─── CLEAN 60 IPO DATASET ────────────────────────────────────────────────────
// Sector groups standardized:
//   'theme_tech'    = tech, semicon, data, IT
//   'theme_energy'  = energy, solar, utilities, RE
//   'theme_consumer'= consumer, F&B, retail
//   'healthcare'    = healthcare, medical
//   'plantation'    = plantation, agri
//   'trad_ace'      = industrial, construction, property, boring ACE
//   'other'         = transport, financial, misc
//
// Features used: sector_group, market, os, ipoPrice, openedGapDown
// TARGET: ath (All-Time High)
// NO ATH-derived features allowed!

const dataset = [
    { name: "OGX Group",             sym: "OGX",       ipo: 0.350, cincai: 0.490, ath: 0.490, sg: "trad_ace",       mkt: "ace",  os: 110.1, gapDown: false },
    { name: "Sunmed",                sym: "SUNMED",    ipo: 1.450, cincai: 1.840, ath: 1.850, sg: "healthcare",     mkt: "main", os: 5.58,  gapDown: false },
    { name: "MM Computer Sys",       sym: "MMCS",      ipo: 0.220, cincai: 0.240, ath: 0.235, sg: "theme_tech",     mkt: "ace",  os: 5,     gapDown: false },
    { name: "Powertechnic",          sym: "POWER",     ipo: 0.350, cincai: 0.410, ath: 0.400, sg: "theme_energy",   mkt: "ace",  os: 20,    gapDown: false },
    { name: "PSP Energy",            sym: "PSP",       ipo: 0.160, cincai: 0.170, ath: 0.165, sg: "trad_ace",       mkt: "ace",  os: 10.2,  gapDown: false },
    { name: "5E Resources",          sym: "5ER",       ipo: 0.260, cincai: 0.290, ath: 0.300, sg: "trad_ace",       mkt: "ace",  os: 7,     gapDown: false },
    { name: "Topvision Eye",         sym: "TOPVISN",   ipo: 0.330, cincai: 0.410, ath: 0.395, sg: "healthcare",     mkt: "ace",  os: 18.18, gapDown: false },
    { name: "EPB Group",             sym: "EPB",       ipo: 0.560, cincai: 0.710, ath: 0.680, sg: "trad_ace",       mkt: "ace",  os: 16.07, gapDown: false },
    { name: "Verdant Solar",         sym: "VERDANT",   ipo: 0.310, cincai: 0.380, ath: 0.400, sg: "theme_energy",   mkt: "ace",  os: 19.35, gapDown: false },
    { name: "Metro Healthcare",      sym: "METRO",     ipo: 0.250, cincai: 0.290, ath: 0.275, sg: "healthcare",     mkt: "ace",  os: 2,     gapDown: false },
    { name: "Cropmate",              sym: "CRPMATE",   ipo: 0.200, cincai: 0.230, ath: 0.245, sg: "theme_consumer", mkt: "ace",  os: 22.5,  gapDown: false },
    { name: "Express Power",         sym: "XPB",       ipo: 0.200, cincai: 0.250, ath: 0.235, sg: "theme_energy",   mkt: "ace",  os: 7.5,   gapDown: false },
    { name: "MTT Shipping",          sym: "MTTSL",     ipo: 1.030, cincai: 1.160, ath: 1.090, sg: "other",          mkt: "main", os: 2.7,   gapDown: false },
    { name: "Bus Cap",               sym: "BUSCAP",    ipo: 0.230, cincai: 0.320, ath: 0.355, sg: "trad_ace",       mkt: "ace",  os: 15.0,  gapDown: false },
    { name: "Inspace Creation",      sym: "INSPACE",   ipo: 0.250, cincai: 0.320, ath: 0.290, sg: "theme_tech",     mkt: "ace",  os: 70.3,  gapDown: false },
    { name: "BMS Holdings",          sym: "BMS",       ipo: 0.220, cincai: 0.240, ath: 0.215, sg: "trad_ace",       mkt: "ace",  os: 11.36, gapDown: false },
    { name: "Hock Soon",             sym: "HOCKSOON",  ipo: 0.600, cincai: 0.630, ath: 0.560, sg: "theme_consumer", mkt: "main", os: 12.5,  gapDown: true  },
    { name: "Camaroe",               sym: "CAMAROE",   ipo: 0.140, cincai: 0.140, ath: 0.160, sg: "trad_ace",       mkt: "ace",  os: 14.29, gapDown: false },
    { name: "Northern Solar",        sym: "NORTHE",    ipo: 0.630, cincai: 0.830, ath: 0.950, sg: "theme_energy",   mkt: "ace",  os: 73.2,  gapDown: false },
    { name: "BWYS Group",            sym: "BWYS",      ipo: 0.220, cincai: 0.310, ath: 0.360, sg: "trad_ace",       mkt: "ace",  os: 45.45, gapDown: false },
    { name: "AquaWalk",              sym: "AQUAWALK",  ipo: 0.310, cincai: 0.370, ath: 0.430, sg: "theme_consumer", mkt: "ace",  os: 22.58, gapDown: false },
    { name: "EI Power",              sym: "EIPOWER",   ipo: 0.480, cincai: 0.610, ath: 0.710, sg: "theme_energy",   mkt: "ace",  os: 85,    gapDown: false },
    { name: "ISF Group",             sym: "ISF",       ipo: 0.330, cincai: 0.690, ath: 0.600, sg: "trad_ace",       mkt: "ace",  os: 20,    gapDown: false },
    { name: "Greenergy",             sym: "GENERGY",   ipo: 1.000, cincai: 0.830, ath: 1.000, sg: "theme_energy",   mkt: "main", os: 4.2,   gapDown: false },
    { name: "MSB",                   sym: "MSB",       ipo: 0.200, cincai: 0.200, ath: 0.170, sg: "trad_ace",       mkt: "ace",  os: 15,    gapDown: true  },
    { name: "ES Sunlogy",            sym: "SUNLOGY",   ipo: 0.300, cincai: 0.400, ath: 0.490, sg: "theme_energy",   mkt: "ace",  os: 1.67,  gapDown: false },
    { name: "AMS Advanced",          sym: "AMS",       ipo: 0.290, cincai: 0.330, ath: 0.410, sg: "trad_ace",       mkt: "ace",  os: 9.03,  gapDown: false },
    { name: "Teamstar",              sym: "TEAMSTR",   ipo: 0.260, cincai: 0.320, ath: 0.267, sg: "trad_ace",       mkt: "ace",  os: 35.2,  gapDown: false },
    { name: "Techstore",             sym: "TECHSTORE", ipo: 0.200, cincai: 0.280, ath: 0.350, sg: "theme_tech",     mkt: "ace",  os: 27.5,  gapDown: false },
    { name: "One Gasmaster",         sym: "OGM",       ipo: 0.250, cincai: 0.300, ath: 0.250, sg: "trad_ace",       mkt: "ace",  os: 20,    gapDown: true  },
    { name: "Crest Group",           sym: "CREST",     ipo: 0.350, cincai: 0.320, ath: 0.400, sg: "theme_tech",     mkt: "ace",  os: 12.86, gapDown: false },
    { name: "Azam Jaya",             sym: "AZAMJAYA",  ipo: 0.780, cincai: 1.040, ath: 1.320, sg: "trad_ace",       mkt: "main", os: 23,    gapDown: false },
    { name: "Eco-Shop",              sym: "ECOSHOP",   ipo: 1.130, cincai: 1.310, ath: 1.680, sg: "theme_consumer", mkt: "main", os: 10.62, gapDown: false },
    { name: "Solar District",        sym: "SDCG",      ipo: 0.380, cincai: 0.540, ath: 0.695, sg: "theme_energy",   mkt: "ace",  os: 31.58, gapDown: false },
    { name: "ICT Zone Asia",         sym: "ICTZONE",   ipo: 0.200, cincai: 0.220, ath: 0.285, sg: "theme_tech",     mkt: "ace",  os: 12.0,  gapDown: false },
    { name: "Pantech",               sym: "PGLOBAL",   ipo: 0.680, cincai: 0.710, ath: 0.575, sg: "trad_ace",       mkt: "main", os: 20,    gapDown: true  },
    { name: "Hi Mobility",           sym: "HI",        ipo: 1.220, cincai: 1.710, ath: 2.270, sg: "theme_tech",     mkt: "main", os: 20,    gapDown: false },
    { name: "Keyfield Int",          sym: "KEYFIELD",  ipo: 0.900, cincai: 2.140, ath: 2.850, sg: "theme_energy",   mkt: "main", os: 9.69,  gapDown: false },
    { name: "Well Chip",             sym: "WELLCHIP",  ipo: 1.150, cincai: 1.330, ath: 1.830, sg: "other",          mkt: "main", os: 43.48, gapDown: false },
    { name: "Winstar Capital",       sym: "WINSTAR",   ipo: 0.350, cincai: 0.510, ath: 0.715, sg: "trad_ace",       mkt: "ace",  os: 40,    gapDown: false },
    { name: "Supreme Consolidated",  sym: "SUPREME",   ipo: 0.250, cincai: 0.290, ath: 0.415, sg: "theme_consumer", mkt: "ace",  os: 48,    gapDown: false },
    { name: "Empire Premium",        sym: "EMPIRE",    ipo: 0.700, cincai: 0.830, ath: 1.210, sg: "theme_consumer", mkt: "main", os: 23.3,  gapDown: false },
    { name: "JPG",                   sym: "JPG",       ipo: 0.840, cincai: 1.270, ath: 1.900, sg: "plantation",     mkt: "main", os: 20,    gapDown: false },
    { name: "LAC Med",               sym: "LACMED",    ipo: 0.750, cincai: 0.830, ath: 1.300, sg: "healthcare",     mkt: "main", os: 8.5,   gapDown: false },
    { name: "Geohan",                sym: "GEOHAN",    ipo: 0.550, cincai: 0.720, ath: 0.525, sg: "trad_ace",       mkt: "main", os: 15,    gapDown: false },
    { name: "KTI Landmark",          sym: "KTI",       ipo: 0.300, cincai: 0.360, ath: 0.580, sg: "trad_ace",       mkt: "ace",  os: 8.73,  gapDown: false },
    { name: "PMW International",     sym: "PMW",       ipo: 0.340, cincai: 0.490, ath: 0.355, sg: "trad_ace",       mkt: "ace",  os: 9.8,   gapDown: false },
    { name: "Sumi",                  sym: "SUMI",      ipo: 0.240, cincai: 0.250, ath: 0.180, sg: "trad_ace",       mkt: "ace",  os: 20,    gapDown: true  },
    { name: "Signature Alliance",    sym: "SAG",       ipo: 0.620, cincai: 1.290, ath: 0.920, sg: "trad_ace",       mkt: "ace",  os: 20,    gapDown: false },
    { name: "Keeming",               sym: "KEEMING",   ipo: 0.380, cincai: 0.680, ath: 1.250, sg: "trad_ace",       mkt: "ace",  os: 85.4,  gapDown: false },
    { name: "CBH Engineering",       sym: "CBHB",      ipo: 0.280, cincai: 0.380, ath: 0.700, sg: "theme_tech",    mkt: "ace",  os: 20,    gapDown: false },
    { name: "Insights Analytics",    sym: "IAB",       ipo: 0.360, cincai: 0.710, ath: 1.310, sg: "theme_tech",    mkt: "ace",  os: 11.5,  gapDown: false },
    { name: "Cheeding",              sym: "CHEEDING",  ipo: 0.360, cincai: 0.470, ath: 0.920, sg: "theme_energy",  mkt: "ace",  os: 20,    gapDown: false },
    { name: "Life Water",            sym: "LWSABAH",   ipo: 0.650, cincai: 0.800, ath: 1.600, sg: "theme_consumer", mkt: "main", os: 18.46, gapDown: false },
    { name: "SkyeChip",              sym: "SKYECHIP",  ipo: 0.880, cincai: 1.580, ath: 3.800, sg: "theme_tech",    mkt: "ace",  os: 20,    gapDown: false },
    { name: "LSH Capital",           sym: "LSH",       ipo: 0.880, cincai: 1.050, ath: 2.550, sg: "trad_ace",      mkt: "ace",  os: 20,    gapDown: false },
    { name: "Ambest",                sym: "AMBEST",    ipo: 0.250, cincai: 0.340, ath: 0.870, sg: "trad_ace",      mkt: "ace",  os: 46.07, gapDown: false },
    { name: "Elridge Energy",        sym: "ELRIDGE",   ipo: 0.290, cincai: 0.550, ath: 1.450, sg: "theme_energy",  mkt: "ace",  os: 17.24, gapDown: false },
    { name: "Oriental Kopi",         sym: "KOPI",      ipo: 0.440, cincai: 0.550, ath: 1.580, sg: "theme_consumer", mkt: "ace",  os: 20,    gapDown: false },
    { name: "Pentech Holdings",      sym: "PENTECH",   ipo: 0.200, cincai: 0.330, ath: 0.325, sg: "theme_tech",   mkt: "ace",  os: 1.5,   gapDown: false },
];

const N = dataset.length;

// ─── APPLY CALIBRATION (CLEAN — NO ATH FEATURES) ─────────────────────────────
// Parameters:
//   techMult, energyMult, consumerMult, healthMult, plantMult
//   mainMktMult, tradAceDisc
//   osHighMult (OS >= 40), osLowDisc (OS < 5)
//   lowPriceBonus (IPO < 0.30)
//   gapDownSkip (if true, gap-down kaunters are skipped)
function applyV2(cincai, d, p) {
    let t = cincai;

    // Sector group multiplier
    if      (d.sg === 'theme_tech')     t *= p.techMult;
    else if (d.sg === 'theme_energy')   t *= p.energyMult;
    else if (d.sg === 'theme_consumer') t *= p.consumerMult;
    else if (d.sg === 'healthcare')     t *= p.healthMult;
    else if (d.sg === 'plantation')     t *= p.plantMult;
    else if (d.sg === 'trad_ace')       t *= p.tradAceDisc;
    // 'other' gets no adjustment (mult = 1.0)

    // Market premium
    if (d.mkt === 'main') t *= p.mainMktMult;

    // OS-based adjustments (only uses pre-listing data)
    if (d.os >= 40)      t *= p.osHighMult;
    else if (d.os < 5)   t *= p.osLowDisc;

    // Low price bonus (small cap IPOs tend to spike more %)
    if (d.ipo < 0.30)    t *= p.lowPriceBonus;

    return t;
}

// ─── OBJECTIVE FUNCTION (Hit-Rate Prioritized) ───────────────────────────────
function score(p, data) {
    let hits = 0, rmse = 0, overPen = 0;
    const n = data.length;

    for (const d of data) {
        if (d.gapDown) continue; // Skip gap-down IPOs
        const cal = applyV2(d.cincai, d, p);
        const hit = d.ath >= cal;
        if (hit) hits++;

        const err = (cal - d.ath) / d.ath;
        rmse += err * err;
        // Heavy penalty for overestimate (target too high = false hope)
        if (err > 0.15) overPen += (err - 0.15) * 3;
    }

    const active = data.filter(d => !d.gapDown).length;
    const hitRate = hits / active;
    const rmsePen = Math.sqrt(rmse / active);

    // Hit rate is king (60%), then error minimisation (30%), then overestimate penalty (10%)
    return hitRate * 0.60 - rmsePen * 0.30 - (overPen / active) * 0.10;
}

// ─── DIFFERENTIAL EVOLUTION ──────────────────────────────────────────────────
function differentialEvolution(fn, bounds, opts = {}) {
    const { popSize = 100, maxGen = 3000, F = 0.8, CR = 0.9 } = opts;
    const keys = Object.keys(bounds);
    const n = keys.length;
    const toObj = (v) => Object.fromEntries(keys.map((k, i) => [k, v[i]]));

    let pop = Array.from({ length: popSize }, () =>
        keys.map(k => bounds[k][0] + Math.random() * (bounds[k][1] - bounds[k][0]))
    );
    let scores = pop.map(v => fn(toObj(v)));

    for (let gen = 0; gen < maxGen; gen++) {
        for (let i = 0; i < popSize; i++) {
            let [a, b, c] = [0, 0, 0];
            while (a === i) a = Math.floor(Math.random() * popSize);
            while (b === i || b === a) b = Math.floor(Math.random() * popSize);
            while (c === i || c === a || c === b) c = Math.floor(Math.random() * popSize);

            const mutant = pop[a].map((v, j) => v + F * (pop[b][j] - pop[c][j]));
            const jRand = Math.floor(Math.random() * n);
            const trial = pop[i].map((v, j) =>
                (j === jRand || Math.random() < CR) ? mutant[j] : v
            );
            const clipped = trial.map((v, j) =>
                Math.max(bounds[keys[j]][0], Math.min(bounds[keys[j]][1], v))
            );

            const trialScore = fn(toObj(clipped));
            if (trialScore > scores[i]) {
                pop[i] = clipped;
                scores[i] = trialScore;
            }
        }
    }

    const bestIdx = scores.indexOf(Math.max(...scores));
    return toObj(pop[bestIdx]);
}

// ─── NELDER-MEAD SIMPLEX ────────────────────────────────────────────────────
function nelderMead(fn, init, opts = {}) {
    const { maxIter = 200000, tol = 1e-12, a = 1, g = 2, r = 0.5, s = 0.5 } = opts;
    const keys = Object.keys(init);
    const n = keys.length;
    const f = (p) => -fn(p);
    const toArr = (p) => keys.map(k => p[k]);
    const toObj = (a) => Object.fromEntries(keys.map((k, i) => [k, a[i]]));

    let sim = [toArr(init)];
    for (let i = 0; i < n; i++) {
        const v = [...toArr(init)];
        v[i] += Math.abs(v[i]) > 0.01 ? v[i] * 0.12 : 0.05;
        sim.push(v);
    }
    let sc = sim.map(v => f(toObj(v)));

    for (let iter = 0; iter < maxIter; iter++) {
        const idx = sc.map((_, i) => i).sort((a, b) => sc[a] - sc[b]);
        sim = idx.map(i => sim[i]); sc = idx.map(i => sc[i]);
        if (sc[n] - sc[0] < tol) break;

        const cen = keys.map((_, ki) => sim.slice(0, n).reduce((s, v) => s + v[ki], 0) / n);
        const xr = cen.map((c, i) => c + a * (c - sim[n][i]));
        const fr = f(toObj(xr));

        if (fr < sc[0]) {
            const xe = cen.map((c, i) => c + g * (xr[i] - c));
            const fe = f(toObj(xe));
            sim[n] = fe < fr ? xe : xr; sc[n] = fe < fr ? fe : fr;
        } else if (fr < sc[n - 1]) {
            sim[n] = xr; sc[n] = fr;
        } else {
            const xc = cen.map((c, i) => c + r * (sim[n][i] - c));
            const fc = f(toObj(xc));
            if (fc < sc[n]) { sim[n] = xc; sc[n] = fc; }
            else {
                for (let i = 1; i <= n; i++) {
                    sim[i] = sim[0].map((v, ki) => v + s * (sim[i][ki] - v));
                    sc[i] = f(toObj(sim[i]));
                }
            }
        }
    }
    const bi = sc.indexOf(Math.min(...sc));
    return toObj(sim[bi]);
}

// ─── LEAVE-ONE-OUT CROSS-VALIDATION ──────────────────────────────────────────
function loocv(bounds) {
    const activeData = dataset.filter(d => !d.gapDown);
    let totalHits = 0;
    let totalActive = activeData.length;

    console.log(`\n🔬 Running LOOCV (${totalActive} folds)...`);

    for (let i = 0; i < activeData.length; i++) {
        const testIPO = activeData[i];
        const trainSet = activeData.filter((_, j) => j !== i);

        // Quick DE optimization on train set (reduced iterations for speed)
        const trainScore = (p) => score(p, trainSet);
        const deResult = differentialEvolution(trainScore, bounds, { popSize: 40, maxGen: 500 });
        const nmResult = nelderMead(trainScore, deResult, { maxIter: 50000 });

        // Test on held-out IPO
        const cal = applyV2(testIPO.cincai, testIPO, nmResult);
        const hit = testIPO.ath >= cal;
        if (hit) totalHits++;

        if ((i + 1) % 10 === 0) {
            process.stdout.write(`  Fold ${i + 1}/${totalActive} — Running hit rate: ${(totalHits / (i + 1) * 100).toFixed(1)}%\n`);
        }
    }

    const loocvHitRate = (totalHits / totalActive * 100);
    return { hits: totalHits, total: totalActive, hitRate: loocvHitRate };
}

// ─── COMPUTE FULL STATS ──────────────────────────────────────────────────────
function fullStats(params, data, label) {
    const active = data.filter(d => !d.gapDown);
    let hits = 0, totalAbsErr = 0, upsideSum = 0, upsideN = 0, downSum = 0, downN = 0;
    let exceed20 = 0, exceed50 = 0;

    for (const d of active) {
        const cal = applyV2(d.cincai, d, params);
        const hit = d.ath >= cal;
        const absErr = Math.abs((cal - d.ath) / d.ath);
        totalAbsErr += absErr;

        if (hit) {
            hits++;
            const upside = (d.ath - cal) / cal;
            upsideSum += upside; upsideN++;
            if (d.ath >= cal * 1.2) exceed20++;
            if (d.ath >= cal * 1.5) exceed50++;
        } else {
            const down = (cal - d.ath) / d.ath;
            downSum += down; downN++;
        }
    }

    const n = active.length;
    return {
        label,
        total: n,
        hits, misses: n - hits,
        hitRate: (hits / n * 100).toFixed(1),
        accuracy: ((1 - totalAbsErr / n) * 100).toFixed(2),
        avgUpside: upsideN > 0 ? (upsideSum / upsideN * 100).toFixed(1) : '0.0',
        avgDownside: downN > 0 ? (downSum / downN * 100).toFixed(1) : '0.0',
        exceed20: (exceed20 / n * 100).toFixed(1),
        exceed50: (exceed50 / n * 100).toFixed(1),
    };
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   CK Optimizer V2.0 — CLEAN MODEL (No Data Leakage)       ║');
console.log('║   Features: Sector + Market + OS + IPO Price (pre-listing) ║');
console.log('║   Objective: Hit-Rate Prioritized (60% weight)             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const bounds = {
    techMult:      [0.80, 1.80],
    energyMult:    [0.80, 1.80],
    consumerMult:  [0.80, 1.80],
    healthMult:    [0.80, 1.50],
    plantMult:     [0.80, 1.80],
    tradAceDisc:   [0.50, 1.10],
    mainMktMult:   [0.85, 1.40],
    osHighMult:    [0.60, 1.30],
    osLowDisc:     [0.60, 1.20],
    lowPriceBonus: [0.80, 1.50],
};

// Sifu baseline stats (no calibration)
const sifuParams = {
    techMult: 1, energyMult: 1, consumerMult: 1, healthMult: 1, plantMult: 1,
    tradAceDisc: 1, mainMktMult: 1, osHighMult: 1, osLowDisc: 1, lowPriceBonus: 1,
};
const sifuStats = fullStats(sifuParams, dataset, '📌 Sifu Asal');
console.log(`📌 Sifu Asal:  Hit ${sifuStats.hitRate}% (${sifuStats.hits}/${sifuStats.total}) | Accuracy ${sifuStats.accuracy}%`);

// Step 1: DE global search
console.log('\n🌐 Step 1: Differential Evolution (100 pop × 3000 gen)...');
const t1 = Date.now();
const scoreAll = (p) => score(p, dataset);
const deParams = differentialEvolution(scoreAll, bounds, { popSize: 100, maxGen: 3000 });
const deStats = fullStats(deParams, dataset, '🌐 DE Result');
console.log(`✅ DE done in ${((Date.now()-t1)/1000).toFixed(1)}s — Hit ${deStats.hitRate}% | Accuracy ${deStats.accuracy}%`);

// Step 2: Nelder-Mead refinement
console.log('\n🔬 Step 2: Nelder-Mead refinement...');
const t2 = Date.now();
const v2Params = nelderMead(scoreAll, deParams, { maxIter: 200000, tol: 1e-12 });
const v2Stats = fullStats(v2Params, dataset, '🛡️ V2 Clean');
console.log(`✅ NM done in ${((Date.now()-t2)/1000).toFixed(1)}s — Hit ${v2Stats.hitRate}% | Accuracy ${v2Stats.accuracy}%`);

// ─── RESULTS TABLE ───────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(80));
console.log('📊 HEAD-TO-HEAD: SIFU ASAL vs MODEL V2 (CLEAN)');
console.log('═'.repeat(80));

const metrics = [
    ['Total IPO (Excl Gap-Down)', sifuStats.total, v2Stats.total],
    ['✅ Hit Rate (%)',            sifuStats.hitRate + '%', v2Stats.hitRate + '%'],
    ['❌ Miss Rate (%)',           (100 - parseFloat(sifuStats.hitRate)).toFixed(1) + '%', (100 - parseFloat(v2Stats.hitRate)).toFixed(1) + '%'],
    ['Bilangan Capai',            `${sifuStats.hits}/${sifuStats.total}`, `${v2Stats.hits}/${v2Stats.total}`],
    ['Overall Accuracy',          sifuStats.accuracy + '%', v2Stats.accuracy + '%'],
    ['Upside Missed (avg)',       sifuStats.avgUpside + '%', v2Stats.avgUpside + '%'],
    ['Downside Error (avg)',      sifuStats.avgDownside + '%', v2Stats.avgDownside + '%'],
    ['Exceed >20%',               sifuStats.exceed20 + '%', v2Stats.exceed20 + '%'],
    ['Exceed >50%',               sifuStats.exceed50 + '%', v2Stats.exceed50 + '%'],
];

console.log(`${'Metrik'.padEnd(30)} | ${'📌 Sifu Asal'.padEnd(16)} | ${'🛡️ V2 Clean'.padEnd(16)}`);
console.log('─'.repeat(70));
for (const [label, sifu, v2] of metrics) {
    console.log(`${label.padEnd(30)} | ${String(sifu).padEnd(16)} | ${String(v2).padEnd(16)}`);
}

// ─── OPTIMAL PARAMETERS ─────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(80));
console.log('🔧 V2 OPTIMAL PARAMETERS (Clean — No Data Leakage):');
console.log('═'.repeat(80));

const paramLabels = {
    techMult:      'Theme Tech/Semicon Premium',
    energyMult:    'Theme Energy/Solar Premium',
    consumerMult:  'Theme Consumer/F&B Premium',
    healthMult:    'Healthcare Premium',
    plantMult:     'Plantation Premium',
    tradAceDisc:   'Trad ACE Discount',
    mainMktMult:   'Main Market Multiplier',
    osHighMult:    'High OS (≥40x) Multiplier',
    osLowDisc:     'Low OS (<5x) Discount',
    lowPriceBonus: 'Low Price (<RM0.30) Bonus',
};

for (const [k, label] of Object.entries(paramLabels)) {
    const val = v2Params[k];
    const pct = ((val - 1) * 100).toFixed(1);
    const arrow = val > 1.01 ? '▲' : val < 0.99 ? '▼' : '─';
    console.log(`  ${label.padEnd(32)} = ${val.toFixed(4)}  (${arrow} ${pct > 0 ? '+' : ''}${pct}%)`);
}

// ─── DUAL ZONE TARGETING ─────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(80));
console.log('📏 DUAL ZONE TARGETING — Zone 1 (Safe) + Zone 2 (Bull):');
console.log('═'.repeat(80));

// Zone 1: Conservative (multiply V2 target by 0.85) → higher hit rate for 50% sell
// Zone 2: Bull (V2 target as-is or slightly higher) → trailing stop for remaining 50%
const z1Mult = 0.85;
const z2Mult = 1.00;

const activeData = dataset.filter(d => !d.gapDown);
let z1Hits = 0, z2Hits = 0;
console.log(`\n${'Sym'.padEnd(10)} | ${'Cincai'.padEnd(7)} | ${'Zone1'.padEnd(7)} | ${'Zone2'.padEnd(7)} | ${'ATH'.padEnd(7)} | ${'Z1'.padEnd(4)} | Z2`);
console.log('─'.repeat(65));

for (const d of activeData) {
    const cal = applyV2(d.cincai, d, v2Params);
    const z1 = cal * z1Mult;
    const z2 = cal * z2Mult;
    const z1Hit = d.ath >= z1;
    const z2Hit = d.ath >= z2;
    if (z1Hit) z1Hits++;
    if (z2Hit) z2Hits++;
    console.log(`${d.sym.padEnd(10)} | ${d.cincai.toFixed(3).padEnd(7)} | ${z1.toFixed(3).padEnd(7)} | ${z2.toFixed(3).padEnd(7)} | ${d.ath.toFixed(3).padEnd(7)} | ${z1Hit ? '✅' : '❌'}   | ${z2Hit ? '✅' : '❌'}`);
}

console.log('─'.repeat(65));
console.log(`Zone 1 (Safe TP — Jual 50%): ${z1Hits}/${activeData.length} = ${(z1Hits/activeData.length*100).toFixed(1)}% hit`);
console.log(`Zone 2 (Bull TP — Trail 50%): ${z2Hits}/${activeData.length} = ${(z2Hits/activeData.length*100).toFixed(1)}% hit`);

// ─── CHANGED KAUNTERS ───────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(80));
console.log('🔄 KAUNTER BERUBAH STATUS vs SIFU ASAL:');
console.log('═'.repeat(80));
let improved = 0, worsened = 0;
for (const d of activeData) {
    const sifuHit = d.ath >= d.cincai;
    const v2Hit = d.ath >= applyV2(d.cincai, d, v2Params);
    if (sifuHit !== v2Hit) {
        const status = !sifuHit && v2Hit ? '✅ Miss→Hit  (BAIK)' : '❌ Hit→Miss (TERUK)';
        if (!sifuHit && v2Hit) improved++;
        else worsened++;
        console.log(`  ${d.sym.padEnd(10)} | Sifu: RM${d.cincai.toFixed(3)} → V2: RM${applyV2(d.cincai, d, v2Params).toFixed(3)} vs ATH: RM${d.ath.toFixed(3)} | ${status}`);
    }
}
console.log(`\n  🟢 Improved (Miss→Hit): ${improved}`);
console.log(`  🔴 Worsened (Hit→Miss): ${worsened}`);
console.log(`  📈 Net gain: ${improved - worsened >= 0 ? '+' : ''}${improved - worsened}`);

// ─── LOOCV (Skip if --no-cv flag) ───────────────────────────────────────────
if (!process.argv.includes('--no-cv')) {
    console.log('\n' + '═'.repeat(80));
    const loocvResult = loocv(bounds);
    console.log(`\n🏆 LOOCV Hit Rate: ${loocvResult.hits}/${loocvResult.total} = ${loocvResult.hitRate.toFixed(1)}%`);
    console.log('  (This is the HONEST generalisation score — no overfitting)');
    console.log('═'.repeat(80));
} else {
    console.log('\n⏭️ LOOCV skipped (--no-cv flag)');
}

// ─── EXPORT PARAMS ───────────────────────────────────────────────────────────
console.log('\n\n📋 COPY INI MASUK sifu-sheets.html:');
console.log('const v2Params = {');
for (const [k, v] of Object.entries(v2Params)) {
    console.log(`    ${k}: ${v.toFixed(4)},  // ${paramLabels[k]}`);
}
console.log('};');
