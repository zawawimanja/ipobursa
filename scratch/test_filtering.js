const fs = require('fs');
const path = require('path');

// Mock browser variables and functions
const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx'
];
const explicitSkips = ['agmo', 'wentel-engineering', 'wentel'];

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated' };
    
    const effectiveStage = (ipo.stage === 5 && !ipo.openPrice) ? 4 : ipo.stage;
    const os = ipo.os || 0;
    const hasOsData = ipo.os !== undefined && ipo.os !== null && ipo.os > 0;
    
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

// Load data.json
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));

const validPicks = data.filter(ipo => {
    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolio.includes(idLower) || sifuPortfolio.includes(symbolLower);
    const isMomentumRebound = typeof ipo.dailyChange === 'number' && ipo.dailyChange >= 10.0;

    // Allow Grade A or B, or Sifu picks regardless of grade, or momentum rebound (+10% gain)
    const grade = getIpoGrade(ipo).grade;
    if (grade !== 'A' && grade !== 'B' && !isSifuPick && !isMomentumRebound) return false;

    const curPrice = ipo.currentPrice || 0;
    const ipoPrice = ipo.price || 0;
    const passesIpoPriceCheck = curPrice >= ipoPrice || isMomentumRebound;

    const isMatch = ipo.shariah === true && 
        (ipo.stage === 5 || ipo.status === 'Listed') &&
        curPrice > 0 && 
        passesIpoPriceCheck;
    
    if (!isMatch) return false;

    // Age & Trend Filter: Only show recent IPOs (listed within 365 days) unless explicitly handpicked by Sifu OR currently near ATH (within 5%) OR it's a momentum rebound (+10% gain)
    if (!isSifuPick && !isMomentumRebound) {
        const isNearAth = ipo.highPrice ? (ipo.currentPrice >= ipo.highPrice * 0.95) : false;
        if (ipo.listingDate) {
            const listDate = new Date(ipo.listingDate);
            const ageInDays = (new Date() - listDate) / (1000 * 60 * 60 * 24);
            if (ageInDays > 365 && !isNearAth) return false;
        } else {
            const isRecent = ipo.year >= 2024;
            if (!isRecent && !isNearAth) return false;
        }
    }

    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0 ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100 : 0;

    // For new IPOs (listed 2025 or 2026), check if they are in a deep downtrend (down >= 25% from debut/historical peak)
    const isRecentListing = ipo.year >= 2025;
    const isDowntrend = (highPrice && isRecentListing) ? (ipo.currentPrice <= highPrice * 0.75) : false;

    // Exclude outlier stocks unless they are explicitly handpicked in Sifu's Portfolio OR momentum rebound (+10%) OR have corrected with decent upside (> 10%)
    if (ipo.outlier && !isSifuPick && !isMomentumRebound) {
        if (upside < 10.0) return false;
    }

    // Explicit skips
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;

    // Breakout Check: If the stock is making a new ATH (or within 0.5 sen of it), it is a momentum play
    const isActualAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);

    // 0. Fake TP Placeholder Filter (unless in active breakout or momentum rebound)
    if (!isActualAth && !isMomentumRebound && highPrice > 0 && Math.abs(targetPrice - highPrice) < 0.005) return false;

    // 1. Minimum Upside Rule & Pullback Accumulation Rule:
    if (targetPrice > 0) {
        if (upside < 10.0 && !isActualAth && !isMomentumRebound) {
            // If it has low/negative upside and is not at ATH, it can ONLY be included if it is in pullback accumulation (not in a downtrend)
            if (isDowntrend) return false;
        }
    } else {
        return false;
    }

    // 2. Anti-Stagnant (Sikat/Dead) Rule:
    const ipoPriceVal = ipo.price || 0;
    const highAboveIpo = highPrice ? ((highPrice - ipoPriceVal) / ipoPriceVal) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) return false;

    // 3. Downtrend Safety Check
    if (isDowntrend && !isMomentumRebound) return false;

    return true;
}).map(ipo => {
    const targetPrice = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0
        ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100
        : null;
    return { ...ipo, targetPrice, upside };
});

const swingList = [];
const scalpList = [];
const pullbackList = [];

validPicks.forEach(ipo => {
    const highPrice = ipo.highPrice || 0;
    const dailyChange = ipo.dailyChange || 0;
    
    // Strategy determination
    const isAthOrNear = highPrice ? (ipo.currentPrice >= highPrice * 0.95) : false;
    const isScalpTrend = isAthOrNear || (dailyChange !== null && dailyChange >= 3.0);
    
    let strategy = 'Swing';
    const hasIpoUpside = ipo.targetPrice > 0 ? (((ipo.targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100) : 0;
    const isRecentListingVal = ipo.year >= 2025;
    const isDowntrendVal = (highPrice && isRecentListingVal) ? (ipo.currentPrice <= highPrice * 0.75) : false;
    const isPullback = (hasIpoUpside < 10.0 && !isAthOrNear && !isDowntrendVal);
    
    if (isPullback) {
        strategy = 'Pullback';
    } else if (isScalpTrend || ipo.strategy === 'Scalp') {
        strategy = 'Scalp';
    } else {
        strategy = ipo.strategy || 'Swing';
    }

    if (strategy.toLowerCase() === 'scalp') {
        scalpList.push(ipo);
    } else if (strategy.toLowerCase() === 'pullback') {
        pullbackList.push(ipo);
    } else {
        swingList.push(ipo);
    }
});

console.log(`TOTAL SWING: ${swingList.length}`);
swingList.forEach(x => console.log(` - SWING: ${x.symbol || x.id}`));

console.log(`TOTAL SCALP: ${scalpList.length}`);
scalpList.forEach(x => console.log(` - SCALP: ${x.symbol || x.id}`));

console.log(`TOTAL PULLBACK: ${pullbackList.length}`);
pullbackList.forEach(x => console.log(` - PULLBACK: ${x.symbol || x.id}`));
