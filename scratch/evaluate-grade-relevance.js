const fs = require('fs');

const raw = fs.readFileSync('data.json', 'utf8');
const ipos = JSON.parse(raw);

// Only evaluate listed IPOs with valid prices (Stage 5)
const listedIpos = ipos.filter(ipo => 
    (ipo.stage === 5 || ipo.status === 'Listed') && 
    ipo.price > 0 && 
    (ipo.openPrice > 0 || ipo.closePrice > 0 || ipo.currentPrice > 0)
);

console.log(`Total listed IPOs evaluated: ${listedIpos.length}`);

// We need a standard way to get performance.
// Debut performance is openPrice vs price. If openPrice is not available, we use currentPrice or closePrice as backup.
function getDebutPerf(ipo) {
    const start = ipo.price;
    const end = ipo.openPrice || ipo.closePrice || ipo.currentPrice;
    if (!start || !end) return 0;
    return ((end - start) / start) * 100;
}

const stats = {
    'A': { count: 0, wins: 0, totalPerf: 0, minPerf: Infinity, maxPerf: -Infinity },
    'B': { count: 0, wins: 0, totalPerf: 0, minPerf: Infinity, maxPerf: -Infinity },
    'C': { count: 0, wins: 0, totalPerf: 0, minPerf: Infinity, maxPerf: -Infinity },
    'Unrated/Pending/Others': { count: 0, wins: 0, totalPerf: 0, minPerf: Infinity, maxPerf: -Infinity }
};

// We will use the getIpoGrade function logic to classify them dynamically
const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity", "software"];

function getDynamicGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return 'Unrated';
    const os = ipo.os || 0;
    const pe = ipo.pe || 0;
    const ib = (ipo.ib || '').toLowerCase();
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();
    
    const isMainMarket = ipo.market.toLowerCase().includes('main');
    const isAceMarket = !isMainMarket;
    
    // Evaluate based on OS first if available (Stage 4+)
    /*
    if (os > 0) {
        if (isMainMarket) {
            const isTopIB = heroIBs.some(tier => ib.includes(tier));
            if (os >= 20 && isTopIB) return 'A';
            if (os >= 20) return 'B';
            return 'C';
        }
        if (isAceMarket) {
            if (os >= 50) return 'B';
            if (os >= 20) return 'B';
            if (os < 10) return 'C';
            return 'B';
        }
    }
    */
    
    // Pre-OS backup
    let score = 0;
    const isHero = heroIBs.some(tier => ib.includes(tier));
    const isTopTier = topTierIBs.some(tier => ib.includes(tier));
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isTrending = trendingSectors.some(s => sector.includes(s));
    
    if (isHero) score += 40;
    else if (isTopTier) score += 30;
    else if (isMomentum) score += 20;
    
    if (isTrending) score += 30;
    
    const marketScore = isMainMarket ? 10 : 5;
    score += marketScore;

    // OFS and PE Valuation Adjustments
    if (ipo.ofs === true) {
        score -= 15; // OFS risk penalty
    }
    if (pe > 0 && pe < 13.0) {
        score += 15; // Cheap/Attractive valuation bonus
    } else if (pe > 0 && pe < 18.0) {
        score += 5;  // Reasonable valuation bonus
    } else if (pe > 22.0) {
        score -= 10; // Expensive valuation penalty
    }
    
    if (score >= 70) return 'A';
    if (score >= 40) return 'B';
    return 'C';
}

listedIpos.forEach(ipo => {
    // If there is a manual predictedGrade in the DB, we can check that, or we can check the dynamic grade.
    // Let's use the dynamic grade because it represents the actual algorithm!
    const grade = getDynamicGrade(ipo);
    const perf = getDebutPerf(ipo);
    const isWin = perf > 0.5; // positive return on debut
    
    let key = 'Unrated/Pending/Others';
    if (stats[grade]) {
        key = grade;
    }
    
    stats[key].count++;
    if (isWin) stats[key].wins++;
    stats[key].totalPerf += perf;
    if (perf < stats[key].minPerf) stats[key].minPerf = perf;
    if (perf > stats[key].maxPerf) stats[key].maxPerf = perf;
});

console.log('\n=== GRADING SYSTEM PERFORMANCE AUDIT ===');
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
