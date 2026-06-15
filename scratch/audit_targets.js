const fs = require('fs');
const path = require('path');

// Load data.js
const dataJsPath = path.join(__dirname, '..', 'data.js');
const dataJsContent = fs.readFileSync(dataJsPath, 'utf8');
const jsonMatch = dataJsContent.match(/const\s+IPO_DATA\s*=\s*([\s\S]+?);/);
if (!jsonMatch) {
    console.error("Could not parse data.js");
    process.exit(1);
}
const ipoData = JSON.parse(jsonMatch[1]);

// Load sifu-sheets.html
const sifuSheetsPath = path.join(__dirname, '..', 'sifu-sheets.html');
const sifuSheetsContent = fs.readFileSync(sifuSheetsPath, 'utf8');
const profilesMatch = sifuSheetsContent.match(/const stockProfiles = (\{[\s\S]+?\});/);
if (!profilesMatch) {
    console.error("Could not parse stockProfiles from sifu-sheets.html");
    process.exit(1);
}

// Evaluate stockProfiles
const stockProfiles = eval('(' + profilesMatch[1] + ')');

console.log('Stock ID | Web App Val1 (FYE F) | Web App Val1 (FYE F1) | sifuTargetPrice (data.js)');
console.log('----------------------------------------------------------------------------------');

for (const key in stockProfiles) {
    const data = stockProfiles[key];
    
    // Column 4: FYE F
    const patF = data.patF;
    const totalShares = data.totalShares;
    const targetPe = data.targetPe;
    const epsF = (patF / totalShares) * 100;
    const valF = (epsF * targetPe) / 100;
    
    // Column 5: FYE F1
    const patF1 = data.patF1;
    const epsF1 = (patF1 / totalShares) * 100;
    const valF1 = (epsF1 * targetPe) / 100;
    
    const ipo = ipoData.find(x => x.id === key);
    const sifuTarget = ipo ? ipo.sifuTargetPrice : 'N/A';
    
    console.log(`${key.padEnd(20)} | RM ${valF.toFixed(2)} | RM ${valF1.toFixed(2)} | RM ${sifuTarget}`);
}
