const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));

// We keep explicitSkips for junk/unwanted but NOT for mmcs, adnex which are active!
const explicitSkips = ['wentel-engineering', 'wentel', 'agmo'];

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated' };
    
    const effectiveStage = ipo.stage;
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

const activeStocks = data.filter(d => {
    if (d.stage !== 5 && d.status !== 'Listed') return false;
    if (!d.shariah) return false;
    
    const idLower = d.id.toLowerCase();
    const symbolLower = (d.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    
    // 1. Dynamic Grade Filter
    const grade = getIpoGrade(d).grade;
    const isMomentumRebound = typeof d.dailyChange === 'number' && d.dailyChange >= 10.0;
    
    if (grade !== 'A' && grade !== 'B' && !isSifuPick && !isMomentumRebound) return false;
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;
    
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.calibratedSifuTargetPrice || d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    const ipoPrice = d.price || 0;
    
    if (curPrice <= 0 || tp <= 0) return false;

    const upside = ((tp - curPrice) / curPrice) * 100;
    const isRecentListing = d.year >= 2025;
    const isDowntrend = (highPrice && isRecentListing) ? (curPrice <= highPrice * 0.75) : false;

    // Outliers check
    if (d.outlier && !isSifuPick && !isMomentumRebound) {
        if (upside < 10.0) return false;
    }
    
    // In Buy Zone? (Exempt if it is a major momentum rebound or Sifu pick!)
    if (curPrice > tp && !isMomentumRebound && !isSifuPick) return false;
    
    // Above IPO price?
    if (curPrice < ipoPrice && !isMomentumRebound) return false;
    
    // Anti-Fake TP Placeholder
    if (highPrice > 0 && Math.abs(tp - highPrice) < 0.005 && !isMomentumRebound) return false;
    
    // Minimum Upside (Exempt if it is a momentum rebound, near ATH, or Sifu pick!)
    const isActualAth = highPrice > 0 && curPrice >= (highPrice - 0.005);
    if (upside < 10.0 && !isActualAth && !isMomentumRebound && !isSifuPick) return false;
    
    // Anti-Stagnant (Exempt if it is a momentum rebound!)
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (d.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) return false;
    
    // Downtrend Safety Check (Exempt if it is a momentum rebound!)
    if (isDowntrend && !isMomentumRebound) return false;
    
    let isRecent = false;
    const isNearAth = highPrice ? (curPrice >= highPrice * 0.95) : false;
    if (d.listingDate) {
        const listDate = new Date(d.listingDate);
        const ageInDays = (new Date() - listDate) / (1000 * 60 * 60 * 24);
        isRecent = ageInDays <= 365;
    } else {
        isRecent = d.year >= 2024;
    }
    
    return isRecent || isSifuPick || isNearAth || isMomentumRebound;
});

const swingPicks = [];
const scalpPicks = [];

activeStocks.forEach(d => {
    const curPrice = d.currentPrice || d.price || 0;
    const tp = d.calibratedSifuTargetPrice || d.sifuTargetPrice || d.avgTP || 0;
    const highPrice = d.highPrice || 0;
    const dailyChange = d.dailyChange || 0;
    
    const upside = ((tp - curPrice) / curPrice) * 100;
    
    let trend = 'Uptrend';
    if (highPrice > 0 && curPrice <= highPrice * 0.90) {
        trend = 'Pullback (Healthy)';
    } else if (dailyChange >= 10.0) {
        trend = 'Momentum Rebound';
    } else if (dailyChange >= 3.0) {
        trend = 'Breakout';
    } else if (Math.abs(dailyChange) < 1.0) {
        trend = 'Consolidating';
    }
    
    const grade = getIpoGrade(d).grade;
    
    const stockInfo = {
        symbol: d.symbol || d.id.toUpperCase(),
        companyName: d.companyName,
        grade: grade,
        currentPrice: curPrice,
        sifuTP: tp,
        upside: parseFloat(upside.toFixed(1)),
        trend: trend,
        year: d.year,
        os: d.os || 'N/A'
    };

    const isAthOrNear = highPrice ? (curPrice >= highPrice * 0.95) : false;
    const isScalpTrend = isAthOrNear || dailyChange >= 3.0;
    
    const strategy = d.strategy || (isScalpTrend ? 'Scalp' : 'Swing');
    
    if (strategy.toLowerCase() === 'scalp') {
        scalpPicks.push(stockInfo);
    } else {
        swingPicks.push(stockInfo);
    }
});

swingPicks.sort((a, b) => b.upside - a.upside);
scalpPicks.sort((a, b) => b.upside - a.upside);

console.log('--- ACTIVE SWING PICKS V2 ---');
swingPicks.forEach(p => {
    console.log(`SWING|${p.symbol}|${p.companyName}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|Upside: ${p.upside}%|${p.trend}|${p.year}|${p.os}x`);
});

console.log('\n--- ACTIVE SCALP PICKS V2 ---');
scalpPicks.forEach(p => {
    console.log(`SCALP|${p.symbol}|${p.companyName}|${p.grade}|RM ${p.currentPrice.toFixed(3)}|RM ${p.sifuTP.toFixed(2)}|Upside: ${p.upside}%|${p.trend}|${p.year}|${p.os}x`);
});
