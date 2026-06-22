const fs = require('fs');
const path = require('path');

const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf',
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad',
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx', 'adnex', 'dnex'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));
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

// ---------------------------
// FILTER & SCORE LOGIC
// ---------------------------
const validPicks = db.filter(ipo => {
    const idLower = ipo.id ? ipo.id.toLowerCase() : '';
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    const isMomentumRebound = typeof ipo.dailyChange === 'number' && ipo.dailyChange >= 10.0;

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

    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0 ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100 : 0;
    const distToAth = highPrice ? ((highPrice - curPrice) / curPrice) * 100 : 0;
    const isUnderIpo = curPrice < ipoPrice;

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

    const isRecentListing = ipo.year >= 2025;
    const isDowntrend = (highPrice && isRecentListing) ? (ipo.currentPrice <= highPrice * 0.75) : false;

    if (ipo.outlier && !isSifuPick && !isMomentumRebound) {
        if (upside < 10.0) return false;
    }

    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;

    const isActualAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);
    if (!isActualAth && !isMomentumRebound && highPrice > 0 && Math.abs(targetPrice - highPrice) < 0.005) return false;

    if (targetPrice > 0) {
        if (upside < 10.0 && !isActualAth && !isMomentumRebound) {
            if (isDowntrend) return false;
        }
    } else {
        return false;
    }

    const ipoPriceVal = ipo.price || 0;
    const highAboveIpo = highPrice ? ((highPrice - ipoPriceVal) / ipoPriceVal) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) return false;
    if (isDowntrend && !isMomentumRebound) return false;

    const isRecentIpo = ipo.year >= 2024;
    const isHealthyPullback = highPrice ? (curPrice >= highPrice * 0.80) : true;
    if (isRecentIpo && !isHealthyPullback && !isMomentumRebound) return false;

    return true;
}).map(ipo => {
    const targetPrice = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0 ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100 : null;
    return { ...ipo, targetPrice, upside };
});

// Scoring Top 4 Grid logic
let scoredPicks = validPicks.map(ipo => {
    const curPrice = ipo.currentPrice || 0;
    const highPrice = ipo.highPrice || 0;
    const tp = ipo.targetPrice || 0;
    const upside = ipo.upside || 0;
    const distToAth = highPrice ? ((highPrice - curPrice) / curPrice) * 100 : 0;
    const grade = getIpoGrade(ipo).grade;

    let score = 0;
    if (grade === 'A') score += 100;
    else if (grade === 'B') score += 80;
    else if (grade === 'C') score += 40;

    const isNearAth = distToAth <= 5.0 && distToAth >= 0;
    const isHealthyDip = distToAth > 5.0 && distToAth <= 20.0;

    if (isNearAth) score += 50;
    else if (isHealthyDip) score += 30;
    else score += 10;

    const momentumThreshold = curPrice >= 1.00 ? 5.0 : 10.0;
    if (upside > 0) {
        score += Math.min(30, upside * 0.5);
    } else if (!isNearAth && (typeof ipo.dailyChange !== 'number' || ipo.dailyChange < momentumThreshold)) {
        score -= 100;
    }

    const isActualAth = highPrice > 0 && curPrice >= (highPrice - 0.005);
    if (isActualAth || (typeof ipo.dailyChange === 'number' && ipo.dailyChange >= momentumThreshold)) {
        score += 80;
    }

    const isPortfolio = sifuPortfolioSet.has((ipo.id || '').toLowerCase()) || sifuPortfolioSet.has((ipo.symbol || '').toLowerCase());
    if (isPortfolio) score += 20;

    const styleName = isNearAth ? (upside >= 15.0 ? 'Swing/Scalp' : 'Scalp') : 'Swing';

    return { ipo, score, distToAth, grade, isNearAth, isHealthyDip, styleName, upside };
});

// Apply our tightened filter overrides!
scoredPicks = scoredPicks.filter(x => {
    const isActualAth = x.ipo.highPrice > 0 && x.ipo.currentPrice >= (x.ipo.highPrice - 0.005);
    const momentumThreshold = x.ipo.currentPrice >= 1.00 ? 5.0 : 10.0;
    const isMomentumRebound = typeof x.ipo.dailyChange === 'number' && x.ipo.dailyChange >= momentumThreshold;
    const isSifuPick = sifuPortfolioSet.has((x.ipo.id || '').toLowerCase()) || sifuPortfolioSet.has((x.ipo.symbol || '').toLowerCase());

    if (x.upside < 10.0 && !isActualAth && !isMomentumRebound && !isSifuPick) return false;
    
    // Discard if Grade is C, UNLESS it is at ATH breakout, a momentum rebound, a Sifu Portfolio stock, or in a Healthy Dip/RBS Retest (distToAth <= 20%) to ride strong trends Sifu might have missed
    if (x.grade === 'C' && !isActualAth && !isMomentumRebound && !isSifuPick && x.distToAth > 20.0) return false;
    return true;
});

// Filter by Swing style
const swingPicks = scoredPicks.filter(x => x.styleName.includes('Swing'));
swingPicks.sort((a, b) => b.score - a.score);

console.log('\n--- NEW TOP SWING PICKS ---');
swingPicks.slice(0, 5).forEach((item, index) => {
    console.log(`Top #${index+1}: ${item.ipo.companyName} (${item.ipo.symbol || item.ipo.id})`);
    console.log(`  Grade: Gred ${item.grade}`);
    console.log(`  Price: RM ${item.ipo.currentPrice.toFixed(3)}`);
    console.log(`  Sifu TP: RM ${Number(item.ipo.targetPrice || 0).toFixed(2)}`);
    console.log(`  Upside: +${item.upside.toFixed(1)}%`);
    console.log(`  Distance to ATH: ${item.distToAth.toFixed(1)}%`);
    console.log(`  Setup: ${item.isNearAth ? 'RBS Retest' : (item.isHealthyDip ? 'Healthy Dip' : 'Pullback')}`);
    console.log(`  Score: ${item.score.toFixed(1)}`);
    console.log('-----------------------------');
});
