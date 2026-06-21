const fs = require('fs');
const { execSync } = require('child_process');

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx', 'adnex', 'dnex'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));
const explicitSkips = ['agmo', 'wentel-engineering', 'wentel'];

// Commit maps for June 1st to June 15th, 2026 backtest
const backtestDates = [
    { date: '2026-05-29', commit: '1bac96c' },
    { date: '2026-06-09', commit: '65cb8f8' },
    { date: '2026-06-10', commit: '1ddd07c' },
    { date: '2026-06-11', commit: 'fa0f47d' },
    { date: '2026-06-12', commit: '8190973' },
    { date: '2026-06-15', commit: '0650a5c' }
];

// Helper to get database at a specific commit
function getDbAtCommit(commit) {
    try {
        const content = execSync(`git show ${commit}:data.json`, { encoding: 'utf8' });
        return JSON.parse(content);
    } catch (e) {
        console.error(`Error reading commit ${commit}:`, e.message);
        return [];
    }
}

// Get current database on disk (which represents June 20/21)
const currentDb = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Dynamic grade calculation matching sifu-picks.html
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
    const isFlat = ipo.openPrice && ipo.price && Math.abs(ipo.openPrice - ipo.price) < 0.005;
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

// Get price of a stock at a specific date
function getPriceAtDate(symbolOrId, dateObj) {
    if (dateObj.date === 'current') {
        const d = currentDb.find(x => x.id.toLowerCase() === symbolOrId.toLowerCase() || (x.symbol && x.symbol.toLowerCase() === symbolOrId.toLowerCase()));
        return d ? d.currentPrice : null;
    }
    const db = getDbAtCommit(dateObj.commit);
    const d = db.find(x => x.id.toLowerCase() === symbolOrId.toLowerCase() || (x.symbol && x.symbol.toLowerCase() === symbolOrId.toLowerCase()));
    return d ? d.currentPrice : null;
}

// Main backtest run
console.log("=================================================================================");
console.log("📈 IPO HUNTER STRATEGY BACKTEST: JUNE 1ST - JUNE 15TH, 2026");
console.log("=================================================================================\n");

const overallResults = [];

