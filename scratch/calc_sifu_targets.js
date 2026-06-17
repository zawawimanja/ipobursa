const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'sifu-sheets.html');
const jsonPath = path.join(__dirname, '..', 'data.json');

try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Extract stockProfiles
    const stockProfilesMatch = htmlContent.match(/const stockProfiles = \{([\s\S]*?)\n        \};/);
    if (!stockProfilesMatch) {
        console.error('FAIL: Could not locate stockProfiles in HTML.');
        process.exit(1);
    }
    
    eval('var stockProfiles = {' + stockProfilesMatch[1] + '};');
    
    const targets = data.filter(ipo => 
        (ipo.year === 2026 || ['mnhldg', 'cnergenz', 'destini', 'cbhb', 'hkb', 'iab', 'hss-holdings-berhad', 'liftech-group-berhad', 'solarvest'].includes(ipo.id)) && 
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

    function getCalibratedTarget(cincaiVal, sector, market, os) {
        let target = cincaiVal;
        
        // 1. High OS retail pump (momentum play)
        if (os >= 70) {
            target *= bestParams.superHighOsMult;
        } else if (os >= 40) {
            target *= bestParams.highOsMult;
        }
        
        // 2. High-Growth Sektor Theme calibration (only for active/visible stocks)
        if (os >= 15 || market === 'main') {
            if (sector === 'tech' || sector === 'technology') {
                target *= bestParams.techMult;
            } else if (sector === 'energy' || sector === 'utilities') {
                target *= bestParams.energyMult;
            } else if (sector === 'consumer') {
                target *= bestParams.consumerMult;
            }
        }
        
        // 3. Traditional small-cap discount
        if ((sector === 'industrial' || sector === 'construction' || sector === 'property') && market === 'ace') {
            if (os < 15) {
                target *= bestParams.lowOsTradAceDiscount;
            } else {
                target *= bestParams.tradAceDiscount;
            }
        }
        
        // 4. Main market premium
        if (market === 'main' && os >= 10) {
            target *= bestParams.mainMktPremium;
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
        
        if (stockProfiles[ipo.id]) {
            const p = stockProfiles[ipo.id];
            // Calculate Valuation 1 for Projection F (first projection column)
            // Sifu Sheets calculates EPS = (patF / totalShares) * 100
            // Valuation 1 = targetPe * EPS / 100
            const epsF = (p.patF / p.totalShares) * 100;
            const valF = p.targetPe * epsF / 100;
            
            sifuTP = valF;
            calibratedTP = getCalibratedTarget(valF, sector, market, os);
            source = `stockProfiles (Projection F: RM ${valF.toFixed(2)})`;
        } else {
            // Fallback for dynamic IPOs
            sifuTP = ipo.avgTP || ipo.price || 0.50;
            calibratedTP = getCalibratedTarget(sifuTP, sector, market, os);
            source = ipo.avgTP ? 'avgTP from database' : 'IPO Price (fallback)';
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
