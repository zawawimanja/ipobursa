const fs = require('fs');

let ipoData = [];
try {
    ipoData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
} catch (e) {
    console.error("Could not read data.json");
    process.exit(1);
}

// Add Stratus Global if not present for demonstration
const stratusPresent = ipoData.some(ipo => ipo.companyName.toLowerCase().includes('stratus'));
if (!stratusPresent) {
    ipoData.push({
        companyName: "Stratus Global Holdings Berhad",
        market: "Main Market",
        ib: "UOB Kay Hian",
        sector: "Factory Automation / Cleanroom Handling",
        fundUse: "Expansion & R&D",
        stage: 2, // MITI stage
        os: 0
    });
}

const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];

const highMomentumSectors = ["data centre", "solar", "ai", "semiconductor", "cleanroom", "hardware", "renewable energy", "ev", "cybersecurity"];
const lowMomentumSectors = ["it services", "software", "infrastructure", "services", "digital"];
const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

function predictGrade(ipo) {
    const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0;
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();

    const superHeroIBs = ["maybank"];
    const heroIBs = ["public", "kaf", "alliance"];
    const topTierIBs = ["rhb", "aminvestment", "alliance", "affin hwang", "kaf", "public"];
    const momentumIBs = ["m&a", "malacca", "ta securities", "kenanga", "apex", "sj securities"];
    const flatSkews = ["uob", "cimb", "mercury"];
    
    const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity"];
    const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

    const isSuperHero = superHeroIBs.some(tier => ib.includes(tier));
    const isHero = heroIBs.some(tier => ib.includes(tier)) || isSuperHero;
    const isTopTier = topTierIBs.some(tier => ib.includes(tier)) || isSuperHero;
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isFlatSkew = flatSkews.some(tier => ib.includes(tier));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));
    
    const isMainMarket = ipo.market && ipo.market.toLowerCase().includes('main');
    const isAceMarket = !isMainMarket;

    let score = 0;
    let reasons = [];
    
    if (isSuperHero) {
        score += 50;
        reasons.push("SuperHero IB (+50)");
    } else if (isHero) {
        score += 40;
        reasons.push("Hero IB (+40)");
    } else if (isTopTier) {
        score += 30;
        reasons.push("Top Tier IB (+30)");
    } else if (isMomentum) {
        score += 20;
        reasons.push("Momentum IB (+20)");
    }
    
    if (isFlatSkew) {
        score -= 15;
        reasons.push("Flat Skew IB (-15)");
    }
    
    if (isTrendingSector) {
        score += 30;
        reasons.push("Trending Sector (+30)");
    }
    if (isExpansionFund) {
        score += 20;
        reasons.push("Expansion/R&D Fund Use (+20)");
    }
    
    if (isMainMarket) {
        score += 10;
        reasons.push("Main Market (+10)");
    } else if (isAceMarket) {
        score += 5;
        reasons.push("ACE Market (+5)");
    }

    // Price sweet spot scoring
    const price = ipo.price || 0;
    if (price >= 0.30 && price <= 0.50) {
        score += 15;
        reasons.push("Retail sweet spot price (+15)");
    } else if (price >= 0.75 && price <= 1.00) {
        score += 15;
        reasons.push("Growth sweet spot price (+15)");
    } else if (price > 0 && price < 0.20) {
        score -= 15;
        reasons.push("Penny stock penalty (-15)");
    } else if (price > 1.00) {
        score -= 15;
        reasons.push("High-ticket stock penalty (-15)");
    }

    // Geography premium scoring
    const geo = (ipo.geography || '').toLowerCase();
    if (geo === 'penang' && isTrendingSector) {
        score += 20;
        reasons.push("Penang Silicon Valley Premium (+20)");
    } else if (geo === 'johor' || geo === 'melaka') {
        score -= 5;
        reasons.push("Geography penalty (-5)");
    }

    // OFS and PE Valuation Adjustments
    const hasOFS = ipo.ofs === true || ipo.hasOFS === true;
    if (hasOFS) {
        score -= 15;
        reasons.push("Offer for Sale (OFS) component (-15)");
    }
    if (pe > 0 && pe < 13.0) {
        score += 15;
        reasons.push("Cheap/Attractive valuation PE < 13x (+15)");
    } else if (pe > 0 && pe < 18.0) {
        score += 5;
        reasons.push("Reasonable valuation PE < 18x (+5)");
    } else if (pe > 22.0) {
        score -= 10;
        reasons.push("Expensive valuation PE > 22x (-10)");
    }

    let grade = 'C';
    if (score >= 70) grade = 'A';
    else if (score >= 40) grade = 'B';
    
    return { grade, score, reasons };
}

console.log("=== PRE-OS PREDICTIVE GRADING ===");
console.log("Evaluating IPOs without waiting for Oversubscription data.\n");

ipoData.forEach(ipo => {
    // Process IPOs in Stage 2 or 3, or Stage 4 without OS
    if (ipo.stage === 2 || ipo.stage === 3 || (ipo.stage === 4 && (!ipo.os || ipo.os === 0))) {
        const result = predictGrade(ipo);
        console.log(`Company: ${ipo.companyName}`);
        console.log(`Market:  ${ipo.market} | IB: ${ipo.ib}`);
        console.log(`Sector:  ${ipo.sector}`);
        console.log(`Grade:   [${result.grade}] (Score: ${result.score}/100)`);
        console.log(`Factors: ${result.reasons.join(', ')}`);
        
        // Specific advice for Stratus or similar automation companies
        if (ipo.sector && ipo.sector.toLowerCase().includes('automation') && result.grade === 'B') {
            console.log(`💡 Note: If you consider "Automation" as part of the Tech/Semi trending sector, this would score +30 more, making it a Grade A.`);
        }
        
        console.log("-".repeat(50));
    }
});
