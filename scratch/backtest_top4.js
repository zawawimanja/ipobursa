const fs = require('fs');
const path = require('path');

// 1. Setup paths and dates
const archiveDir = path.join(__dirname, '..', 'archive');
const currentDbFile = path.join(__dirname, '..', 'data.json');

const dates = ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'skyechip', 'tanco', 'ecoshop', 'keyfield', 'pentech', 'elsa', 'orkim', 'ogx', 'adnex', 'dnex'
];
const sifuPortfolioSet = new Set(sifuPortfolio.map(s => s.toLowerCase()));

// Load current data for the final day (June 20)
const currentDb = JSON.parse(fs.readFileSync(currentDbFile, 'utf8'));
const overridesPath = path.join(__dirname, '..', 'overrides.json');
const overrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : {};

// Helper to get stock price on a specific date
function getPriceOnDate(symbolOrId, dateStr) {
    if (dateStr === 'current') {
        const d = currentDb.find(x => x.id.toLowerCase() === symbolOrId.toLowerCase() || (x.symbol && x.symbol.toLowerCase() === symbolOrId.toLowerCase()));
        return d ? d.currentPrice : null;
    }
    const filePath = path.join(archiveDir, `groups-${dateStr}.json`);
    if (!fs.existsSync(filePath)) return null;
    
    const archive = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const allStocks = [
        ...(archive.kumpulan_1 ? archive.kumpulan_1.stocks : []),
        ...(archive.kumpulan_2 ? archive.kumpulan_2.stocks : []),
        ...(archive.kumpulan_3 ? archive.kumpulan_3.stocks : [])
    ];
    const d = allStocks.find(x => x.id.toLowerCase() === symbolOrId.toLowerCase() || (x.symbol && x.symbol.toLowerCase() === symbolOrId.toLowerCase()));
    return d ? d.currentPrice : null;
}

// Grading logic matches our sifu-picks.html logic
function getIpoGrade(ipo) {
    if (ipo.predictedGrade) return { grade: ipo.predictedGrade };
    return { grade: 'C' };
}

