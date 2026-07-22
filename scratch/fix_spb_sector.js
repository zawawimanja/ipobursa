const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '../data.json');
const dataJsPath = path.join(__dirname, '../data.js');

let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let spb = data.find(x => x.id === 'spb-development-berhad');

if (spb) {
    spb.sector = 'Property (Housing Development)';
    spb.shariah = true;
    spb.predictedGrade = 'C';
    spb.mitiOpenDate = '01-Jul-2026';
    spb.mitiCloseDate = '10-Jul-2026';
    spb.analystInsight = '🚨 <b>AVOID / HIGH RISK (GRADE C — SEKTOR HARTANAH)</b><br>Syarikat pemaju hartanah perumahan di utara Semenanjung.';
    
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
    fs.writeFileSync(dataJsPath, 'const ipoData = ' + JSON.stringify(data, null, 4) + ';\nif (typeof module !== "undefined") module.exports = ipoData;\n', 'utf8');
    console.log('Successfully updated spb-development-berhad in data.json and data.js!');
}
