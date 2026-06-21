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
    { date: '2026-06-19', commit: 'c05d45c' },
    { date: '2026-06-20', commit: 'ac11d4b' },
    { date: '2026-06-21', commit: 'b6b76ff' },
    { date: '2026-06-22', commit: 'current' }
];

const dbCache = {};
function getDbAtCommit(commit) {
    if (commit === 'current') {
        return JSON.parse(fs.readFileSync('data.json', 'utf8'));
    }
    if (dbCache[commit]) return dbCache[commit];
    try {
        const content = execSync(`git show ${commit}:data.json`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const parsed = JSON.parse(content);
        dbCache[commit] = parsed;
        return parsed;
    } catch (e) {
        // Patch for invalid JSON commits in git history
        if (commit === 'be76322' || commit === '1a9cdb8') {
            const prevDb = getDbAtCommit('620c599');
            const patchedDb = JSON.parse(JSON.stringify(prevDb));
            const inspace = patchedDb.find(x => x.id === 'inspace-creation');
            if (inspace) {
                inspace.currentPrice = 0.225; // actual price from Bursa
            }
            dbCache[commit] = patchedDb;
            return patchedDb;
        }
        return [];
    }
}

// Get current database on disk
const currentDb = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Helper function to find a stock by symbol first, then ID
function findStock(db, searchStr) {
    if (!searchStr) return null;
    const searchLower = searchStr.toLowerCase();
    let match = db.find(x => x.symbol && x.symbol.toLowerCase() === searchLower);
    if (match) return match;
    return db.find(x => x.id && x.id.toLowerCase() === searchLower);
}

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

// SIMULATION PORTFOLIO
const activeTrades = []; // { symbol, companyName, buyPrice, buyDate, tp, maxPriceReached: number }
const closedTrades = []; // { symbol, companyName, buyPrice, buyDate, exitPrice, exitDate, returnPct, status }

console.log("=================================================================================");
console.log("📈 REALISTIC BACKTEST: UNIQUE SWING CYCLES ONLY (NO DOUBLE COUNTING)");
console.log("=================================================================================\n");

backtestDates.forEach((bdate, dateIdx) => {
    const db = getDbAtCommit(bdate.commit);
    if (db.length === 0) return;
    
    // 1. UPDATE ACTIVE TRADES WITH TODAY'S PRICES
    for (let i = activeTrades.length - 1; i >= 0; i--) {
        const trade = activeTrades[i];
        
        // Find stock current price on this date (match symbol first, then ID)
        const stockData = findStock(db, trade.symbol);
        if (!stockData) continue;
        
        const curPrice = stockData.currentPrice || 0;
        if (curPrice <= 0) continue;
        
        // Ignore scraper outliers
        if (curPrice > trade.buyPrice * 10.0) continue;
        
        if (curPrice > trade.maxPriceReached) {
            trade.maxPriceReached = curPrice;
        }
        
        const currentGain = ((curPrice - trade.buyPrice) / trade.buyPrice) * 100;
        const maxGain = ((trade.maxPriceReached - trade.buyPrice) / trade.buyPrice) * 100;
        
        // EXIT CONDITIONS
        const targetPrice = trade.tp;
        const stopLossPrice = trade.buyPrice * 0.93; // Fixed 7% Cut Loss
        
        // 1. Check for Partial TP (Hits +10% gain)
        if (maxGain >= 10.0 && !trade.partialTpHit) {
            closedTrades.push({
                symbol: trade.symbol,
                companyName: trade.companyName,
                buyPrice: trade.buyPrice,
                buyDate: trade.buyDate,
                exitPrice: trade.buyPrice * 1.10,
                exitDate: bdate.date,
                returnPct: 10.0,
                status: '✅ PARTIAL TP (50%)',
                weight: 0.5
            });
            trade.partialTpHit = true;
            trade.size = 0.5;
            trade.trailActivated = true;
        }
        
        let hasHitTp = false;
        let finalExitPrice = curPrice;
        let exitStatus = '';
        
        // 2. Check Sifu TP (Exit remaining or full size if reached targetPrice)
        if (targetPrice > 0 && curPrice >= targetPrice) {
            hasHitTp = true;
            finalExitPrice = curPrice;
            exitStatus = trade.partialTpHit ? '✅ TP REMAINING (50% Sifu TP)' : '✅ PROFIT (100% Sifu TP)';
        } 
        // 3. Check Trailing Stop (Active once we hit 10% max gain, exit 5% below peak, but no lower than breakeven for partials)
        else if (trade.trailActivated) {
            const trailingStopPrice = trade.maxPriceReached * 0.95;
            const floorPrice = trade.partialTpHit ? trade.buyPrice : stopLossPrice;
            const exitTriggerPrice = Math.max(trailingStopPrice, floorPrice);
            
            if (curPrice <= exitTriggerPrice) {
                hasHitTp = true;
                finalExitPrice = exitTriggerPrice;
                exitStatus = trade.partialTpHit 
                    ? (exitTriggerPrice > trade.buyPrice ? '✅ TRAILING EXIT (50% remaining)' : '⏳ BREAKEVEN EXIT (50% remaining)')
                    : '✅ PROFIT (Trailing Stop)';
            }
        }
        
        // 4. Check Stop Loss (only if no partial TP hit, and price falls below stopLossPrice or original IPO price)
        const hasHitSl = !hasHitTp && !trade.partialTpHit && (curPrice <= stopLossPrice || (stockData.price && curPrice < stockData.price));
        
        if (hasHitTp) {
            const returnPct = ((finalExitPrice - trade.buyPrice) / trade.buyPrice) * 100;
            closedTrades.push({
                symbol: trade.symbol,
                companyName: trade.companyName,
                buyPrice: trade.buyPrice,
                buyDate: trade.buyDate,
                exitPrice: finalExitPrice,
                exitDate: bdate.date,
                returnPct: returnPct,
                status: exitStatus,
                weight: trade.size || 1.0
            });
            activeTrades.splice(i, 1);
        } else if (hasHitSl) {
            // Close with loss
            const finalExitPrice = curPrice;
            const returnPct = ((finalExitPrice - trade.buyPrice) / trade.buyPrice) * 100;
            closedTrades.push({
                symbol: trade.symbol,
                companyName: trade.companyName,
                buyPrice: trade.buyPrice,
                buyDate: trade.buyDate,
                exitPrice: finalExitPrice,
                exitDate: bdate.date,
                returnPct: returnPct,
                status: '❌ CUT LOSS (100%)',
                weight: 1.0
            });
            activeTrades.splice(i, 1);
        }
    }
    
    // 2. RUN FILTER FOR NEW SIGNALS ON THIS DATE
    const filteredCandidates = db.filter(ipo => {
        const curPrice = ipo.currentPrice || 0;
        const ipoPrice = ipo.price || 0;
        const highPrice = ipo.highPrice || 0;
        const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
        const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
        const dailyChange = ipo.dailyChange || 0;
        const isMomentumRebound = typeof dailyChange === 'number' && dailyChange >= 10.0;
        
        if (ipo.shariah !== true) return false;
        if (ipo.status !== 'Listed' && ipo.stage !== 5) return false;
        if (curPrice <= 0) return false;
        if (curPrice < ipoPrice && !isMomentumRebound) return false;
        
        // Age Filter
        const idLower = ipo.id ? ipo.id.toLowerCase() : '';
        const symbolLower = (ipo.symbol || '').toLowerCase();
        const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
        const distToAth = highPrice ? ((highPrice - curPrice) / curPrice) * 100 : 0;
        
        if (ipo.listingDate) {
            const listDate = new Date(ipo.listingDate);
            const ageInDays = (new Date(bdate.date) - listDate) / (1000 * 60 * 60 * 24);
            if (ageInDays >= 0 && ageInDays <= 1) return false; // Skip listing day 1 & 2 swing entry
            if (!isSifuPick && !isMomentumRebound && ageInDays > 365 && distToAth > 5.0) return false;
        } else {
            const isRecent = ipo.year >= 2024;
            if (!isSifuPick && !isMomentumRebound && !isRecent && distToAth > 5.0) return false;
        }
        
        // Downtrend check
        const isRecentListing = ipo.year >= 2025;
        const isDowntrend = (highPrice && isRecentListing) ? (ipo.currentPrice <= highPrice * 0.75) : false;
        if (isDowntrend && !isMomentumRebound) return false;
        
        // Pullback filter
        const isRecentIpo = ipo.year >= 2024;
        const isHealthyPullback = highPrice ? (curPrice >= highPrice * 0.80) : true;
        if (isRecentIpo && !isHealthyPullback && !isMomentumRebound) return false;
        
        if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;
        
        return true;
    });
    
    // Score
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
    
    // Filter top picks
    let scoredPicks = scored.filter(x => {
        if (x.upside < 10.0) return false;
        const isActualAth = x.ipo.highPrice > 0 && x.ipo.currentPrice >= (x.ipo.highPrice - 0.005);
        const isMomentumRebound = typeof x.ipo.dailyChange === 'number' && x.ipo.dailyChange >= 10.0;
        
        if (x.grade === 'C' && !isActualAth && !isMomentumRebound && !x.isSifuPick && x.distToAth > 20.0) return false;
        return true;
    });
    
    // Select Top 5
    scoredPicks.sort((a, b) => b.score - a.score);
    const top5 = scoredPicks.slice(0, 5);
    
    top5.forEach(item => {
        const ipo = item.ipo;
        const symbol = ipo.symbol || ipo.id.toUpperCase();
        
        // Verify style is Swing
        const isNearAth = item.distToAth <= 5.0 && item.distToAth >= 0;
        const styleName = isNearAth ? (item.upside >= 15.0 ? 'Swing/Scalp' : 'Scalp') : 'Swing';
        if (styleName === 'Scalp') return; // skip pure scalps
        
        // CHECK IF ALREADY HOLDING THIS STOCK
        const isHolding = activeTrades.some(t => t.symbol.toLowerCase() === symbol.toLowerCase());
        const isClosedRecently = closedTrades.some(t => t.symbol.toLowerCase() === symbol.toLowerCase() && t.exitDate === bdate.date);
        
        if (!isHolding && !isClosedRecently) {
            const tpVal = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
            activeTrades.push({
                symbol,
                companyName: ipo.companyName,
                buyPrice: ipo.currentPrice,
                buyDate: bdate.date,
                tp: tpVal,
                maxPriceReached: ipo.currentPrice,
                size: 1.0,
                partialTpHit: false
            });
        }
    });
});

// CLOSE OUTSTANDING ACTIVE TRADES AT THE END (CURRENT VALUE)
activeTrades.forEach(trade => {
    const stockData = findStock(currentDb, trade.symbol);
    const finalPrice = stockData ? stockData.currentPrice : trade.buyPrice;
    const returnPct = ((finalPrice - trade.buyPrice) / trade.buyPrice) * 100;
    closedTrades.push({
        symbol: trade.symbol,
        companyName: trade.companyName,
        buyPrice: trade.buyPrice,
        buyDate: trade.buyDate,
        exitPrice: finalPrice,
        exitDate: '2026-06-20 (Current)',
        returnPct: returnPct,
        status: trade.partialTpHit ? '⏳ HOLDING (50% remaining)' : '⏳ HOLDING (100%)',
        weight: trade.size || 1.0
    });
});

// PRINT OUT REALISTIC RESULTS
console.log("=================================================================================");
console.log("📋 TRANSAKSI SWING TRADING REALISTIK (TANPA DOUBLE COUNTING)");
console.log("=================================================================================");

closedTrades.forEach((t, idx) => {
    const sz = ((t.weight || 1.0) * 100).toFixed(0);
    console.log(`${idx + 1}. [${t.status}] ${t.symbol} (${t.companyName}) [Saiz: ${sz}%]`);
    console.log(`   - Masuk: ${t.buyDate} @ RM ${t.buyPrice.toFixed(3)}`);
    console.log(`   - Keluar/Status: ${t.exitDate} @ RM ${t.exitPrice.toFixed(3)}`);
    console.log(`   - Pulangan: ${t.returnPct >= 0 ? '+' : ''}${t.returnPct.toFixed(1)}%`);
    console.log();
});

console.log("=================================================================================");
console.log("📊 RINGKASAN PORTFOLIO REALISTIK");
console.log("=================================================================================");
const total = closedTrades.reduce((acc, x) => acc + (x.weight || 1.0), 0);
const wins = closedTrades.filter(x => x.returnPct >= 4.0).reduce((acc, x) => acc + (x.weight || 1.0), 0);
const losses = closedTrades.filter(x => x.returnPct < 0).reduce((acc, x) => acc + (x.weight || 1.0), 0);
const flat = closedTrades.filter(x => x.returnPct >= 0 && x.returnPct < 4.0).reduce((acc, x) => acc + (x.weight || 1.0), 0);
const winRate = total > 0 ? (wins / total) * 100 : 0;

const totalNetReturn = closedTrades.reduce((acc, x) => acc + x.returnPct * (x.weight || 1.0), 0);
const avgReturnPerTrade = total > 0 ? totalNetReturn / total : 0;

console.log(`Jumlah Posisi Swing Unik : ${total.toFixed(1)}`);
console.log(`Untung (>= 4% gain)     : ${wins.toFixed(1)} (${((wins/total)*100).toFixed(1)}%)`);
console.log(`Breakeven (0% - 4% gain) : ${flat.toFixed(1)} (${((flat/total)*100).toFixed(1)}%)`);
console.log(`Rugi (< 0% loss)         : ${losses.toFixed(1)} (${((losses/total)*100).toFixed(1)}%)`);
console.log(`Win Rate (Target 4%+)    : ${winRate.toFixed(1)}%`);
console.log(`Purata Pulangan Per Trade: ${avgReturnPerTrade >= 0 ? '+' : ''}${avgReturnPerTrade.toFixed(1)}%`);
console.log(`Jumlah Keuntungan Bersih : ${totalNetReturn >= 0 ? '+' : ''}${totalNetReturn.toFixed(1)}%`);
console.log("=================================================================================");
