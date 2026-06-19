const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'ogx'
];

const explicitSkips = ['adnex', 'mmcs', 'agmo', 'wentel-engineering', 'wentel'];

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated' };
    
    const effectiveStage = ipo.stage;
    const os = ipo.os || 0;
    const hasOsData = ipo.os !== undefined && ipo.os !== null && ipo.os > 0;
    
    // Respect manual predicted grade if pre-listing
    if (ipo.predictedGrade && effectiveStage < 4) {
        return { grade: ipo.predictedGrade };
    }

    const perf = ipo.performance || '';
    const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0;
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();

    const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
    const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
    const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
    const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity", "software"];
    const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

    const isHero = heroIBs.some(tier => ib.includes(tier));
    const isTopTier = topTierIBs.some(tier => ib.includes(tier));
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));
    
    const openPremium = (ipo.openPrice && ipo.price) ? ((ipo.openPrice - ipo.price) / ipo.price) * 100 : 0;
    const isStrongGreen = openPremium >= 5.0;
    const isFlat = ipo.openPrice && ipo.price && floatEquals(ipo.openPrice, ipo.price);
    const isPositiveOpen = ipo.openPrice && ipo.price && ipo.openPrice > ipo.price;
    const isHighPE = pe > 18.0;
    const isAttractivePE = pe > 0 && pe < 12.0;
    const isRed = (ipo.openPrice && ipo.price) ? (ipo.openPrice < ipo.price) : false;

    const isMainMarket = ipo.market && ipo.market.toLowerCase().includes('main');
    const isAceMarket = !isMainMarket;

    if (effectiveStage < 5 && os === 0) {
        let score = 0;
        if (isHero) score += 40;
        else if (isTopTier) score += 30;
        else if (isMomentum) score += 20;
        
        if (isTrendingSector) score += 30;
        if (isExpansionFund) score += 20;
        
        if (isMainMarket) score += 10;
        else if (isAceMarket) score += 5;

        if (ipo.ofs === true) score -= 15;
        if (pe > 0 && pe < 13.0) score += 15;
        else if (pe > 0 && pe < 18.0) score += 5;
        else if (pe > 22.0) score -= 10;

        let predGrade = 'C';
        if (score >= 70) predGrade = 'A';
        else if (score >= 40) predGrade = 'B';
        return { grade: predGrade };
    }

    if ((effectiveStage === 3 || effectiveStage === 4) && os > 0) {
        if (isMainMarket) {
            const isTopIB = heroIBs.some(tier => ib.includes(tier));
            if (os >= 20 && isTopIB) return { grade: 'A' };
            if (os >= 20 || os >= 5) return { grade: 'B' };
            return { grade: 'C' };
        }
        if (isAceMarket) {
            if (os >= 20) return { grade: 'B' };
            return { grade: 'C' };
        }
    }

    if (isMainMarket) {
        if (isHero && (isStrongGreen || isFlat)) return { grade: 'A' };
        if (effectiveStage === 5 && !hasOsData && isStrongGreen) {
            if ((isTopTier || isMomentum) && !isHighPE) return { grade: 'A' };
            if (pe > 0 && pe < 15 && isStrongGreen) return { grade: 'A' };
        }
        if (isHighPE && isRed) return { grade: 'C' };
        if (isFlat && !isHero) return { grade: 'C' };
        if (isStrongGreen && pe > 0 && pe < 15 && (isTopTier || isMomentum)) return { grade: 'A' };
        if (isPositiveOpen && pe > 0 && pe < 15 && (isTopTier || isMomentum || isHero)) return { grade: 'B' };
        if (hasOsData && os < 10 && !isHero && !isStrongGreen) return { grade: 'C' };
        if (isHighPE || isRed) return { grade: 'C' };
        if (os >= 20 && (isTopTier || isHero) && isStrongGreen) return { grade: 'A' };
        if (isStrongGreen && !isHighPE) return { grade: 'A' };
        return { grade: 'C' };
    }

    if (isAceMarket) {
        if (os >= 50 && isStrongGreen) return { grade: 'A' };
        if (isHero && isStrongGreen && os >= 3) return { grade: 'B' };
        if (effectiveStage === 5 && !hasOsData && isStrongGreen) {
            if ((isMomentum || isTopTier || isHero) && !isHighPE) return { grade: 'B' };
        }
        if (isHighPE) {
            if (os >= 50 && (isMomentum || isTopTier || isHero)) return { grade: 'B' };
            if (pe > 28.0 || os < 20) return { grade: 'C' };
        }
        if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return { grade: 'B' };
        if (os >= 20 && isStrongGreen) return { grade: 'B' };
        if (isFlat && os < 20) return { grade: 'C' };
        if (hasOsData && os < 10 && !isHero) return { grade: 'C' };
        if (!hasOsData && !isStrongGreen) return { grade: 'C' };
        if (isStrongGreen && !isHighPE) return { grade: 'B' };
        return { grade: 'C' };
    }
    return { grade: 'Unrated' };
}

