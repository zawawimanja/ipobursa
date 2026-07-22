const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '../data.json');
const dataJsPath = path.join(__dirname, '../data.js');

let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let target = data.find(x => x.id === 'redplanet-berhad');

if (target) {
    target.stage = 2;
    target.status = 'MITI Allocation Phase';
    target.sector = 'Technology (Geospatial / GIS)';
    target.predictedGrade = 'B';
    target.prospectusUrl = 'https://sahamonline.miti.gov.my/';
    target.analystInsight = '✅ <b>WORTH IT (GRADE B — MITI)</b><br>Syarikat teknologi kepakaran penyelesaian Sistem Maklumat Geografi (GIS) & Geospatial yang memindahkan penyenaraian dari Pasaran LEAP ke Pasaran ACE Bursa Malaysia.<br><br>📊 <b>Butiran Pemindahan & MITI:</b><br>• Diluluskan Suruhanjaya Sekuriti (SC) untuk peruntukan 12.50% saham khas Bumiputera (MITI).<br>• Mempunyai kepakaran unik dalam sektor teknologi GIS (pemetaan digital & pengurusan geospatial).<br><br>⚠️ Status: Fasa permohonan/alokasi MITI (Stage 2).';
    
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
    fs.writeFileSync(dataJsPath, 'const ipoData = ' + JSON.stringify(data, null, 4) + ';\nif (typeof module !== "undefined") module.exports = ipoData;\n', 'utf8');
    console.log('Successfully updated RedPlanet Berhad to Stage 2 (MITI Allocation Phase) in data.json and data.js!');
} else {
    console.log('RedPlanet Berhad not found!');
}
