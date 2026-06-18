const fs = require('fs');
const path = require('path');

const corrections = {
    'SKYECHIP': 1.58,
    'MMCS': 0.24,
    'POWER': 0.41,
    'TOPVISN': 0.41,
    'EPB': 0.71,
    'VERDANT': 0.38,
    'CRPMATE': 0.23,
    'XPB': 0.25,
    'HOCKSOON': 0.63,
    'BWYS': 0.31,
    'EIPOWER': 0.61,
    'ISF': 0.69,
    'AMS': 0.33,
    'TEAMSTR': 0.32,
    'TECHSTORE': 0.28,
    'OGM': 0.30,
    'CREST': 0.32,
    'AZAMJAYA': 1.04,
    'ECOSHOP': 1.31,
    'SDCG': 0.54,
    'KEYFIELD': 2.14,
    'WINSTAR': 0.51,
    'SUPREME': 0.29,
    'SAG': 1.29,
    'KEEMING': 0.68,
    'CBHB': 0.38,
    'IAB': 0.71,
    'LWSABAH': 0.80,
    'AMBEST': 0.34,
    'ELRIDGE': 0.55,
    'KOPI': 0.55,
    'PENTECH': 0.33,
};

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const overrides = {};

// Pre-fill with upcoming grade updates from update_upcoming_grades.js
const gradeUpdates = {
    'elsa': {
        predictedGrade: 'C',
        analystInsight: '⚠️ <b>AVOID / HIGH RISK (GRADE C)</b><br>Sektor O&G services sedang sejuk — retail masih trauma dengan OGX dan OGM. Ada OFS (36.4M shares) yang menambah tekanan jual. IB belum disahkan. Walaupun ada elemen robotik dan digital, market 2026 tidak hargai O&G-adjacent dengan baik. Risiko tinggi untuk open below atau flat. <b>Skip kecuali IB Maybank/M&A dan OS cecah 80x+.</b>'
    },
    'sum-technology': {
        predictedGrade: 'B',
        analystInsight: '✅ <b>WORTH IT (GRADE B)</b><br>Sektor Tech (Hardware) adalah sektor terbaik 2026 — SEMICO (+50%) dan SkyeChip (+151%) dah buktikan. Tiada OFS, Shariah-compliant. Tapi IB masih TBA — ini risiko utama. <b>Formula baru: apply kalau IB keluar Maybank/M&A/Alliance Islamic. Skip kalau IB Mercury/UOB/CIMB sole.</b> Harga RM0.28 berpatutan untuk entry.'
    },
    'mm-computer': {
        predictedGrade: 'C',
        analystInsight: '❌ <b>AVOID (GRADE C — DOUBLE RED FLAG)</b><br>Dua sebab utama untuk skip:<br>1️⃣ <b>OFS besar (47.34M shares)</b> — historical data tunjuk OFS = avg -1.4% vs Non-OFS +21.2%<br>2️⃣ <b>IT Services sektor biasa</b> — bukan tech momentum, bukan industrial expansion<br>Walaupun Shariah-compliant, profil ini hampir sama dengan OGX (110x OS, ada OFS, result flat). <b>Jangan apply.</b>'
    },
    'pentech': {
        predictedGrade: 'C',
        analystInsight: '⚠️ <b>NEUTRAL / LOW PRIORITY (GRADE C)</b><br>ICT infrastructure adalah sektor "boring" — tiada momentum tema besar seperti AI, semiconductor, atau data center. Tiada OFS, Shariah OK, harga murah RM0.20. Tapi IB TBA dan sektor ini jarang deliver listing day pop yang besar. Based on 2026 data, Industrial/ICT tanpa strong IB = avg +3-5% je. <b>Boleh apply tapi jangan harap besar. Low conviction.</b>'
    },
    'eckem': {
        predictedGrade: 'D',
        analystInsight: '🚫 <b>TIDAK SESUAI — BUKAN SHARIAH</b><br>Eckem Holdings tidak patuh Syariah. Walaupun IB M&A Securities (rekod bagus) dan ada ekspansi kilang yang menarik, <b>skip terus bagi pelabur Shariah.</b> Untuk pelabur konvensional: Grade B kerana M&A IB + industrial expansion focus.'
    }
};

// Populate the overrides object
data.forEach(ipo => {
    const sym = (ipo.symbol || '').toUpperCase();
    const id = ipo.id;
    
    let hasOverride = false;
    const ipoOverride = {};
    
    // Check if there is a Sifu TP correction
    if (corrections[sym] !== undefined) {
        ipoOverride.sifuTargetPrice = corrections[sym];
        hasOverride = true;
    }
    
    // Check if there is a grade/insight update
    if (gradeUpdates[id]) {
        ipoOverride.predictedGrade = gradeUpdates[id].predictedGrade;
        ipoOverride.analystInsight = gradeUpdates[id].analystInsight;
        hasOverride = true;
    }

    // Also look in data.json itself to see if the current predictedGrade / analystInsight for MMCS is custom
    if (id === 'mm-computer' && ipo.predictedGrade === 'C') {
        ipoOverride.predictedGrade = 'C';
        ipoOverride.analystInsight = ipo.analystInsight;
        hasOverride = true;
    }
    
    if (hasOverride) {
        overrides[id] = ipoOverride;
    }
});

// Write to overrides.json
const overridesPath = path.join(__dirname, '..', 'overrides.json');
fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');

console.log(`Generated overrides.json with ${Object.keys(overrides).length} overrides.`);