// Run backtest for each archived date
dates.forEach((date, dateIdx) => {
    const filePath = path.join(archiveDir, `groups-${date}.json`);
    if (!fs.existsSync(filePath)) return;
    
    console.log(`\n==================================================`);
    console.log(`📅 BACKTEST DATE: ${date}`);
    console.log(`==================================================`);
    
    const archive = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const allStocks = [
        ...(archive.kumpulan_1 ? archive.kumpulan_1.stocks : []),
        ...(archive.kumpulan_2 ? archive.kumpulan_2.stocks : []),
        ...(archive.kumpulan_3 ? archive.kumpulan_3.stocks : [])
    ];
    
    // De-duplicate candidates and apply overrides
    const seen = new Set();
    const candidates = [];
    allStocks.forEach(s => {
        const key = s.id.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            
            // Apply override if exists
            const override = overrides[s.id];
            if (override) {
                Object.assign(s, override);
                if (override.sifuTargetPrice !== undefined && s.calibratedSifuTargetPrice === undefined) {
                    s.calibratedSifuTargetPrice = override.calibratedSifuTargetPrice !== undefined ? override.calibratedSifuTargetPrice : override.sifuTargetPrice;
                }
            }
            
            candidates.push(s);
        }
    });
    
    // Filter candidates by our updated formula
    const filteredCandidates = candidates.filter(ipo => {
        const curPrice = ipo.currentPrice || 0;
        const ipoPrice = ipo.price || 0;
        const highPrice = ipo.highPrice || 0;
        const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
        const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
        const dailyChange = ipo.dailyChange || 0;
        const isMomentumRebound = typeof dailyChange === 'number' && dailyChange >= 10.0;
        
        // Safety: Must be above IPO price
        if (curPrice < ipoPrice && !isMomentumRebound) return false;
        
        // Safety: Healthy pullback (max 20% drop for recent IPOs 2024+)
        const isRecentIpo = ipo.year >= 2024;
        const isHealthyPullback = highPrice ? (curPrice >= highPrice * 0.80) : true;
        if (isRecentIpo && !isHealthyPullback && !isMomentumRebound) return false;
        
        return true;
    });
    
    // Score each candidate
    const scored = filteredCandidates.map(ipo => {
        const curPrice = ipo.currentPrice || 0;
        const highPrice = ipo.highPrice || 0;
        const tp = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
        const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
        const distToAth = highPrice ? ((highPrice - curPrice) / curPrice) * 100 : 0;
        const grade = getIpoGrade(ipo).grade;
        
        let score = 0;
        // 1. Grade score
        if (grade === 'A') score += 100;
        else if (grade === 'B') score += 80;
        else if (grade === 'C') score += 40;
        
        // 2. Setup score
        const isNearAth = distToAth <= 5.0 && distToAth >= 0;
        const isHealthyDip = distToAth > 5.0 && distToAth <= 20.0;
        
        if (isNearAth) score += 50;
        else if (isHealthyDip) score += 30;
        else score += 10;
        
        // 3. Upside score
        if (upside > 0) {
            score += Math.min(30, upside * 0.5);
        } else {
            score -= 100;
        }
        
        // 4. Portfolio bonus
        const isPortfolio = sifuPortfolioSet.has(ipo.id.toLowerCase()) || (ipo.symbol && sifuPortfolioSet.has(ipo.symbol.toLowerCase()));
        if (isPortfolio) score += 20;
        
        return { ipo, score, distToAth, grade, isNearAth, isHealthyDip, upside };
    });
    
    // Sort and select Top 5
    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5);
    
    // Display results and follow-up price performance
    top5.forEach((item, index) => {
        const ipo = item.ipo;
        const symbol = ipo.symbol || ipo.id.toUpperCase();
        const buyPrice = ipo.currentPrice;
        
        // Get subsequent prices
        const priceHistory = [];
        for (let i = dateIdx + 1; i < dates.length; i++) {
            const p = getPriceOnDate(ipo.symbol || ipo.id, dates[i]);
            if (p) priceHistory.push({ date: dates[i], price: p });
        }
        // Current price (June 20/21)
        const currentP = getPriceOnDate(ipo.symbol || ipo.id, 'current');
        if (currentP) priceHistory.push({ date: '2026-06-20 (Current)', price: currentP });
        
        // Calculate max performance
        let maxPrice = buyPrice;
        let maxPerf = 0;
        priceHistory.forEach(h => {
            if (h.price > maxPrice) {
                maxPrice = h.price;
            }
        });
        maxPerf = ((maxPrice - buyPrice) / buyPrice) * 100;
        
        const setupName = item.isNearAth ? 'RBS Retest' : (item.isHealthyDip ? 'Healthy Dip' : 'Pullback');
        const styleName = item.isNearAth ? (item.upside >= 15.0 ? 'Swing/Scalp' : 'Scalp') : 'Swing';
        const displayTP = ipo.calibratedSifuTargetPrice || ipo.sifuTargetPrice || ipo.targetPrice || ipo.avgTP || 0;
        
        console.log(`\nTop #${index + 1}: ${ipo.companyName} (${symbol})`);
        console.log(`   - Gred: Gred ${item.grade} | Setup: ${setupName} | Style: ${styleName}`);
        console.log(`   - Beli pada ${date}: RM ${buyPrice.toFixed(3)} | Sifu TP: RM ${displayTP.toFixed(2)} (Upside: ${item.upside.toFixed(1)}%)`);
        
        if (priceHistory.length > 0) {
            console.log(`   - Sejarah Harga Seterusnya:`);
            priceHistory.forEach(h => {
                const diff = ((h.price - buyPrice) / buyPrice) * 100;
                const sign = diff >= 0 ? '+' : '';
                console.log(`     * ${h.date}: RM ${h.price.toFixed(3)} (${sign}${diff.toFixed(1)}%)`);
            });
            console.log(`   - Prestasi Tertinggi (Max Gain): +${maxPerf.toFixed(1)}% (Harga Puncak: RM ${maxPrice.toFixed(3)})`);
        } else {
            console.log(`   - Tiada data sejarah seterusnya (hari terakhir penapis).`);
        }
    });
});
