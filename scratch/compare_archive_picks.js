const fs = require('fs');
const path = require('path');

const ARCHIVE_FILE = path.join(__dirname, '../archive/groups-2026-06-19.json');
const DATA_JSON_FILE = path.join(__dirname, '../data.json');

const archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

const dataMap = {};
data.forEach(d => {
    dataMap[d.id] = d;
});

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));

function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated' };
    const effectiveStage = ipo.stage;
    const os = ipo.os || 0;
    const hasOsData = ipo.os !== undefined && ipo.os !== null && ipo.os > 0;
    if (ipo.predictedGrade && effectiveStage < 5) return { grade: ipo.predictedGrade };
    
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

console.log('--- COMPARING ARCHIVE KUMPULAN 1 STOCKS ---');
const k1Stocks = archive.kumpulan_1.stocks;
k1Stocks.forEach(s => {
    const d = dataMap[s.id];
    if (!d) {
        console.log(`❌ ${s.id} not found in data.json`);
        return;
    }
    const grade = getIpoGrade(d).grade;
    const isSifu = sifuPortfolioSet.has(s.id.toLowerCase()) || sifuPortfolioSet.has((d.symbol || '').toLowerCase());
    const isShariah = d.shariah;
    const tp = d.calibratedSifuTargetPrice || d.sifuTargetPrice || d.avgTP || 0;
    const cur = d.currentPrice || 0;
    const upside = cur > 0 ? ((tp - cur) / cur) * 100 : 0;
    const high = d.highPrice || 0;
    const isDowntrend = high ? (cur <= high * 0.75) : false;
    
    console.log(`• ${s.symbol} (${s.id}): Grade ${grade} | Shariah: ${isShariah} | Sifu: ${isSifu} | Price: RM ${cur} | TP: RM ${tp} | Upside: ${upside.toFixed(1)}% | Downtrend: ${isDowntrend}`);
});

console.log('\n--- COMPARING ARCHIVE KUMPULAN 2 STOCKS ---');
const k2Stocks = archive.kumpulan_2.stocks;
k2Stocks.forEach(s => {
    const d = dataMap[s.id];
    if (!d) {
        console.log(`❌ ${s.id} not found in data.json`);
        return;
    }
    const grade = getIpoGrade(d).grade;
    const isSifu = sifuPortfolioSet.has(s.id.toLowerCase()) || sifuPortfolioSet.has((d.symbol || '').toLowerCase());
    const isShariah = d.shariah;
    const tp = d.calibratedSifuTargetPrice || d.sifuTargetPrice || d.avgTP || 0;
    const cur = d.currentPrice || 0;
    const upside = cur > 0 ? ((tp - cur) / cur) * 100 : 0;
    const high = d.highPrice || 0;
    const isDowntrend = high ? (cur <= high * 0.75) : false;
    
    console.log(`• ${s.symbol} (${s.id}): Grade ${grade} | Shariah: ${isShariah} | Sifu: ${isSifu} | Price: RM ${cur} | TP: RM ${tp} | Upside: ${upside.toFixed(1)}% | Downtrend: ${isDowntrend}`);
});
