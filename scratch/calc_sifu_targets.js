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
        (ipo.year === 2026 || ['mnhldg', 'cnergenz', 'destini', 'cbhb', 'hkb', 'iab', 'hss-holdings-berhad', 'liftech-group-berhad'].includes(ipo.id)) && 
        (ipo.status === 'Listed' || ipo.status === 'Application Open') && 
        ipo.shariah === true
    );
    
    console.log('Calculating Sifu Study Target Prices (Valuation 1) for Shariah-Compliant IPOs:\n');
    
    const sifuTargets = {};
    
    targets.forEach(ipo => {
        let sifuTP = 0;
        let source = '';
        
        if (stockProfiles[ipo.id]) {
            const p = stockProfiles[ipo.id];
            // Calculate Valuation 1 for Projection F (earlier column) or alternative
            // Sifu Sheets calculates EPS = (patF / totalShares) * 100
            // Valuation 1 = targetPe * EPS / 100
            // Since we want the entry target price, let's look at the unjuran columns.
            // Sifu Sheets has two unjuran columns: revF/patF and revF1/patF1
            const epsF = (p.patF / p.totalShares) * 100;
            const valF = p.targetPe * epsF / 100;
            
            const epsF1 = (p.patF1 / p.totalShares) * 100;
            const valF1 = p.targetPe * epsF1 / 100;
            
            // We take the minimum (conservative) valuation target of the two columns as the sifu buy alert trigger!
            sifuTP = Math.min(valF, valF1);
            source = `stockProfiles (min of Projections: RM ${valF.toFixed(2)} vs RM ${valF1.toFixed(2)})`;
        } else {
            // Fallback for dynamic IPOs:
            // Sifu's buy target is usually the average target price (avgTP) or IPO price
            sifuTP = ipo.avgTP || ipo.price || 0.50;
            source = ipo.avgTP ? 'avgTP from database' : 'IPO Price (fallback)';
        }
        
        sifuTargets[ipo.id] = parseFloat(sifuTP.toFixed(2));
        console.log(`- ${ipo.id} (${ipo.companyName}): target = RM ${sifuTargets[ipo.id].toFixed(2)} [Source: ${source}]`);
    });
    
    // Save these sifuTargetPrice fields into data.json
    data.forEach(ipo => {
        if (sifuTargets[ipo.id] !== undefined) {
            ipo.sifuTargetPrice = sifuTargets[ipo.id];
        }
    });
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
    console.log('\nSuccessfully saved sifuTargetPrice fields to data.json!');
    
    // Also save to data.js
    const jsPath = path.join(__dirname, '..', 'data.js');
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(jsPath, jsContent);
    console.log('Successfully saved to data.js!');
    
} catch(e) {
    console.error('Error:', e);
}
