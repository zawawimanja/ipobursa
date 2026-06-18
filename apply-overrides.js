const fs = require('fs');
const path = require('path');

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

if (appliedCount > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log(`✅ Applied ${appliedCount} overrides from overrides.json to data.json and data.js.`);
    
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
