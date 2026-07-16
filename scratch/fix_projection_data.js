/**
 * fix_projection_data.js
 * Auto-fix projection data (patF, revF, gpF) untuk semua stocks yang ada isu.
 * Formula: patF = sifuTargetPrice * totalShares / targetPe
 * Pastikan semua projection NAIK dari historical FYE 25.
 */

const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS   = path.join(__dirname, '..', 'data.js');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

let fixedCount = 0;
let skippedCount = 0;
const report = [];

data.forEach(ipo => {
    // Only process stocks with full projection data
    if (!ipo.patF || !ipo.totalShares || !ipo.targetPe) return;

    const totalShares = ipo.totalShares;
    const targetPe    = ipo.targetPe;
    const sifuTarget  = ipo.sifuTargetPrice || ipo.calibratedSifuTargetPrice;
    const pat25       = ipo.pat25 || 0;
    const rev25       = ipo.rev25 || 0;
    const gp25        = ipo.gp25  || 0;

    // --- Calculate current state ---
    const epsF_current  = (ipo.patF / totalShares) * 100;
    const valF_current  = (epsF_current * targetPe) / 100;

    // --- Determine correct patF ---
    let correctPatF = ipo.patF;

    if (sifuTarget && sifuTarget > 0) {
        // Back-calculate patF from sifu target price
        // Formula: sifuTarget = (patF / totalShares) * targetPe / 100 * 100
        // => patF = sifuTarget * totalShares / targetPe
        const backcalcPatF = (sifuTarget * totalShares) / targetPe;

        // Also enforce minimum growth (at least 5% above pat25)
        const minPatF = pat25 > 0 ? pat25 * 1.05 : backcalcPatF;
        correctPatF = Math.max(backcalcPatF, minPatF);
    } else {
        // No sifu target — just enforce minimum 8% growth from FYE 25
        if (pat25 > 0 && ipo.patF < pat25) {
            correctPatF = pat25 * 1.08;
        }
    }

    // Round to nearest 1000
    correctPatF = Math.round(correctPatF / 1000) * 1000;

    // --- Calculate growth ratio to apply to rev/gp ---
    const patGrowthRatio = pat25 > 0 ? (correctPatF / pat25) : 1.10;
    // Use GP margin from FYE 25
    const gpMargin25 = (rev25 > 0 && gp25 > 0) ? (gp25 / rev25) : 0.30;
    // Use PAT margin from FYE 25
    const patMargin25 = (rev25 > 0 && pat25 > 0) ? (pat25 / rev25) : 0.10;

    // Correct revF: derive from correctPatF using pat margin, but cap sensibly
    let correctRevF;
    if (patMargin25 > 0.02 && patMargin25 < 0.8) {
        // Use pat margin only if it's a sensible ratio (2%-80%)
        correctRevF = Math.round(correctPatF / patMargin25 / 1000) * 1000;
        // Cap: revF should not exceed rev25 * 2.0 (200% growth is unrealistic in 1 year)
        correctRevF = Math.min(correctRevF, rev25 * 2.0);
    } else {
        // Fallback: 10% growth from FYE 25
        correctRevF = Math.round(rev25 * 1.10 / 1000) * 1000;
    }
    // Enforce minimum: revF must be >= rev25 * 1.02
    correctRevF = Math.max(correctRevF, Math.round(rev25 * 1.02 / 1000) * 1000);
    if (correctRevF <= 0) correctRevF = Math.round(rev25 * 1.10 / 1000) * 1000 || 10000000;

    // Correct gpF using GP margin from FYE 25
    let correctGpF = Math.round(correctRevF * gpMargin25 / 1000) * 1000;
    correctGpF = Math.max(correctGpF, Math.round(gp25 * 1.05 / 1000) * 1000);

    // F+1 projections: 12-15% growth from F
    const f1GrowthRate = 0.13;
    const correctRevF1 = Math.max(
        Math.round(correctRevF * (1 + f1GrowthRate) / 1000) * 1000,
        ipo.revF1 || 0
    );
    const correctGpF1  = Math.round(correctRevF1 * gpMargin25 / 1000) * 1000;
    const correctPatF1 = Math.max(
        Math.round(correctPatF * (1 + f1GrowthRate) / 1000) * 1000,
        ipo.patF1 || 0
    );

    // --- Check if fix is needed ---
    const patDiff    = Math.abs(correctPatF - ipo.patF);
    const revDiff    = Math.abs(correctRevF - (ipo.revF || 0));
    const needsFix   = patDiff > 100000 || revDiff > 500000 || (ipo.revF && rev25 && ipo.revF < rev25) || ipo.patF < pat25;

    if (!needsFix) {
        skippedCount++;
        return;
    }

    // Verify new values make sense
    const newEpsF = (correctPatF / totalShares) * 100;
    const newValF = (newEpsF * targetPe) / 100;

    report.push({
        name:        ipo.companyName,
        old_patF:    (ipo.patF / 1e6).toFixed(2) + 'M',
        new_patF:    (correctPatF / 1e6).toFixed(2) + 'M',
        old_revF:    ((ipo.revF || 0) / 1e6).toFixed(1) + 'M',
        new_revF:    (correctRevF / 1e6).toFixed(1) + 'M',
        old_valF:    'RM ' + valF_current.toFixed(3),
        new_valF:    'RM ' + newValF.toFixed(3),
        sifu_target: sifuTarget ? 'RM ' + sifuTarget.toFixed(3) : 'N/A',
        match:       sifuTarget ? (Math.abs(newValF - sifuTarget) < 0.02 ? '✅' : '~OK') : '-'
    });

    // Apply fix
    ipo.patF  = correctPatF;
    ipo.patF1 = correctPatF1;
    ipo.revF  = correctRevF;
    ipo.revF1 = correctRevF1;
    ipo.gpF   = correctGpF;
    ipo.gpF1  = correctGpF1;

    fixedCount++;
});

// Print report
console.log('\n=== AUTO-FIX REPORT ===\n');
report.forEach(r => {
    console.log(`📌 ${r.name}`);
    console.log(`   PAT: ${r.old_patF} → ${r.new_patF}  |  Rev: ${r.old_revF} → ${r.new_revF}`);
    console.log(`   Value Target: ${r.old_valF} → ${r.new_valF}  |  Sifu Target: ${r.sifu_target}  ${r.match}`);
    console.log('');
});
console.log(`Fixed: ${fixedCount} | Skipped (already OK): ${skippedCount}`);

// --- Save data.json ---
fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2), 'utf8');
console.log('\n✅ data.json saved.');

// --- Update data.js (wrap with ipoData variable) ---
const jsContent = 'var ipoData = ' + JSON.stringify(data, null, 2) + ';\n';
fs.writeFileSync(DATA_JS, jsContent, 'utf8');
console.log('✅ data.js saved.');
console.log('\nDone! Refresh browser untuk lihat changes.');
