const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'sifu-sheets.html');
const jsonPath = path.join(__dirname, '..', 'data.json');

try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    const overridesPath = path.join(__dirname, '..', 'overrides.json');
    let overrides = {};
    if (fs.existsSync(overridesPath)) {
        overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
    }
    
    // Extract stockProfiles
    const stockProfilesMatch = htmlContent.match(/const stockProfiles = \{([\s\S]*?)\n        \};/);
    if (!stockProfilesMatch) {
        console.error('FAIL: Could not locate stockProfiles in HTML.');
        process.exit(1);
    }
    
    eval('var stockProfiles = {' + stockProfilesMatch[1] + '};');
    
    const targets = data.filter(ipo => 
        (ipo.year === 2026 || ['mnhldg', 'cnergenz', 'destini', 'cbhb', 'hkb', 'iab', 'hss-holdings-berhad', 'liftech-group-berhad', 'solarvest', 'sag'].includes(ipo.id)) && 
        ipo.shariah === true
    );
    
    // ═══════════════════════════════════════════════════════════
    // V6 ENGINE — Nelder-Mead Optimized (LOOCV: 88.3% hit rate)
    // Continuous params, IB quality, Gaussian price regime
    // ═══════════════════════════════════════════════════════════
    const v6p = [-0.062118, -0.094923, 0.757103, 0.923936, 0.955618, 1.091094, 0.836895, 1.052850, 1.061522, 0.074801, 1.219244, 0.125707, -0.747504, -0.000803];
    // [osLin, osQuad, tech, consumer, energy, health, industrial, construction, main, ibInf, ofs, priceG, ffDev, qual]

    // IB Performance Score (data-driven from historical win rates)
    const ibPerf = {};
    const ibCalc = {};
    data.filter(d => d.stage >= 5 && d.price > 0 && d.highPrice > 0).forEach(d => {
        const ib = (d.ib || 'unknown').toLowerCase().trim();
        if (!ibCalc[ib]) ibCalc[ib] = { wins: 0, total: 0, avgRet: 0 };
        ibCalc[ib].total++;
        ibCalc[ib].avgRet += (d.highPrice - d.price) / d.price;
        if (d.highPrice >= d.price * 1.1) ibCalc[ib].wins++;
    });
    Object.keys(ibCalc).forEach(ib => {
        const s = ibCalc[ib];
        s.avgRet /= s.total;
        ibPerf[ib] = Math.min(1, Math.max(0, (s.wins / s.total) * 0.6 + Math.min(s.avgRet, 1) * 0.4));
    });
    function getIbScore(ibName) {
        const ib = (ibName || 'unknown').toLowerCase().trim();
        if (ibPerf[ib] !== undefined) return ibPerf[ib];
        for (const key of Object.keys(ibPerf)) {
            if (ib.includes(key) || key.includes(ib)) return ibPerf[key];
        }
        return 0.3;
    }

    function getSectorGroupV6(sector) {
        const s = sector.toLowerCase();
        if (s.includes('tech') || s.includes('semiconductor') || s.includes('software') || s.includes('hardware') || s.includes('ai')) return 'tech';
        if (s.includes('consumer') || s.includes('food') || s.includes('beverage') || s.includes('retail')) return 'consumer';
        if (s.includes('energy') || s.includes('solar') || s.includes('renewable') || s.includes('utilities')) return 'energy';
        if (s.includes('health') || s.includes('medical') || s.includes('pharma') || s.includes('care')) return 'health';
        if (s.includes('construction') || s.includes('property') || s.includes('infrastructure')) return 'construction';
        if (s.includes('industrial') || s.includes('manufacturing') || s.includes('metal') || s.includes('shipping') || s.includes('logistic')) return 'industrial';
        return 'other';
    }

    function getCalibratedTarget(cincaiVal, sector, market, os, price, geography, ofs, anchorInvestors, freeFloat, lockupMonths, promoterQuality, ibName) {
        let target = cincaiVal;
        const sg = getSectorGroupV6(sector);
        
        // 1. Continuous OS response (logarithmic + quadratic)
        const logOs = Math.log1p(os);
        target *= (1 + v6p[0] * logOs / 5);
        target *= (1 + v6p[1] * logOs * logOs / 25);
        
        // 2. Sector multipliers (optimized end-to-end)
        if (sg === 'tech')         target *= v6p[2];
        if (sg === 'consumer')     target *= v6p[3];
        if (sg === 'energy')       target *= v6p[4];
        if (sg === 'health')       target *= v6p[5];
        if (sg === 'industrial')   target *= v6p[6];
        if (sg === 'construction') target *= v6p[7];
        
        // 3. Main market premium
        if (market.includes('main')) target *= v6p[8];
        
        // 4. IB Quality Score (continuous, data-driven)
        const ibScore = getIbScore(ibName);
        target *= (1 + v6p[9] * (ibScore - 0.3));
        
        // 5. OFS multiplier (data shows OFS ≠ always negative)
        if (ofs === true) target *= v6p[10];
        
        // 6. Gaussian price sweet spot (smooth, not buckets)
        const priceNorm = (price - 0.30) / 0.50;
        target *= (1 + v6p[11] * Math.exp(-priceNorm * priceNorm));
        
        // 7. Free float deviation from ideal 22%
        const ffDev = (freeFloat || 0.25) - 0.22;
        target *= (1 + v6p[12] * ffDev);
        
        // 8. Combined quality signal (anchor + promoter + lockup)
        let qualScore = 0;
        if (anchorInvestors === true) qualScore += 0.3;
        if (promoterQuality === 'conglomerate_spinoff') qualScore += 0.2;
        else if (promoterQuality === 'first_timer') qualScore -= 0.2;
        if ((lockupMonths || 12) >= 12) qualScore += 0.1;
        else qualScore -= 0.1;
        target *= (1 + v6p[13] * qualScore);
        
        return target;
    }

    console.log('Calculating Sifu Study Target Prices (Valuation 1) for Shariah-Compliant IPOs:\n');
    
    const sifuTargets = {};
    const calibratedTargets = {};
    
    targets.forEach(ipo => {
        let sifuTP = 0;
        let calibratedTP = 0;
        let source = '';
        
        // Parse metadata for calibration
        const sector = (ipo.sector || '').toLowerCase();
        const market = (ipo.market || '').toLowerCase();
        const os = ipo.oversubscription || ipo.os || 10;
        const freeFloat = ipo.freeFloat || 0;
        const anchorInvestors = ipo.anchorInvestors || false;
        const lockupMonths = ipo.lockupMonths || 12;
        const promoterQuality = ipo.promoterQuality || 'experienced_founder';
        
        const override = overrides[ipo.id];
        
        if (override && override.sifuTargetPrice !== undefined) {
            sifuTP = override.sifuTargetPrice;
            // Respect manual target price without applying discounts, unless user provided calibratedSifuTargetPrice explicitly
            calibratedTP = override.calibratedSifuTargetPrice !== undefined ? override.calibratedSifuTargetPrice : override.sifuTargetPrice;
            source = `overrides.json (Manual Override)`;
        } else if (stockProfiles[ipo.id]) {
            const p = stockProfiles[ipo.id];
            // Calculate Valuation 1 for Projection F (first projection column)
            // Sifu Sheets calculates EPS = (patF / totalShares) * 100
            // Valuation 1 = targetPe * EPS / 100
            const epsF = (p.patF / p.totalShares) * 100;
            const valF = p.targetPe * epsF / 100;
            
            sifuTP = valF;
            calibratedTP = getCalibratedTarget(valF, sector, market, os, ipo.price || 0, ipo.geography || '', ipo.ofs, anchorInvestors, freeFloat, lockupMonths, promoterQuality, ipo.ib);
            source = `stockProfiles (Projection F: RM ${valF.toFixed(2)})`;
        } else {
            // Fallback for dynamic IPOs
            sifuTP = ipo.avgTP || ipo.price || 0.50;
            calibratedTP = getCalibratedTarget(sifuTP, sector, market, os, ipo.price || 0, ipo.geography || '', ipo.ofs, anchorInvestors, freeFloat, lockupMonths, promoterQuality, ipo.ib);
            source = ipo.avgTP ? 'avgTP from database' : 'IPO Price (fallback)';
        }

        // Apply MITI 50% target price cap (for Stage 2 IPOs)
        if (ipo.stage === 2 && ipo.price > 0 && calibratedTP > ipo.price * 1.5) {
            calibratedTP = ipo.price * 1.5;
            source += ' | [MITI 50% Cap]';
        }
        
        sifuTargets[ipo.id] = parseFloat(sifuTP.toFixed(2));
        calibratedTargets[ipo.id] = parseFloat(calibratedTP.toFixed(2));
        console.log(`- ${ipo.id} (${ipo.companyName}): target = RM ${sifuTargets[ipo.id].toFixed(2)} | Calibrated = RM ${calibratedTargets[ipo.id].toFixed(2)} [Source: ${source}]`);
    });
    
    // Save both targets into data.json
    data.forEach(ipo => {
        if (sifuTargets[ipo.id] !== undefined) {
            ipo.sifuTargetPrice = sifuTargets[ipo.id];
        }
        if (calibratedTargets[ipo.id] !== undefined) {
            ipo.calibratedSifuTargetPrice = calibratedTargets[ipo.id];
        }
    });
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
    console.log('\nSuccessfully saved target fields to data.json!');
    
    // Also save to data.js
    const jsPath = path.join(__dirname, '..', 'data.js');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(jsPath, jsContent);
    console.log('Successfully saved to data.js!');
    
} catch(e) {
    console.error('Error:', e);
}