backtestDates.forEach((bdate, dateIdx) => {
    console.log(`📅 BACKTEST DATE: ${bdate.date} (Commit: ${bdate.commit})`);
    console.log(`---------------------------------------------------------------------------------`);
    
    const db = getDbAtCommit(bdate.commit);
    if (db.length === 0) return;
    
    // Filter candidates by our exact rules
    const filteredCandidates = db.filter(ipo => {
        const curPrice = ipo.currentPrice || 0;
        const ipoPrice = ipo.price || 0;
        const highPrice = ipo.highPrice || 0;
        const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
        const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
        const dailyChange = ipo.dailyChange || 0;
        const isMomentumRebound = typeof dailyChange === 'number' && dailyChange >= 10.0;
        
        // Shariah check
        if (ipo.shariah !== true) return false;
        
        // Stage 5 / Listed check
        if (ipo.status !== 'Listed' && ipo.stage !== 5) return false;
        
        // Safety: Must be above IPO price (unless momentum rebound)
        if (curPrice <= 0) return false;
        if (curPrice < ipoPrice && !isMomentumRebound) return false;
        
        // Age filter (unless sifu pick or momentum rebound)
        const idLower = ipo.id ? ipo.id.toLowerCase() : '';
        const symbolLower = (ipo.symbol || '').toLowerCase();
        const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
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
        
        // Downtrend check
        const isRecentListing = ipo.year >= 2025;
        const isDowntrend = (highPrice && isRecentListing) ? (ipo.currentPrice <= highPrice * 0.75) : false;
        if (isDowntrend && !isMomentumRebound) return false;
        
        // Healthy pullback for recent IPOs (2024+)
        const isRecentIpo = ipo.year >= 2024;
        const isHealthyPullback = highPrice ? (curPrice >= highPrice * 0.80) : true;
        if (isRecentIpo && !isHealthyPullback && !isMomentumRebound) return false;
        
        // Skip list
        if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;
        
        return true;
    });
    
    // Score each candidate
    const scored = filteredCandidates.map(ipo => {
        const curPrice = ipo.currentPrice || 0;
        const highPrice = ipo.highPrice || 0;
        const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
        const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
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
        
        if (upside > 0) {
            score += Math.min(30, upside * 0.5);
        } else {
            score -= 100;
        }
        
        const isPortfolio = sifuPortfolioSet.has((ipo.id || '').toLowerCase()) || sifuPortfolioSet.has((ipo.symbol || '').toLowerCase());
        if (isPortfolio) score += 20;
        
        return { ipo, score, distToAth, grade, isNearAth, isHealthyDip, upside, isSifuPick: isPortfolio };
    });
    
    // Tighten rules for Top Picks Grid
    let scoredPicks = scored.filter(x => {
        if (x.upside < 10.0) return false;
        
        const isActualAth = x.ipo.highPrice > 0 && x.ipo.currentPrice >= (x.ipo.highPrice - 0.005);
        const isMomentumRebound = typeof x.ipo.dailyChange === 'number' && x.ipo.dailyChange >= 10.0;
        
        if (x.grade === 'C' && !isActualAth && !isMomentumRebound && !x.isSifuPick && x.distToAth > 20.0) return false;
        return true;
    });
    
    // Sort and select Top 5
    scoredPicks.sort((a, b) => b.score - a.score);
    const topPicks = scoredPicks.slice(0, 5);
    
    if (topPicks.length === 0) {
        console.log("   Tiada kaunter melepasi tapisan pada tarikh ini.\n");
        return;
    }
    
    topPicks.forEach((item, index) => {
        const ipo = item.ipo;
        const symbol = ipo.symbol || ipo.id.toUpperCase();
        const buyPrice = ipo.currentPrice;
        
        // Track subsequent performance
        const priceHistory = [];
        // Future commits in this backtest loop
        for (let i = dateIdx + 1; i < backtestDates.length; i++) {
            const p = getPriceAtDate(ipo.symbol || ipo.id, backtestDates[i]);
            if (p) priceHistory.push({ date: backtestDates[i].date, price: p });
        }
        // Current price (June 20/21)
        const currentP = getPriceAtDate(ipo.symbol || ipo.id, { date: 'current' });
        if (currentP) priceHistory.push({ date: '2026-06-20 (Current)', price: currentP });
        
        // Calculate max price and gain reached in future
        let maxPrice = buyPrice;
        priceHistory.forEach(h => {
            // Outlier check: ignore prices that are 10x larger than buyPrice (data entry errors in history)
            if (h.price > buyPrice * 10.0) return;
            if (h.price > maxPrice) maxPrice = h.price;
        });
        const maxPerf = ((maxPrice - buyPrice) / buyPrice) * 100;
        const finalPerf = ((currentP - buyPrice) / buyPrice) * 100;
        
        const setupName = item.isNearAth ? 'RBS Retest' : (item.isHealthyDip ? 'Healthy Dip' : 'Pullback');
        const styleName = item.isNearAth ? (item.upside >= 15.0 ? 'Swing/Scalp' : 'Scalp') : 'Swing';
        const displayTP = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
        
        console.log(`Top #${index + 1}: ${ipo.companyName} (${symbol})`);
        console.log(`   * Gred: Gred ${item.grade} | Setup: ${setupName} | Style: ${styleName}`);
        console.log(`   * Harga Beli: RM ${buyPrice.toFixed(3)} | Sifu TP: RM ${displayTP.toFixed(2)} (Upside: ${item.upside.toFixed(1)}%)`);
        console.log(`   * Harga Puncak Seterusnya: RM ${maxPrice.toFixed(3)} (Max Gain: +${maxPerf.toFixed(1)}%)`);
        console.log(`   * Harga Semasa (20 Jun): RM ${currentP.toFixed(3)} (Return Semasa: ${finalPerf >= 0 ? '+' : ''}${finalPerf.toFixed(1)}%)`);
        console.log();
        
        overallResults.push({
            date: bdate.date,
            symbol,
            companyName: ipo.companyName,
            buyPrice,
            maxPrice,
            maxPerf,
            finalPerf,
            success: maxPerf >= 4.0 || finalPerf >= 0
        });
    });
});

console.log("=================================================================================");
console.log("📊 RINGKASAN PRESTASI BACKTEST (1 JUN - 15 JUN)");
console.log("=================================================================================");
const totalTrades = overallResults.length;
const profitableTrades = overallResults.filter(x => x.maxPerf >= 4.0).length; // 4% is typical swing target
const flatOrWinTrades = overallResults.filter(x => x.finalPerf >= 0 || x.maxPerf >= 4.0).length;
const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
const successRate = totalTrades > 0 ? (flatOrWinTrades / totalTrades) * 100 : 0;

console.log(`Jumlah Kategori Isyarat : ${totalTrades}`);
console.log(`Untung Kasar (>= 4% gain): ${profitableTrades} (${winRate.toFixed(1)}% Win Rate)`);
console.log(`Success Rate (Flat/Untung): ${flatOrWinTrades} (${successRate.toFixed(1)}% Success Rate)`);
console.log("=================================================================================");
