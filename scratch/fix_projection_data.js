/**
 * fix_projection_data.js
 * Sanity check + auto-fix projection data untuk semua stocks.
 *
 * PERATURAN UTAMA:
 * 1. sifuTargetPrice = MUTLAK (ground truth). patF dikira dari sini.
 *    Formula: patF = sifuTargetPrice * totalShares / targetPe
 * 2. Jika tiada sifuTargetPrice: patF mesti >= pat25 * 1.08 (min 8% growth).
 * 3. revF dan gpF dikira berdasarkan nisbah margin dari FYE 25, dengan cap 2x.
 * 4. revF mesti >= rev25 (projection tidak boleh turun).
 */

const fs   = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS   = path.join(__dirname, '..', 'data.js');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

let fixedCount   = 0;
let skippedCount = 0;
const report     = [];

data.forEach(ipo => {
    if (!ipo.patF || !ipo.totalShares || !ipo.targetPe) return;

    const totalShares = ipo.totalShares;
    const targetPe    = ipo.targetPe;
    const sifuTarget  = ipo.sifuTargetPrice || ipo.calibratedSifuTargetPrice;
    const pat25       = ipo.pat25 || 0;
    const rev25       = ipo.rev25 || 0;
    const gp25        = ipo.gp25  || 0;

    // Current computed value
    const valF_current = (ipo.patF / totalShares) * targetPe;

    // ── Step 1: Determine correct patF ─────────────────────────────────
    let correctPatF;

    if (sifuTarget && sifuTarget > 0) {
        // sifuTargetPrice = MUTLAK. Kira patF terus dari formula.
        // valF = patF * targetPe / totalShares  →  patF = sifuTarget * totalShares / targetPe
        correctPatF = (sifuTarget * totalShares) / targetPe;
    } else {
        // Tiada sifu target — guna pat25 + min 8% growth
        correctPatF = pat25 > 0
            ? Math.max(ipo.patF, pat25 * 1.08)
            : ipo.patF;
    }

    // Round to nearest 1000
    correctPatF = Math.round(correctPatF / 1000) * 1000;

    // ── Step 2: Derive revF and gpF ────────────────────────────────────
    const gpMargin25  = (rev25 > 0 && gp25  > 0) ? (gp25  / rev25) : 0.30;
    const patMargin25 = (rev25 > 0 && pat25 > 0) ? (pat25 / rev25) : 0.10;

    let correctRevF;
    if (rev25 > 0 && patMargin25 > 0.01 && patMargin25 < 0.85) {
        // Derive from patF using pat margin, capped at 200% of rev25
        correctRevF = Math.min(
            Math.round(correctPatF / patMargin25 / 1000) * 1000,
            rev25 * 2.0
        );
    } else {
        correctRevF = Math.round((rev25 || 1e7) * 1.10 / 1000) * 1000;
    }
    // Enforce: revF must be >= rev25
    if (rev25 > 0) correctRevF = Math.max(correctRevF, Math.round(rev25 * 1.02 / 1000) * 1000);
    if (correctRevF <= 0) correctRevF = 10000000;

    let correctGpF = Math.round(correctRevF * gpMargin25 / 1000) * 1000;
    if (gp25 > 0) correctGpF = Math.max(correctGpF, Math.round(gp25 * 1.02 / 1000) * 1000);

    // F+1: 13% growth from F
    const f1Rate     = 0.13;
    const correctRevF1 = Math.round(correctRevF * (1 + f1Rate) / 1000) * 1000;
    const correctGpF1  = Math.round(correctRevF1 * gpMargin25 / 1000) * 1000;
    const correctPatF1 = Math.round(correctPatF * (1 + f1Rate) / 1000) * 1000;

    // ── Step 3: Check if fix needed ────────────────────────────────────
    const patDiff  = Math.abs(correctPatF - ipo.patF);
    const revDown  = rev25 > 0 && ipo.revF && ipo.revF < rev25;
    const valMiss  = sifuTarget && Math.abs(valF_current - sifuTarget) > 0.05;
    const needsFix = patDiff > 50000 || revDown || valMiss;

    if (!needsFix) {
        skippedCount++;
        return;
    }

    // Compute new value for reporting
    const newValF = (correctPatF / totalShares) * targetPe;

    report.push({
        name:        ipo.companyName,
        old_patF:    (ipo.patF / 1e6).toFixed(2) + 'M',
        new_patF:    (correctPatF / 1e6).toFixed(2) + 'M',
        old_val:     'RM ' + valF_current.toFixed(3),
        new_val:     'RM ' + newValF.toFixed(3),
        sifu:        sifuTarget ? 'RM ' + sifuTarget.toFixed(3) : 'N/A',
        match:       sifuTarget
                         ? (Math.abs(newValF - sifuTarget) < 0.01 ? '✅' : `⚠️ diff ${(newValF-sifuTarget).toFixed(3)}`)
                         : '-'
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

// ── Print report ───────────────────────────────────────────────────────
console.log('\n=== PROJECTION SANITY CHECK ===\n');
if (report.length === 0) {
    console.log('✅ Semua data projection OK. Tiada perubahan diperlukan.');
} else {
    report.forEach(r => {
        console.log(`📌 ${r.name}`);
        console.log(`   PAT: ${r.old_patF} → ${r.new_patF}`);
        console.log(`   Value Target: ${r.old_val} → ${r.new_val}  |  Sifu: ${r.sifu}  ${r.match}`);
        console.log('');
    });
}
console.log(`Fixed: ${fixedCount} | Already OK: ${skippedCount}`);

// ── Save files ─────────────────────────────────────────────────────────
if (fixedCount > 0) {
    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2), 'utf8');
    console.log('\n✅ data.json saved.');
    const jsContent = 'var ipoData = ' + JSON.stringify(data, null, 2) + ';\n';
    fs.writeFileSync(DATA_JS, jsContent, 'utf8');
    console.log('✅ data.js saved.');
} else {
    console.log('\nℹ️  No files modified (all clean).');
}
console.log('\nDone!');
