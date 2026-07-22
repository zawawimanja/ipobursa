const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    const overridesPath = path.join(__dirname, '..', 'overrides.json');
    let overrides = {};
    if (fs.existsSync(overridesPath)) {
        overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
    }
    
    const targets = data.filter(ipo => 
        (ipo.year === 2026 || ['mnhldg', 'cnergenz', 'destini', 'cbhb', 'hkb', 'iab', 'hss-holdings-berhad', 'liftech-group-berhad', 'solarvest', 'sag'].includes(ipo.id)) && 
        ipo.shariah === true
    );
    
    // ═══════════════════════════════════════════════════════════
    // V7 ENGINE — Multi-Objective Optimized (Beats Sifu CK 4/4)
    // 15 params: OS, sector, IB, OFS, free float, quality, PE, lockup
    // ═══════════════════════════════════════════════════════════
    // V7 params [osLin, osQuad, tech, consumer, energy, health, industrial, construction, main, ibInf, ofs, ff, qual, pe, lockup]
    const v7p = [-0.045479, -0.027829, 1.094659, 0.983594, 0.992896, 1.088745, 0.966187, 1.155089, 1.089565, 0.119831, 0.909459, -1.007622, 0.123072, -0.027927, 0.051254];

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

    function getSectorGroup(sector) {
        const s = sector.toLowerCase();
        if (s.includes('tech') || s.includes('semiconductor') || s.includes('software') || s.includes('hardware') || s.includes('ai')) return 'tech';
        if (s.includes('consumer') || s.includes('food') || s.includes('beverage') || s.includes('retail')) return 'consumer';
        if (s.includes('energy') || s.includes('solar') || s.includes('renewable') || s.includes('utilities')) return 'energy';
        if (s.includes('health') || s.includes('medical') || s.includes('pharma') || s.includes('care')) return 'health';
        if (s.includes('construction') || s.includes('property') || s.includes('infrastructure')) return 'construction';
        if (s.includes('industrial') || s.includes('manufacturing') || s.includes('metal') || s.includes('shipping') || s.includes('logistic')) return 'industrial';
        return 'other';
    }

    function getCalibratedTarget(cincaiVal, sector, market, os, price, geography, ofs, anchorInvestors, freeFloat, lockupMonths, promoterQuality, ibName, targetPe) {
        let target = cincaiVal;
        const sg = getSectorGroup(sector);
        
        // 1. Continuous OS response
        const logOs = Math.log1p(os || 10);
        target *= (1 + v7p[0] * logOs / 5);
        target *= (1 + v7p[1] * logOs * logOs / 25);
        
        // 2. Sector multipliers (CK bias corrected — V7 fixes V6's WRONG directions)
        if (sg === 'tech')         target *= v7p[2];
        if (sg === 'consumer')     target *= v7p[3];
        if (sg === 'energy')       target *= v7p[4];
        if (sg === 'health')       target *= v7p[5];
        if (sg === 'industrial')   target *= v7p[6];
        if (sg === 'construction') target *= v7p[7];
        
        // 3. Main market premium
        if (market.includes('main')) target *= v7p[8];
        
        // 4. IB Quality Score
        const ibScore = getIbScore(ibName);
        target *= (1 + v7p[9] * (ibScore - 0.3));
        
        // 5. OFS drag (V7 fixes V6's WRONG positive multiplier — OFS reduces target)
        if (ofs === true) target *= v7p[10];
        
        // 6. Free float deviation
        const ffDev = (freeFloat || 0.25) - 0.22;
        target *= (1 + v7p[11] * ffDev);
        
        // 7. Combined quality signal
        let qualScore = 0;
        if (anchorInvestors === true) qualScore += 0.3;
        if (promoterQuality === 'conglomerate_spinoff') qualScore += 0.2;
        else if (promoterQuality === 'first_timer') qualScore -= 0.2;
        target *= (1 + v7p[12] * qualScore);
        
        // 8. PE-based adjustment (NEW — V7 only)
        const pe = targetPe || 15;
        target *= (1 + v7p[13] * (pe - 15) / 15);
        
        // 9. Lockup impact (NEW — V7 only, replaces old lockup penalty)
        target *= (1 + v7p[14] * ((lockupMonths || 12) - 6) / 12);
        
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
        } else if (ipo.headers !== undefined && ipo.patF !== undefined && ipo.totalShares !== undefined && ipo.targetPe !== undefined) {
            // Calculate Valuation 1 for Projection F (first projection column)
            // Sifu Sheets calculates EPS = (patF / totalShares) * 100
            // Valuation 1 = targetPe * EPS / 100
            const epsF = (ipo.patF / ipo.totalShares) * 100;
            const valF = ipo.targetPe * epsF / 100;
            
            sifuTP = valF;
            calibratedTP = getCalibratedTarget(valF, sector, market, os, ipo.price || 0, ipo.geography || '', ipo.ofs, anchorInvestors, freeFloat, lockupMonths, promoterQuality, ipo.ib, ipo.targetPe);
            source = `data.json profile (Projection F: RM ${valF.toFixed(2)})`;
        } else {
            // Fallback for dynamic IPOs
            sifuTP = ipo.avgTP || ipo.price || 0.50;
            calibratedTP = getCalibratedTarget(sifuTP, sector, market, os, ipo.price || 0, ipo.geography || '', ipo.ofs, anchorInvestors, freeFloat, lockupMonths, promoterQuality, ipo.ib, ipo.targetPe);
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
    
    // Save both targets and overrides into data.json
    data.forEach(ipo => {
        if (overrides[ipo.id]) {
            Object.assign(ipo, overrides[ipo.id]);
        }
        if (sifuTargets[ipo.id] !== undefined) {
            ipo.sifuTargetPrice = sifuTargets[ipo.id];
        }
        if (calibratedTargets[ipo.id] !== undefined) {
            ipo.calibratedSifuTargetPrice = calibratedTargets[ipo.id];
            ipo.v7TargetPrice = calibratedTargets[ipo.id];
            ipo.zone2TargetPrice = calibratedTargets[ipo.id]; // V7 replaces V6 as Zone 2
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
