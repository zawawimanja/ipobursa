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

// ─── AUTO-RECALC GRADE BERDASARKAN OS ─────────────────────────────────────────
// Bila IPO dah ada OS data (stage 4/5), predictedGrade patut dikira semula
// berdasarkan OS, bukan lagi pre-ballot prediction.
// Mirror logic dari getIpoGrade() dalam main.js.
function recalcOsGrade(ipo) {
    const os = ipo.os || 0;
    if (!os || os <= 0) return null; // skip kalau takde OS
    if ((ipo.stage || 0) < 4) return null; // hanya untuk post-ballot

    const market = (ipo.market || '').toLowerCase();
    const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0;
    const sector = (ipo.sector || '').toLowerCase();

    const heroIBs = ['maybank', 'public', 'kaf', 'alliance'];
    const topTierIBs = ['rhb', 'aminvestment', 'alliance', 'affin hwang', 'kaf', 'public', 'maybank'];
    const momentumIBs = ['m&a', 'malacca', 'ta securities', 'kenanga', 'apex', 'sj securities'];
    const trendingSectors = ['data centre', 'solar', 'ai', 'technology', 'renewable energy', 'ev', 'semiconductor', 'digital', 'cybersecurity'];

    const isHero = heroIBs.some(t => ib.includes(t));
    const isTopTier = topTierIBs.some(t => ib.includes(t));
    const isMomentum = momentumIBs.some(t => ib.includes(t));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isAttractivePE = pe > 0 && pe < 12;

    const openPrice = ipo.openPrice || 0;
    const ipoPrice = ipo.price || 0;
    const openPremium = (openPrice && ipoPrice) ? ((openPrice - ipoPrice) / ipoPrice) * 100 : 0;
    const isStrongGreen = openPremium >= 5.0;
    const isRed = openPrice > 0 && ipoPrice > 0 && openPrice < ipoPrice;

    // Main Market OS rules
    if (market.includes('main')) {
        const isTopIB = heroIBs.some(t => ib.includes(t));
        if (os >= 20 && isTopIB) return 'A';
        if (os >= 20) return 'B';
        if (os >= 5)  return 'B';
        return 'C';
    }

    // ACE Market OS rules
    if (market.includes('ace')) {
        // Stage 5 (listed) — ada openPrice
        if (ipo.stage === 5 && openPrice > 0) {
            if (os >= 50 && isStrongGreen) return 'A';
            if (isHero && isStrongGreen && os >= 3) return 'B';
            if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || !isRed)) return 'B';
            if (os >= 20 && isStrongGreen) return 'B';
            if (os < 10 && !isHero) return 'C';
            if (isRed) return 'C';
            if (isStrongGreen && pe <= 18) return 'B';
            return 'C';
        }

        // Stage 4 (pre-listing, ada OS tapi belum listing)
        if (os >= 50) return 'A';
        if (os >= 20) return 'B';
        return 'C';
    }

    return null; // unknown market
}

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
