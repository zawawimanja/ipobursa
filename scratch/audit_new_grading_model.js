const fs = require('fs');

const raw = fs.readFileSync('data.json', 'utf8');
const ipos = JSON.parse(raw);

const listedIpos = ipos.filter(ipo => 
    (ipo.stage === 5 || ipo.status === 'Listed') && 
    ipo.price > 0 && 
    (ipo.openPrice > 0 || ipo.closePrice > 0 || ipo.currentPrice > 0)
);

function getOpenPerformance(ipo) {
    if (!ipo.openPrice || !ipo.price || ipo.price === 0) return 0;
    return ((ipo.openPrice - ipo.price) / ipo.price) * 100;
}

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

function getNewDynamicGrade(ipo) {
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
    const isRed = perf.includes('-');

    const isMainMarket = ipo.market && ipo.market.toLowerCase().includes('main');
    const isAceMarket = !isMainMarket;

    // Underperforming check
    const perfVal = getOpenPerformance(ipo) || 0;
    const isRedPerf = perfVal < 0 || (ipo.currentPrice && ipo.price && ipo.currentPrice < ipo.price) || (ipo.performance && ipo.performance.includes('-'));
    if (isRedPerf) {
        return 'C';
    }

    if (isMainMarket) {
        if (isHero && (isStrongGreen || isFlat)) return 'A';
        if (os >= 20 && (isTopTier || isHero) && isStrongGreen) return 'A';
        if (isStrongGreen && !isHighPE) return 'A';
        if (isPositiveOpen && pe > 0 && pe < 15 && (isTopTier || isMomentum || isHero)) return 'B';
        return 'C';
    }

    if (isAceMarket) {
        // Promotion to Grade A if OS >= 50x and it has a positive debut
        if (os >= 50 && isStrongGreen) return 'A';
        
        if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return 'B';
        if (os >= 20 && isStrongGreen) return 'B';
        if (isStrongGreen && !isHighPE) return 'B';
        return 'C';
    }

    return 'C';
}

const stats = {
    'A': { count: 0, wins: 0, totalPerf: 0, minPerf: Infinity, maxPerf: -Infinity },
    'B': { count: 0, wins: 0, totalPerf: 0, minPerf: Infinity, maxPerf: -Infinity },
    'C': { count: 0, wins: 0, totalPerf: 0, minPerf: Infinity, maxPerf: -Infinity }
};

listedIpos.forEach(ipo => {
    const grade = getNewDynamicGrade(ipo);
    const perf = getOpenPerformance(ipo) || 0;
    const isWin = perf > 0.5;
    
    if (stats[grade]) {
        stats[grade].count++;
        if (isWin) stats[grade].wins++;
        stats[grade].totalPerf += perf;
        if (perf < stats[grade].minPerf) stats[grade].minPerf = perf;
        if (perf > stats[grade].maxPerf) stats[grade].maxPerf = perf;
    }
});

console.log('=== NEW DYNAMIC GRADING SYSTEM PERFORMANCE AUDIT ===');
Object.keys(stats).forEach(grade => {
    const s = stats[grade];
    if (s.count === 0) return;
    const winRate = ((s.wins / s.count) * 100).toFixed(1);
    const avgPerf = (s.totalPerf / s.count).toFixed(1);
    console.log(`Grade [${grade}]:`);
    console.log(`  Total IPOs: ${s.count}`);
    console.log(`  Win Rate (Positive Debut): ${winRate}%`);
    console.log(`  Average Return: ${avgPerf}%`);
    console.log(`  Range: ${s.minPerf.toFixed(1)}% to ${s.maxPerf.toFixed(1)}%`);
    console.log('-');
});
