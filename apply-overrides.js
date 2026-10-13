const fs = require('fs');
const path = require('path');
const { recalcOsGrade } = require('./lib/ipo-rules');

const jsonPath = path.join(__dirname, 'data.json');
const jsPath = path.join(__dirname, 'data.js');
const overridesPath = path.join(__dirname, 'overrides.json');

if (!fs.existsSync(overridesPath)) {
    console.error('overrides.json not found!');
    process.exit(1);
}

if (!fs.existsSync(jsonPath)) {
    console.error('data.json not found!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));

let appliedCount = 0;
data.forEach(ipo => {
    const override = overrides[ipo.id];
    if (override) {
        Object.assign(ipo, override);
        appliedCount++;
    }
});

// ─── AUTO-RECALC GRADE BERDASARKAN OS ─────────────────────────────────────────
// Bila IPO dah ada OS data (stage 4/5), predictedGrade patut dikira semula
// berdasarkan OS, bukan lagi pre-ballot prediction.
// Uses the same grading rules as the browser.
let gradeRecalcCount = 0;
data.forEach(ipo => {
    const newGrade = recalcOsGrade(ipo);
    if (newGrade && newGrade !== ipo.predictedGrade) {
        const oldGrade = ipo.predictedGrade || '?';
        ipo.predictedGrade = newGrade;
        console.log(`📊 Grade recalc [${ipo.id}]: ${oldGrade} → ${newGrade} (OS: ${ipo.os}x, Stage: ${ipo.stage})`);
        gradeRecalcCount++;
    }
});

if (gradeRecalcCount > 0) {
    console.log(`✅ Recalculated ${gradeRecalcCount} IPO grade(s) based on OS data.`);
}
// ──────────────────────────────────────────────────────────────────────────────

const totalChanges = appliedCount + gradeRecalcCount;
if (totalChanges > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log(`✅ Applied ${appliedCount} overrides + ${gradeRecalcCount} grade recalcs to data.json and data.js.`);
    
    // Automatically trigger Sifu target price recalculation to align with sifu-sheets.html
    try {
        const { execSync } = require('child_process');
        console.log('🔄 Recalculating Sifu study target prices to align with sifu-sheets.html...');
        execSync('node scratch/calc_sifu_targets.js', { stdio: 'inherit' });
    } catch (e) {
        console.error('⚠️ Failed to automatically run calc_sifu_targets.js:', e.message);
    }
} else {
    console.log('No matching overrides found to apply.');
}
