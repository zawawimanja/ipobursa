const fs = require('fs');

const raw = fs.readFileSync('data.json', 'utf8');
const ipos = JSON.parse(raw);

const listedIpos = ipos.filter(ipo => 
    (ipo.stage === 5 || ipo.status === 'Listed') && 
    ipo.price > 0 && 
    (ipo.openPrice > 0 || ipo.closePrice > 0 || ipo.currentPrice > 0) &&
    (ipo.year === 2025 || ipo.year === 2026)
);

function getOpenPerformance(ipo) {
    if (!ipo.openPrice || !ipo.price || ipo.price === 0) return 0;
    return ((ipo.openPrice - ipo.price) / ipo.price) * 100;
}

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

function getDynamicGrade(ipo) {
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
        if (os >= 50 && isStrongGreen) return 'A';
        if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return 'B';
        if (os >= 20 && isStrongGreen) return 'B';
        if (isStrongGreen && !isHighPE) return 'B';
        return 'C';
    }

    return 'C';
}

const discrepancies = [];

listedIpos.forEach(ipo => {
    const staticGrade = ipo.predictedGrade || 'Unrated';
    const dynamicGrade = getDynamicGrade(ipo);
    const openPerf = getOpenPerformance(ipo);
    
    if (staticGrade !== dynamicGrade) {
        discrepancies.push({
            id: ipo.id,
            companyName: ipo.companyName,
            symbol: ipo.symbol || 'N/A',
            market: ipo.market,
            os: ipo.os || 'N/A',
            ib: ipo.ib || 'N/A',
            openPerf: openPerf.toFixed(1) + '%',
            currentPrice: ipo.currentPrice || 'N/A',
            ipoPrice: ipo.price,
            staticGrade,
            dynamicGrade,
            diff: (dynamicGrade === 'A' && staticGrade === 'C') ? '🔥 C -> A (BLOCKBUSTER)' : 
                  (dynamicGrade === 'B' && staticGrade === 'C') ? '📈 C -> B (UNDERESTIMATED)' :
                  (dynamicGrade === 'C' && staticGrade === 'A') ? '⚠️ A -> C (FAILED)' :
                  (dynamicGrade === 'C' && staticGrade === 'B') ? '⚠️ B -> C (FAILED)' :
                  `${staticGrade} -> ${dynamicGrade}`
        });
    }
});

console.log(`=== 2025-2026 GRADE DISCREPANCIES AUDIT (Total: ${discrepancies.length} out of ${listedIpos.length}) ===`);
console.table(discrepancies.map(d => ({
    symbol: d.symbol,
    company: d.companyName.substring(0, 20),
    os: d.os,
    open: d.openPerf,
    static: d.staticGrade,
    dynamic: d.dynamicGrade,
    action: d.diff
})));
