const fs = require('fs');
const p = { themeMult: 0.9602, healthMult: 0.9565, tradDisc: 0.7343, mainMult: 1.0220, osScale: -0.0855, upsideScale: 0.0646 };

let jsonData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
let count = 0;

function calcV3(ipo, cincai, sector, market, os) {
    let t = cincai;
    let sg = 'other';
    const secStr = (sector || '').toLowerCase();
    if (secStr.includes('tech') || secStr.includes('consumer') || secStr.includes('energy') || secStr.includes('food')) sg = 'theme';
    else if (secStr.includes('health') || secStr.includes('medical') || secStr.includes('care')) sg = 'health';
    else if (secStr.includes('industrial') || secStr.includes('construction') || secStr.includes('property') || secStr.includes('metal')) sg = 'trad';

    if (sg === 'theme') t *= p.themeMult;
    if (sg === 'health') t *= p.healthMult;
    if (sg === 'trad') t *= p.tradDisc;

    if ((market || '').toLowerCase().includes('main')) t *= p.mainMult;
    
    // Fallback if OS is extremely small or missing
    if (os && os > 0) {
        t *= (1 + p.osScale * Math.log1p(os) / 5);
    } else {
        // Assume default conservative OS of 15
        t *= (1 + p.osScale * Math.log1p(15) / 5);
    }
    
    const upsideRatio = (cincai - ipo) / ipo;
    t *= (1 + p.upsideScale * upsideRatio);
    
    return t;
}

jsonData.forEach(d => {
    if (d.sifuTargetPrice && d.price && d.id !== 'srkk-ai') {
        const v3 = calcV3(d.price, d.sifuTargetPrice, d.sector, d.market, d.os);
        d.v3TargetPrice = parseFloat(v3.toFixed(3));
        d.zone2TargetPrice = d.sifuTargetPrice; // preserve the original Sifu Target for Zone 2
        count++;
    }
});

fs.writeFileSync('data.json', JSON.stringify(jsonData, null, 4));

// Overwrite data.js
let jsOutput = 'const IPO_DATA = ' + JSON.stringify(jsonData, null, 4) + ';\n\nif (typeof module !== \'undefined\' && module.exports) {\n    module.exports = IPO_DATA;\n}\n';
fs.writeFileSync('data.js', jsOutput);

console.log('Successfully recalculated and updated ' + count + ' IPOs with Dual-Target Zones!');
