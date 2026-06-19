const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'ogx'
];

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

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

const lookalikes = [];

db.forEach(ipo => {
    const isMatch = ipo.shariah === true && 
        (ipo.stage === 5 || ipo.status === 'Listed') &&
        ipo.currentPrice > 0 &&
        ipo.currentPrice < 3.00;
    
    if (!isMatch) return;

    const high = ipo.highPrice || 0;
    if (high === 0) return;

    const current = ipo.currentPrice;
    const distToAth = ((high - current) / current) * 100;
    const isMomentumRebound = typeof ipo.dailyChange === 'number' && ipo.dailyChange >= 10.0;
    
    // Allow if within 5% of ATH OR if it is a major momentum rebound (>10% daily change)
    if (distToAth > 5.0 && !isMomentumRebound) return;

    const idLower = ipo.id.toLowerCase();
    const symbolLower = (ipo.symbol || '').toLowerCase();
    const isSifuPick = sifuPortfolio.includes(idLower) || sifuPortfolio.includes(symbolLower);
    const grade = getIpoGrade(ipo).grade;

    if (grade !== 'A' && grade !== 'B' && !isSifuPick) return;
    if (idLower === 'adnex' || idLower === 'dnex') return;

    let setupType = '';
    let description = '';
    
    if (isMomentumRebound && distToAth > 5.0) {
        setupType = `⚡ MOMENTUM REBOUND (+${ipo.dailyChange}%)`;
        description = `Kaunter sedang membuat lantunan kuat dari paras bawah (Deep Pullback). Jarak ke ATH masih jauh (${distToAth.toFixed(1)}%), peluang upside besar.`;
    } else if (distToAth === 0) {
        setupType = '🚀 BREAKOUT ATH (Hari Pertama)';
        description = 'Harga ditutup tepat pada paras tertinggi sejarah. Momentum belian sangat kuat, sedia untuk meletup.';
    } else if (distToAth <= 1.5) {
        setupType = '🔥 TESTING RESISTANCE (Sangat Hampir)';
        description = 'Hanya kurang dari 1.5% di bawah ATH. Sedang menguji pintu breakout, boleh mula bertindak.';
    } else {
        setupType = '📈 CONSOLIDATION (Pembinaan Tapak)';
        description = 'Sedang berehat dan membina base yang kukuh 1.5% - 5% di bawah ATH sebelum percubaan memecah keluar.';
    }

    lookalikes.push({
        id: ipo.id,
        symbol: ipo.symbol || idLower.toUpperCase(),
        company: ipo.companyName,
        currentPrice: current,
        highPrice: high,
        distToAth: distToAth,
        grade: grade,
        setupType: setupType,
        description: description,
        year: ipo.year,
        os: ipo.os || 'N/A',
        ib: ipo.ib || 'N/A',
        dailyChange: ipo.dailyChange || 0
    });
});

lookalikes.sort((a, b) => a.distToAth - b.distToAth);

console.log(JSON.stringify(lookalikes, null, 2));
