const fs = require('fs');

// Path to files
const jsonPath = './data.json';
const jsPath = './data.js';

// Read data.json
let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Find SLGC Berhad
const slgc = data.find(ipo => ipo.id === 'slgc-berhad');

if (slgc) {
    console.log('Original SLGC:', slgc);
    
    // Update fields
    slgc.price = 0.28;
    slgc.currentPrice = 0.28;
    slgc.stage = 2; // MITI Allocation Phase
    slgc.status = 'MITI Allocation Phase';
    slgc.sector = 'Construction';
    slgc.predictedGrade = 'B'; // Upgraded to B since valuation is discounted
    slgc.shariah = true;
    slgc.sifuTargetPrice = 0.36;
    slgc.analystInsight = '🏗️ <b>WORTH IT — DISCOUNTED G7 CONSTRUCTION PLAY</b><br>SLGC ditawarkan pada harga menarik RM0.28 (PE Terbitan 10.7x berdasarkan PAT FY24 RM16.0M). Sebagai kontraktor G7 bertapak kukuh di Johor dengan peluang JS-SEZ, Forward PE jatuh ke paras menarik 9.4x (FY25F). Menawarkan Margin of Safety sekitar 12.5% berbanding harga had beli RM0.32 dan potensi upside +28.6% ke harga sasaran RM0.36.';
    
    console.log('Updated SLGC:', slgc);
    
    // Save data.json
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Successfully updated data.json');
    
    // Save data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('Successfully updated data.js');
} else {
    console.log('SLGC Berhad not found in database!');
}
