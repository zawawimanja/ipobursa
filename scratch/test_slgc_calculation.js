const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'sifu-sheets.html');

try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const stockProfilesMatch = htmlContent.match(/const stockProfiles = \{([\s\S]*?)\n        \};/);
    
    eval('var stockProfiles = {' + stockProfilesMatch[1] + '};');
    const data = stockProfiles['slgc-berhad'];
    
    console.log('SLGC Berhad Profile in HTML:');
    console.log(data);
    
    // Test the sifu calculation formula
    const price = data.price;
    const totalShares = data.totalShares;
    
    // FYE F Projection (FYE 25 / target year 1)
    const patF = data.patF;
    const epsF = (patF / totalShares) * 100;
    const perF = price / (epsF / 100);
    const valuationF = (epsF * data.targetPe) / 100;
    const buyLimitF = valuationF * 0.90; // assuming MoS is 10%
    
    // FYE F+1 Alternative (FYE 26 / target year 2)
    const patF1 = data.patF1;
    const epsF1 = (patF1 / totalShares) * 100;
    const perF1 = price / (epsF1 / 100);
    const valuationF1 = (epsF1 * data.targetPe) / 100;
    const buyLimitF1 = valuationF1 * 0.90; // assuming MoS is 10%
    
    console.log('\n--- Calculated Sifu Sheets Metrics for SLGC ---');
    console.log(`Current IPO Price: RM ${price.toFixed(2)}`);
    console.log(`Total Shares: ${totalShares.toLocaleString()}`);
    console.log(`Target PE Multiple: ${data.targetPe}x`);
    
    console.log('\nProjection FYE F:');
    console.log(`- Projected PAT: RM ${(patF/1000000).toFixed(2)}M`);
    console.log(`- Projected EPS: ${epsF.toFixed(2)} sen`);
    console.log(`- Implied PE: ${perF.toFixed(1)}x`);
    console.log(`- Sifu Target Price (Valuation): RM ${valuationF.toFixed(2)}`);
    console.log(`- Buy Zone Limit (10% MoS): RM ${buyLimitF.toFixed(2)}`);
    console.log(`- Status: ${price <= buyLimitF ? 'BELI / ACCUMULATE' : 'ELAK / WAIT FOR DISCOUNT'}`);
    
    console.log('\nProjection FYE F+1:');
    console.log(`- Projected PAT: RM ${(patF1/1000000).toFixed(2)}M`);
    console.log(`- Projected EPS: ${epsF1.toFixed(2)} sen`);
    console.log(`- Implied PE: ${perF1.toFixed(1)}x`);
    console.log(`- Sifu Target Price (Valuation): RM ${valuationF1.toFixed(2)}`);
    console.log(`- Buy Zone Limit (10% MoS): RM ${buyLimitF1.toFixed(2)}`);
    
} catch (err) {
    console.error('Error in calculation script:', err);
}
