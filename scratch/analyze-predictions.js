const fs = require('fs');
const path = require('path');

// We need a minimal getIpoGrade function matching main.js to compute the actual grade
function floatEquals(a, b, tolerance = 0.005) { return Math.abs(a - b) < tolerance; }

function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return 'Unrated';
    const os = ipo.os || 0;
    const hasOsData = ipo.os !== undefined && ipo.os !== null && ipo.os > 0; 
    const perf = ipo.performance || '';
    const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0;
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();

    const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
    const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
    const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
    
    const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity"];
    const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

    const isHero = heroIBs.some(tier => ib.includes(tier));
    const isTopTier = topTierIBs.some(tier => ib.includes(tier));
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));
    
    const isPositiveOpen = ipo.openPrice && ipo.price && ipo.openPrice > ipo.price;
    const openPremium = (ipo.openPrice && ipo.price) ? ((ipo.openPrice - ipo.price) / ipo.price) * 100 : 0;
    const isStrongGreen = openPremium >= 5.0;
    const isFlat = ipo.openPrice && ipo.price && floatEquals(ipo.openPrice, ipo.price);
    const isHighPE = pe > 18.0;
    const isAttractivePE = pe > 0 && pe < 12.0;
    const isRed = perf.includes('-');

    const isMainMarket = ipo.market && ipo.market.toLowerCase().includes('main');
    const isAceMarket = !isMainMarket;

    if (isMainMarket) {
        if (isHero && (isStrongGreen || isFlat)) return 'A';
        if (ipo.stage === 5 && !hasOsData && isStrongGreen) {
            if ((isTopTier || isMomentum) && !isHighPE) return 'A';
            if (pe > 0 && pe < 15 && isStrongGreen) return 'A';
        }
        if (isHighPE && isRed) return 'C';
        if (isFlat && !isHero) return 'C';
        if (isStrongGreen && pe > 0 && pe < 15 && (isTopTier || isMomentum)) return 'A';
        if (isPositiveOpen && pe > 0 && pe < 15 && (isTopTier || isMomentum || isHero)) return 'B';
        if (hasOsData && os < 10 && !isHero && !isStrongGreen) return 'C';
        if (isHighPE) return 'C';
        if (isRed) return 'C';
        if (os >= 20 && (isTopTier || isHero) && isStrongGreen) return 'A';
        if (isStrongGreen && !isHighPE) return 'A';
        return 'C';
    }

    if (isAceMarket) {
        // Red check
        const perfVal = (ipo.currentPrice && ipo.price) ? ((ipo.currentPrice - ipo.price) / ipo.price) * 100 : 0;
        const isRedPerf = perfVal < 0 || (ipo.currentPrice && ipo.price && ipo.currentPrice < ipo.price) || (ipo.performance && ipo.performance.includes('-'));
        if (isRedPerf) return 'C';

        if (isHero && isStrongGreen && os >= 3) return 'B';
        if (ipo.stage === 5 && !hasOsData && isStrongGreen) {
            if ((isMomentum || isTopTier || isHero) && !isHighPE) return 'B';
        }
        if (isHighPE) {
            if (os >= 50 && (isMomentum || isTopTier || isHero)) return 'B';
            if (pe > 28.0) return 'C';
            if (os < 20) return 'C';
        }
        if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return 'B';
        if (os >= 20 && isStrongGreen) return 'B';
        if (isFlat && os < 20) return 'C';
        if (hasOsData && os < 10 && !isHero) return 'C';
        if (!hasOsData && !isStrongGreen) return 'C';
        if (isStrongGreen && !isHighPE) return 'B';
        return 'C';
    }
    return 'Unrated';
}

const jsonPath = path.join(__dirname, '../data.json');
const raw = fs.readFileSync(jsonPath, 'utf8');
const ipos = JSON.parse(raw);

console.log('=== PREDICTION ACCURACY ANALYSIS (STAGE 5 LISTED IPOs) ===\n');

let total = 0;
let matched = 0;
let mispredictions = [];

ipos.forEach(ipo => {
    if (ipo.stage === 5 && ipo.predictedGrade) {
        total++;
        const actual = getIpoGrade(ipo);
        if (actual === ipo.predictedGrade) {
            matched++;
        } else {
            mispredictions.push({
                id: ipo.id,
                name: ipo.companyName,
                market: ipo.market,
                sector: ipo.sector,
                os: ipo.os || 'TBA',
                pe: ipo.pe || 'TBA',
                performance: ipo.performance || '0%',
                predicted: ipo.predictedGrade,
                actual: actual
            });
        }
    }
});

console.log(`Total Listed IPOs with Predictions: ${total}`);
console.log(`Matched (Successful Predictions): ${matched} (${((matched/total)*100).toFixed(1)}%)`);
console.log(`Failed Predictions: ${total - matched} (${(((total - matched)/total)*100).toFixed(1)}%)\n`);

console.log('=== LIST OF MISPREDICTIONS (PREDICTED VS ACTUAL) ===');
console.table(mispredictions.map(m => ({
    Name: m.name,
    Market: m.market,
    OS: m.os,
    PE: m.pe,
    Perf: m.performance,
    'Predicted Grade': m.predicted,
    'Actual Grade': m.actual
})));
