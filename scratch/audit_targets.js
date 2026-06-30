const fs = require('fs');
const path = require('path');

// Load data.json
const jsonPath = path.join(__dirname, '..', 'data.json');
if (!fs.existsSync(jsonPath)) {
    console.error("data.json not found");
    process.exit(1);
}
const ipoData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Stock ID | Web App Val1 (FYE F) | Web App Val1 (FYE F1) | sifuTargetPrice (data.json)');
console.log('------------------------------------------------------------------------------------');

ipoData.forEach(ipo => {
    if (ipo.headers !== undefined && ipo.patF !== undefined && ipo.totalShares !== undefined && ipo.targetPe !== undefined) {
        // Column 4: FYE F
        const epsF = (ipo.patF / ipo.totalShares) * 100;
        const valF = (epsF * ipo.targetPe) / 100;
        
        // Column 5: FYE F1
        let valF1 = 0;
        if (ipo.patF1 !== undefined) {
            const epsF1 = (ipo.patF1 / ipo.totalShares) * 100;
            valF1 = (epsF1 * ipo.targetPe) / 100;
        }
        
        const sifuTarget = ipo.sifuTargetPrice !== undefined ? `RM ${ipo.sifuTargetPrice.toFixed(2)}` : 'N/A';
        
        console.log(`${ipo.id.padEnd(20)} | RM ${valF.toFixed(2)} | RM ${valF1.toFixed(2)} | ${sifuTarget}`);
    }
});