console.log('========================================================================');
console.log('🔍 SCANNING IPO STOCKS FOR DYNAMIC BREAKOUTS (PRICE < RM 3.00)');
console.log('========================================================================');

const results = db.filter(ipo => {
    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolio.includes(idLower) || sifuPortfolio.includes(symbolLower);
    const isMomentumRebound = typeof ipo.dailyChange === 'number' && ipo.dailyChange >= 10.0;

    const grade = getIpoGrade(ipo).grade;

    // 1. Only Grade A, B or Sifu Picks or Momentum Rebound
    if (grade !== 'A' && grade !== 'B' && !isSifuPick && !isMomentumRebound) return false;

    // 2. Filter listed and Syariah-compliant stocks
    const isMatch = ipo.shariah === true && 
        (ipo.stage === 5 || ipo.status === 'Listed') &&
        ipo.currentPrice > 0;
    
    if (!isMatch) return false;

    // 3. Age & Trend Filter
    let isRecent = false;
    const highPriceVal = ipo.highPrice || 0;
    const isNearAthCheck = highPriceVal ? (ipo.currentPrice >= highPriceVal * 0.95) : false;
    
    if (!isMomentumRebound) {
        if (ipo.listingDate) {
            const listDate = new Date(ipo.listingDate);
            const ageInDays = (new Date() - listDate) / (1000 * 60 * 60 * 24);
            isRecent = ageInDays <= 365;
        } else {
            isRecent = ipo.year >= 2024;
        }
        if (!isRecent && !isSifuPick && !isNearAthCheck) return false;
    }

    if (ipo.outlier && !isSifuPick && !isMomentumRebound) return false;
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;
    if (ipo.currentPrice >= 3.00) return false;

    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.sifuTargetPrice || ipo.avgTP || 0;
    const isActualAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);

    if (!isActualAth && !isMomentumRebound && highPrice > 0 && Math.abs(targetPrice - highPrice) < 0.005) return false;

    const ipoPrice = ipo.price || 0;
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) return false;

    const isDowntrend = highPrice ? (ipo.currentPrice <= highPrice * 0.75) : false;
    if (isDowntrend && !isMomentumRebound) return false;

    const isAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);
    const isNearAth = highPrice > 0 && ipo.currentPrice >= (highPrice * 0.95);

    return isAth || isNearAth || isMomentumRebound;
}).map(ipo => {
    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0
        ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100
        : null;

    const isAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);
    const isMomentumRebound = typeof ipo.dailyChange === 'number' && ipo.dailyChange >= 10.0;

    let status = '📈 NEAR ATH (Consolidation)';
    if (isAth) {
        status = '🔥 BREAKOUT ATH';
    } else if (isMomentumRebound) {
        status = `⚡ MOMENTUM REBOUND (+${ipo.dailyChange.toFixed(1)}%)`;
    }

    const grade = getIpoGrade(ipo).grade;

    return {
        symbol: ipo.symbol || ipo.id.toUpperCase(),
        companyName: ipo.companyName,
        currentPrice: `RM ${ipo.currentPrice.toFixed(3)}`,
        highPrice: `RM ${highPrice.toFixed(3)}`,
        targetPrice: targetPrice > 0 ? `RM ${targetPrice.toFixed(2)}` : 'N/A',
        upside: upside ? `${upside.toFixed(1)}%` : 'N/A',
        status: status,
        grade: `Gred ${grade}`
    };
});

if (results.length === 0) {
    console.log('❌ Tiada kaunter yang memenuhi kriteria pada masa ini.');
} else {
    console.table(results);
}
console.log('========================================================================\n');
