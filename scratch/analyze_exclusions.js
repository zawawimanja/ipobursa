const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf',
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad',
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx', 'adnex', 'dnex'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));
const explicitSkips = ['agmo', 'wentel-engineering', 'wentel'];

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

console.log("Analyzing why other stocks were excluded from Top Picks:\n");

db.forEach(ipo => {
    const id = ipo.id || ipo.symbol || '';
    const symbol = ipo.symbol || ipo.id || '';
    const name = ipo.companyName || '';
    
    // Only look at listed/listed-stage stocks
    if (ipo.status !== 'Listed' && ipo.stage !== 5) return;
    
    const reasons = [];
    
    // 1. Shariah check
    if (ipo.shariah !== true) {
        reasons.push("Bukan Shariah");
    }
    
    // 2. Grade check
    const grade = getIpoGrade(ipo).grade;
    const isSifuPick = sifuPortfolioSet.has(id.toLowerCase()) || sifuPortfolioSet.has(symbol.toLowerCase());
    const isMomentumRebound = typeof ipo.dailyChange === 'number' && ipo.dailyChange >= 10.0;
    
    if (grade !== 'A' && grade !== 'B' && !isSifuPick && !isMomentumRebound) {
        reasons.push(`Gred (${grade}) bukan A/B (bukan Sifu Pick / Momentum Rebound)`);
    }
    
    // 3. Price check
    const curPrice = ipo.currentPrice || 0;
    const ipoPrice = ipo.price || 0;
    if (curPrice <= 0) {
        reasons.push("Tiada harga semasa");
    } else if (curPrice < ipoPrice && !isMomentumRebound) {
        reasons.push(`Harga semasa (RM ${curPrice.toFixed(3)}) bawah harga IPO (RM ${ipoPrice.toFixed(2)})`);
    }
    
    // 4. Age and ATH check
    const highPrice = ipo.highPrice || 0;
    if (!isSifuPick && !isMomentumRebound) {
        const isNearAth = ipo.highPrice ? (ipo.currentPrice >= ipo.highPrice * 0.95) : false;
        if (ipo.listingDate) {
            const listDate = new Date(ipo.listingDate);
            const ageInDays = (new Date() - listDate) / (1000 * 60 * 60 * 24);
            if (ageInDays > 365 && !isNearAth) {
                reasons.push(`Umur > 365 hari dan bukan berdekatan ATH`);
            }
        } else {
            const isRecent = ipo.year >= 2024;
            if (!isRecent && !isNearAth) {
                reasons.push(`IPO lama (< 2024) dan bukan berdekatan ATH`);
            }
        }
    }
    
    // 5. Downtrend check
    const isRecentListing = ipo.year >= 2025;
    const isDowntrend = (highPrice && isRecentListing) ? (ipo.currentPrice <= highPrice * 0.75) : false;
    if (isDowntrend && !isMomentumRebound) {
        reasons.push(`Downtrend / Kejatuhan dalam dari ATH (> 25% drop dari ATH)`);
    }
    
    // 6. Target Price & Upside check
    const targetPrice = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    const upside = targetPrice > 0 ? ((targetPrice - curPrice) / curPrice) * 100 : 0;
    if (targetPrice <= 0) {
        reasons.push("Tiada Target Price (TP)");
    } else if (upside < 10.0) {
        const isActualAth = highPrice > 0 && curPrice >= (highPrice - 0.005);
        if (!isActualAth && !isMomentumRebound) {
            reasons.push(`Upside rendah (+${upside.toFixed(1)}% < 10%) dan bukan breakout/rebound`);
        }
    }
    
    // 7. Anti-stagnant check
    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) {
        reasons.push(`Saham mati/stagnant (kenaikan ATH atas IPO < 8%)`);
    }
    
    // 8. Healthy pullback check
    const isRecentIpo = ipo.year >= 2024;
    const isHealthyPullback = highPrice ? (curPrice >= highPrice * 0.80) : true;
    if (isRecentIpo && !isHealthyPullback && !isMomentumRebound) {
        reasons.push(`Deep Pullback (> 20% drop dari ATH)`);
    }
    
    // 9. Skip List
    if (explicitSkips.includes(id.toLowerCase()) || explicitSkips.includes(symbol.toLowerCase())) {
        reasons.push("Ada dalam senarai Skip");
    }

    if (grade === 'C' && reasons.length === 0) {
        const isActualAth = highPrice > 0 && curPrice >= (highPrice - 0.005);
        if (!isActualAth && !isMomentumRebound) {
            reasons.push("Gred C (bukan breakout ATH atau momentum rebound)");
        }
    }

    if (reasons.length > 0) {
        console.log(`❌ ${name} (${symbol.toUpperCase()})`);
        console.log(`   Gred: Gred ${grade} | Harga: RM ${curPrice.toFixed(3)} | TP: RM ${targetPrice.toFixed(2)} (Upside: ${upside.toFixed(1)}%)`);
        console.log(`   Sebab Disingkirkan:`);
        reasons.forEach(r => console.log(`     - ${r}`));
        console.log();
    } else {
        console.log(`✅ ${name} (${symbol.toUpperCase()}) - PASSED`);
        console.log(`   Gred: Gred ${grade} | Harga: RM ${curPrice.toFixed(3)} | TP: RM ${targetPrice.toFixed(2)} (Upside: ${upside.toFixed(1)}%)`);
        console.log();
    }
});
