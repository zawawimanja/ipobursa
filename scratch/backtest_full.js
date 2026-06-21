const fs = require('fs');
const { execSync } = require('child_process');

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx', 'adnex', 'dnex'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));
const explicitSkips = ['agmo', 'wentel-engineering', 'wentel'];

// Chronological commits modifying data.json from May 8th to June 19th, 2026
const backtestDates = [
    { date: '2026-05-08', commit: '620c599' },
    { date: '2026-05-11', commit: 'be76322' },
    { date: '2026-05-12', commit: '1a9cdb8' },
    { date: '2026-05-19', commit: '0bebc4b' },
    { date: '2026-05-20', commit: 'a9bf277' },
    { date: '2026-05-21', commit: '4cc580a' },
    { date: '2026-05-25', commit: 'ee09e6a' },
    { date: '2026-05-26', commit: '7b6a213' },
    { date: '2026-05-29', commit: '1bac96c' },
    { date: '2026-06-09', commit: '65cb8f8' },
    { date: '2026-06-10', commit: '1ddd07c' },
    { date: '2026-06-11', commit: 'fa0f47d' },
    { date: '2026-06-12', commit: '8190973' },
    { date: '2026-06-15', commit: '0650a5c' },
    { date: '2026-06-16', commit: 'e3de97b' },
    { date: '2026-06-17', commit: '0004fbc' },
    { date: '2026-06-18', commit: '6a8498c' },
    { date: '2026-06-19', commit: 'c05d45c' }
];

// Helper to get database at a specific commit
const dbCache = {};
function getDbAtCommit(commit) {
    if (dbCache[commit]) return dbCache[commit];
    try {
        const content = execSync(`git show ${commit}:data.json`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const parsed = JSON.parse(content);
        dbCache[commit] = parsed;
        return parsed;
    } catch (e) {
        return [];
    }
}

// Get current database on disk (June 20/21)
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

const trades = [];

console.log("=================================================================================");
console.log("🚀 RUNNING FULL BACKTEST: 8 MAY - 19 JUNE, 2026");
console.log("=================================================================================\n");

backtestDates.forEach((bdate, dateIdx) => {
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
    
    // Score candidates
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
    
    // Filter by Top Picks logic
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
    
    topPicks.forEach((item, index) => {
        const ipo = item.ipo;
        const symbol = ipo.symbol || ipo.id.toUpperCase();
        const buyPrice = ipo.currentPrice;
        
        // Track subsequent prices
        const priceHistory = [];
        for (let i = dateIdx + 1; i < backtestDates.length; i++) {
            const p = getPriceAtDate(ipo.symbol || ipo.id, backtestDates[i]);
            if (p) priceHistory.push({ date: backtestDates[i].date, price: p });
        }
        const currentP = getPriceAtDate(ipo.symbol || ipo.id, { date: 'current' });
        if (currentP) priceHistory.push({ date: 'current', price: currentP });
        
        // Calculate max performance
        let maxPrice = buyPrice;
        priceHistory.forEach(h => {
            if (h.price > buyPrice * 10.0) return; // ignore massive data errors
            if (h.price > maxPrice) maxPrice = h.price;
        });
        
        const maxPerf = ((maxPrice - buyPrice) / buyPrice) * 100;
        const finalPerf = ((currentP - buyPrice) / buyPrice) * 100;
        
        const setupName = item.isNearAth ? 'RBS Retest' : (item.isHealthyDip ? 'Healthy Dip' : 'Pullback');
        const styleName = item.isNearAth ? (item.upside >= 15.0 ? 'Swing/Scalp' : 'Scalp') : 'Swing';
        
        // Only focus on Swing-suitable trades (filter out pure scalp plays that aren't swings)
        if (styleName === 'Scalp') return;
        
        trades.push({
            date: bdate.date,
            symbol,
            companyName: ipo.companyName,
            grade: item.grade,
            setup: setupName,
            buyPrice,
            maxPrice,
            maxPerf,
            finalPrice: currentP,
            finalPerf,
            isSifu: item.isSifuPick
        });
    });
});

// Group by unique symbol to see distinct stock performance
const uniqueStocks = {};
trades.forEach(t => {
    if (!uniqueStocks[t.symbol]) {
        uniqueStocks[t.symbol] = [];
    }
    uniqueStocks[t.symbol].push(t);
});

console.log("\n=================================================================================");
console.log("📈 SENARAI KEPUTUSAN SAHAM SWING (8 MEI - KINI)");
console.log("=================================================================================");

const uniqueSymbols = Object.keys(uniqueStocks).sort();

uniqueSymbols.forEach(sym => {
    const list = uniqueStocks[sym];
    console.log(`\nSaham: ${sym} (${list[0].companyName})`);
    console.log(`   - Gred: Gred ${list[0].grade} | Sifu Pick: ${list[0].isSifu ? 'YA' : 'TIDAK'}`);
    
    list.forEach(trade => {
        const statusStr = trade.maxPerf >= 10.0 ? '🔥 SUPER WIN (>=10%)' : (trade.maxPerf >= 4.0 ? '✅ WIN (>=4%)' : '❌ LOSE/HOLD');
        console.log(`     * Isyarat Beli: ${trade.date} | Harga Beli: RM ${trade.buyPrice.toFixed(3)} | Puncak: RM ${trade.maxPrice.toFixed(3)} (${trade.maxPerf.toFixed(1)}%) | Semasa: RM ${trade.finalPrice.toFixed(3)} (${trade.finalPerf >= 0 ? '+' : ''}${trade.finalPerf.toFixed(1)}%) | Status: ${statusStr}`);
    });
});

console.log("\n=================================================================================");
console.log("📊 KELAKUAN PRESTASI TRADE SECARA KESELURUHAN");
console.log("=================================================================================");
const totalTrades = trades.length;
const superWins = trades.filter(x => x.maxPerf >= 10.0).length;
const normalWins = trades.filter(x => x.maxPerf >= 4.0 && x.maxPerf < 10.0).length;
const totalWins = trades.filter(x => x.maxPerf >= 4.0).length;
const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
const superWinRate = totalTrades > 0 ? (superWins / totalTrades) * 100 : 0;

console.log(`Jumlah Posisi Swing Dibuka : ${totalTrades}`);
console.log(`Posisi Untung (>= 4% gain): ${totalWins} (${winRate.toFixed(1)}% Win Rate)`);
console.log(`Posisi Super Win (>= 10% gain): ${superWins} (${superWinRate.toFixed(1)}% Super Win Rate)`);
console.log("=================================================================================");
