const fs = require('fs');
const path = require('path');

// 1. Load data.json
const DATA_FILE = path.join(__dirname, 'data.json');
if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ Ralat: Fail data.json tidak dijumpai di direktori utama!');
    process.exit(1);
}
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Sifu's core portfolio list
const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx', 'adnex', 'dnex'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));
const explicitSkips = ['wentel-engineering', 'wentel', 'agmo'];

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

// Global grading algorithm (synchronized with sifu-picks.html)
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

console.log('========================================================================');
console.log('🚀 LAPORAN PAGI HARIAN (MORNING BRIEF & SCANS) — BURSA IPO TRACKER');
console.log('========================================================================');

// ---------------------------------------------------------
// SEKSYEN 1: SCANNER SAHAM BREAKOUT / MOMENTUM TERKINI
// ---------------------------------------------------------
console.log('\n🔍 JADUAL 1: SAHAM BREAKOUT & MOMENTUM HAMPIR ATH (PRICE < RM 3.00)');
console.log('------------------------------------------------------------------------');

const morningResults = db.filter(ipo => {
    if (ipo.stage !== 5 && ipo.status !== 'Listed') return false;
    if (ipo.shariah !== true) return false;
    
    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    
    const grade = getIpoGrade(ipo).grade;
    const isMomentumRebound = typeof ipo.dailyChange === 'number' && ipo.dailyChange >= 10.0;
    
    if (grade !== 'A' && grade !== 'B' && !isSifuPick && !isMomentumRebound) return false;
    
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

    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0 ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100 : 0;
    const isRecentListing = ipo.year >= 2025;
    const isDowntrend = (highPrice && isRecentListing) ? (ipo.currentPrice <= highPrice * 0.75) : false;

    if (ipo.outlier && !isSifuPick && !isMomentumRebound) {
        if (upside < 10.0) return false;
    }
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return false;
    if (ipo.currentPrice >= 3.00) return false;

    const isActualAth = highPrice > 0 && ipo.currentPrice >= (highPrice - 0.005);
    if (!isActualAth && !isMomentumRebound && highPrice > 0 && Math.abs(targetPrice - highPrice) < 0.005) return false;

    const ipoPrice = ipo.price || 0;
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;

    if (ipo.currentPrice < ipoPrice && !isMomentumRebound) return false;
    if (ipo.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) return false;
    if (isDowntrend && !isMomentumRebound) return false;

    const isNearAth = highPrice > 0 && ipo.currentPrice >= (highPrice * 0.95);
    return isActualAth || isNearAth || isMomentumRebound;
}).map(ipo => {
    const highPrice = ipo.highPrice || 0;
    const targetPrice = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0 ? ((targetPrice - ipo.currentPrice) / ipo.currentPrice) * 100 : null;

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
        Symbol: ipo.symbol || ipo.id.toUpperCase(),
        Name: ipo.companyName.substring(0, 20),
        'Price (RM)': ipo.currentPrice.toFixed(3),
        'ATH (RM)': highPrice.toFixed(3),
        'Sifu TP': targetPrice > 0 ? `RM ${targetPrice.toFixed(2)}` : 'N/A',
        Upside: upside ? `${upside.toFixed(1)}%` : 'N/A',
        Status: status,
        Grade: `Gred ${grade}`
    };
});

if (morningResults.length === 0) {
    console.log('  ❌ Tiada kaunter breakout panas dikesan pagi ini.');
} else {
    console.table(morningResults);
}

// ---------------------------------------------------------
// SEKSYEN 2: KATEGORI SWING & SCALP WATCHLIST TERKINI
// ---------------------------------------------------------
console.log('\n📈 JADUAL 2: SENARAI PRO AKTIF (SWING vs SCALP PORTFOLIO)');
console.log('------------------------------------------------------------------------');

