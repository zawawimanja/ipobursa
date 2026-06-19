const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = path.join(__dirname, '../archive');
const DATA_JSON_FILE = path.join(__dirname, '../data.json');

const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.json'));
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

// Collect all unique stock IDs that appeared in Kumpulan 3 of any archive file
const archiveStocks = new Map();

files.forEach(file => {
    const filePath = path.join(ARCHIVE_DIR, file);
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const k3 = content.kumpulan_3?.stocks || [];
        
        k3.forEach(s => {
            if (!archiveStocks.has(s.id)) {
                archiveStocks.set(s.id, {
                    id: s.id,
                    symbol: s.symbol,
                    companyName: s.companyName,
                    firstSeenIn: file,
                    lastSeenIn: file
                });
            } else {
                archiveStocks.get(s.id).lastSeenIn = file;
            }
        });
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});

console.log(`Found ${archiveStocks.size} unique Kumpulan 3 stocks across all archive files.`);

console.log('\n========================================================================');
console.log('🔍 INDIVIDUAL AUDIT OF ALL KUMPULAN 3 ARCHIVE STOCKS (1-BY-1)');
console.log('========================================================================');

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

    if (isMainMarket) {
        if (isHero && (isStrongGreen || isFlat)) return { grade: 'A' };
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

archiveStocks.forEach((val, id) => {
    const ipo = dataMap[id];
    if (!ipo) return;

    const curPrice = ipo.currentPrice || 0;
    const highPrice = ipo.highPrice || 0;
    const ipoPrice = ipo.price || 0;
    const dailyChange = ipo.dailyChange || 0;
    const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.avgTP || 0;
    
    const isSifuPick = sifuPortfolioSet.has(id.toLowerCase()) || sifuPortfolioSet.has((ipo.symbol || '').toLowerCase());
    const isMomentumRebound = typeof dailyChange === 'number' && dailyChange >= 10.0;
    const grade = getIpoGrade(ipo).grade;
    const isShariah = ipo.shariah;
    const isListed = ipo.stage === 5 || ipo.status === 'Listed';

    let status = 'PASSED';
    let reason = '';

    if (!isShariah) {
        status = 'EXCLUDED'; reason += '[Non-Shariah] ';
    }
    if (!isListed) {
        status = 'EXCLUDED'; reason += '[Not-Listed-Stage] ';
    }
    if (grade !== 'A' && grade !== 'B' && !isSifuPick && !isMomentumRebound) {
        status = 'EXCLUDED'; reason += `[Grade-${grade}-Exclusion] `;
    }
    if (curPrice <= 0 || tp <= 0) {
        status = 'EXCLUDED'; reason += '[Zero-Price-or-TP] ';
    }
    if (ipo.outlier && !isSifuPick && !isMomentumRebound) {
        status = 'EXCLUDED'; reason += '[Outlier-Exclusion] ';
    }

    const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
    const isActualAth = highPrice > 0 && curPrice >= (highPrice - 0.005);
    const isDowntrendVal = highPrice ? (curPrice <= highPrice * 0.75) : false;

    if (tp > 0) {
        if (upside < 10.0 && !isActualAth && !isMomentumRebound) {
            if (isDowntrendVal && !isSifuPick) {
                status = 'EXCLUDED'; reason += '[Upside-&-Downtrend-Exclusion] ';
            }
        }
    }

    const highAboveIpo = highPrice ? ((highPrice - ipoPrice) / ipoPrice) * 100 : 0;
    if (ipo.year < 2026 && highAboveIpo < 8.0 && !isMomentumRebound) {
        status = 'EXCLUDED'; reason += '[Stagnant-Exclusion] ';
    }

    if (isDowntrendVal && !isMomentumRebound && !isSifuPick) {
        status = 'EXCLUDED'; reason += '[Downtrend-Safety-Exclusion] ';
    }

    if (status === 'PASSED') {
        console.log(`• ${ipo.symbol || id.toUpperCase()} (${id}) | Price: RM ${curPrice} | TP: RM ${tp} | Upside: ${upside.toFixed(1)}% | Grade: ${grade} | Status: PASSED`);
    } else {
        console.log(`• ${ipo.symbol || id.toUpperCase()} (${id}) | Price: RM ${curPrice} | TP: RM ${tp} | Upside: ${upside.toFixed(1)}% | Grade: ${grade} | Status: EXCLUDED -> ${reason}`);
    }
});
