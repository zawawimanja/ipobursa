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
    
    const bestParams = {
        superHighOsMult: 0.946,
        highOsMult: 1.372,
        techMult: 1.265,
        energyMult: 1.192,
        consumerMult: 1.140,
        tradAceDiscount: 0.868,
        lowOsTradAceDiscount: 0.887,
        mainMktPremium: 0.997
    };

    function getCalibratedTarget(cincaiVal, sector, market, os, price, geography, ofs) {
        let target = cincaiVal;
        
        // 1. High OS retail pump (momentum play)
        if (os >= 70) {
            target *= bestParams.superHighOsMult;
        } else if (os >= 40) {
            target *= bestParams.highOsMult;
        }
        
        // 2. High-Growth Sektor Theme calibration (only for active/visible stocks)
        const isTech = sector.includes('tech') || sector.includes('technology') || sector.includes('semiconductor');
        if (os >= 15 || market.includes('main')) {
            if (isTech) {
                target *= bestParams.techMult;
            } else if (sector.includes('energy') || sector.includes('utilities') || sector.includes('solar') || sector.includes('renewable')) {
                target *= bestParams.energyMult;
            } else if (sector.includes('consumer') || sector.includes('food') || sector.includes('beverage')) {
                target *= bestParams.consumerMult;
            }
        }
        
        // 3. Flat Sector Discount (applied across both markets)
        const isFlatSector = sector.includes('construction') || sector.includes('property') || sector.includes('energy') || sector.includes('utilities') || sector.includes('infrastructure');
        if (isFlatSector) {
            target *= 0.85; // General flat sector discount based on statistics
        } else if ((sector.includes('industrial') || sector.includes('manufacturing')) && market.includes('ace')) {
            // Traditional small-cap industrial discount on ACE
            if (os < 15) {
                target *= bestParams.lowOsTradAceDiscount;
            } else {
                target *= bestParams.tradAceDiscount;
            }
        }
        
        // 4. Main market dynamic adjustments
        if (market.includes('main')) {
            if (os >= 40) {
                target *= 1.20; // Outlier boost for high demand MAIN listings (up to 300% potential)
            } else if (os < 10) {
                target *= 0.85; // Weak demand penalty (median near baseline)
            } else {
                target *= bestParams.mainMktPremium;
            }
        }

        // 5. Price Sweet Spot and Penny/High-Ticket penalties
        if (price >= 0.30 && price <= 0.50) {
            target *= 1.10; // Retail sweet spot pump
        } else if (price >= 0.75 && price <= 1.00) {
            target *= 1.10; // Growth sweet spot pump
        } else if (price > 0 && price < 0.20) {
            target *= 0.85; // Penny stock penalty (compressed returns)
        } else if (price > 1.00) {
            target *= 0.90; // High ticket drag
        }

        // 6. Geography Premium (Penang, KL/Perak, Johor/Melaka)
        const geo = (geography || '').toLowerCase();
        if (geo === 'penang' && isTech) {
            target *= 1.15; // Penang Silicon Valley Premium
        } else if (geo === 'kuala lumpur' || geo === 'perak' || geo === 'kl') {
            target *= 1.05; // KL & Perak healthy secondary cluster boost
        } else if (geo === 'johor' || geo === 'melaka') {
            target *= 0.95; // Johor/Melaka quiet box penalty
        }

        // 7. OFS Drag (10% discount for day-1 dumping pressure)
        if (ofs === true) {
            target *= 0.90;
        }
        
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
            calibratedTP = getCalibratedTarget(valF, sector, market, os, ipo.price || 0, ipo.geography || '', ipo.ofs);
            source = `stockProfiles (Projection F: RM ${valF.toFixed(2)})`;
        } else {
            // Fallback for dynamic IPOs
            sifuTP = ipo.avgTP || ipo.price || 0.50;
            calibratedTP = getCalibratedTarget(sifuTP, sector, market, os, ipo.price || 0, ipo.geography || '', ipo.ofs);
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