const activeStocks = db.filter(d => {
    if (d.stage !== 5 && d.status !== 'Listed') return false;
    if (!d.shariah) return false;
    
    const idLower = d.id.toLowerCase();
    const symbolLower = (d.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    
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

    if (d.outlier && !isSifuPick && !isMomentumRebound) {
        if (upside < 10.0) return false;
    }
    
    if (curPrice > tp && !isMomentumRebound && !isSifuPick) return false;
    if (curPrice < ipoPrice && !isMomentumRebound) return false;
    if (highPrice > 0 && Math.abs(tp - highPrice) < 0.005 && !isMomentumRebound) return false;
    
    const isActualAth = highPrice > 0 && curPrice >= (highPrice - 0.005);
    if (upside < 10.0 && !isActualAth && !isMomentumRebound && !isSifuPick) return false;
    
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (d.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) return false;
    if (isDowntrend && !isMomentumRebound) return false;
    
    // Filter out recent IPOs (2024+) that have dropped more than 20% from ATH (unhealthy pullback), unless they are a momentum rebound.
    // For older IPOs (before 2024), their ATH is historical, so we don't apply the 20% ATH-drop rule.
    const isRecentIpo = d.year >= 2024;
    const isHealthyPullback = highPrice ? (curPrice >= highPrice * 0.80) : true;
    if (isRecentIpo && !isHealthyPullback && !isMomentumRebound) return false;
    
    const distToAth = highPrice ? ((highPrice - curPrice) / curPrice) * 100 : 0;
    const isUnderIpo = curPrice < ipoPrice;
    const isRbsRetest = distToAth > 1.0 && distToAth <= 5.0;
    const isDeepRebound = distToAth > 5.0 && typeof d.dailyChange === 'number' && d.dailyChange >= 10.0;
    const isHealthyDip = curPrice >= highPrice * 0.80 && !isUnderIpo && upside >= 10.0 && distToAth > 5.0;
    const isUnderwaterRebound = isUnderIpo && typeof d.dailyChange === 'number' && d.dailyChange >= 5.0;
    const isPullbackSetup = isRbsRetest || isDeepRebound || isHealthyDip || isUnderwaterRebound;

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
        Symbol: d.symbol || d.id.toUpperCase(),
        Name: d.companyName.substring(0, 18),
        Grade: `Gred ${grade}`,
        'Price (RM)': curPrice.toFixed(3),
        'Sifu TP': `RM ${tp.toFixed(2)}`,
        'Upside': upside ? `${upside.toFixed(1)}%` : 'N/A',
        Trend: trend
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

swingPicks.sort((a, b) => parseFloat(b.Upside) - parseFloat(a.Upside));
scalpPicks.sort((a, b) => parseFloat(b.Upside) - parseFloat(a.Upside));

console.log('\n⚓ KUMPULAN 1: SWING WATCHLIST (Akaun Pelaburan CDS 1)');
if (swingPicks.length === 0) {
    console.log('  Tiada kaunter Swing aktif.');
} else {
    console.table(swingPicks);
}

console.log('\n⚡ KUMPULAN 2: SCALP WATCHLIST (Akaun Trading CDS 2)');
if (scalpPicks.length === 0) {
    console.log('  Tiada kaunter Scalp aktif.');
} else {
    console.table(scalpPicks);
}

// ---------------------------------------------------------
// SEKSYEN 3: DIAGNOSTIK 4 KATEGORI PULLBACK CUSTOM KITA
// ---------------------------------------------------------
console.log('\n🔍 JADUAL 3: DIAGNOSTIK 4 FOMULA PULLBACK / DIP KITA (ZON BELI SUPPORT)');
console.log('------------------------------------------------------------------------');

const pullbackSetups = {
    rbsRetest: [],
    deepPullbackRebound: [],
    healthyDipSwing: [],
    underwaterTurnaround: []
};

activeStocks.forEach(ipo => {
    if (ipo.stage !== 5 && ipo.status !== 'Listed') return;
    if (!ipo.shariah) return;

    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolioSet.has(idLower) || sifuPortfolioSet.has(symbolLower);
    
    const curPrice = ipo.currentPrice || 0;
    const highPrice = ipo.highPrice || 0;
    const ipoPrice = ipo.price || 0;
    const dailyChange = ipo.dailyChange || 0;
    const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    
    if (curPrice <= 0 || highPrice <= 0) return;
    if (curPrice > 3.00 && idLower !== 'solarvest') return; // Filter out expensive ones except solarvest

    const distToAth = ((highPrice - curPrice) / curPrice) * 100;
    const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
    const isUnderIpo = curPrice < ipoPrice;
    const grade = getIpoGrade(ipo).grade;

    if (grade !== 'A' && grade !== 'B' && !isSifuPick) return;
    if (explicitSkips.includes(idLower) || explicitSkips.includes(symbolLower)) return;

    const stockInfo = {
        Symbol: ipo.symbol || idLower.toUpperCase(),
        'Price (RM)': curPrice.toFixed(3),
        'ATH (RM)': highPrice.toFixed(3),
        'Dist to ATH': `${distToAth.toFixed(1)}%`,
        Upside: `${upside.toFixed(1)}%`
    };

    // Classify into our 4 customized pullback/dip formulas
    if (distToAth > 1.0 && distToAth <= 5.0) {
        pullbackSetups.rbsRetest.push(stockInfo);
    } else if (distToAth > 5.0 && dailyChange >= 10.0) {
        stockInfo.Rebound = `+${dailyChange.toFixed(1)}%`;
        pullbackSetups.deepPullbackRebound.push(stockInfo);
    } else if (curPrice >= highPrice * 0.80 && !isUnderIpo && upside >= 10.0 && distToAth > 5.0) {
        pullbackSetups.healthyDipSwing.push(stockInfo);
    } else if (isUnderIpo && dailyChange >= 5.0) {
        stockInfo.Rebound = `+${dailyChange.toFixed(1)}%`;
        pullbackSetups.underwaterTurnaround.push(stockInfo);
    }
});

console.log('📂 1. RBS Retest / Consolidation (1% hingga 5% bawah ATH):');
if (pullbackSetups.rbsRetest.length === 0) console.log('   - Tiada kaunter.');
else console.table(pullbackSetups.rbsRetest);

console.log('\n📂 2. Deep Pullback Rebound (Kejatuhan dalam + Lantunan harian >= 10%):');
if (pullbackSetups.deepPullbackRebound.length === 0) console.log('   - Tiada kaunter.');
else console.table(pullbackSetups.deepPullbackRebound);

console.log('\n📂 3. Healthy Dip Swing (Turun 5%-20% dari ATH, Atas Harga IPO, Upside Sifu >= 10%):');
if (pullbackSetups.healthyDipSwing.length === 0) console.log('   - Tiada kaunter.');
else console.table(pullbackSetups.healthyDipSwing);

console.log('\n📂 4. Underwater Turnaround (Bawah Harga IPO + Lantunan harian >= 5%):');
if (pullbackSetups.underwaterTurnaround.length === 0) console.log('   - Tiada kaunter.');
else console.table(pullbackSetups.underwaterTurnaround);

console.log('========================================================================');
console.log('💡 TIP: Gunakan data di atas untuk merancang sesi belian / jualan pagi.');
console.log('========================================================================\n');
