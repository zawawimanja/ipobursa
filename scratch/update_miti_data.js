const fs = require('fs');

// 1. Update data.json
let jsonData = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const updateIPO = (ipo) => {
    if (ipo.id === 'keb-berhad') {
        ipo.stage = 2;
        ipo.status = 'MITI Allocation Phase';
        ipo.sector = 'Property';
        ipo.shariah = true;
        ipo.predictedGrade = 'B';
        ipo.sifuTargetPrice = 0.34;
        ipo.calibratedSifuTargetPrice = 0.34;
        ipo.v3TargetPrice = 0.34;
        ipo.zone2TargetPrice = 0.34;
        ipo.analystInsight = '✅ <b>WORTH IT (GRADE B — MITI)</b><br>Syarikat pemaju hartanah dengan pertumbuhan PAT kukuh (+23% CAGR FY25) dan margin PAT yang sihat (16.2%).<br><br>📊 <b>Valuation & Advisor:</b><br>• Ditaja oleh <b>M&A Securities</b> (IB terkemuka dengan rekod prestasi cemerlang untuk premium hari pertama).<br>• Gandaan PE Terbitan dianggarkan sekitar <b>9.9x PE</b> (berdasarkan PAT FY25 RM24.88M), menawarkan diskaun berbanding purata industri (12x-15x PE).<br><br>⚠️ Saham Khas Bumiputera (SKB) kini dibuka untuk permohonan melalui portal SahamOnline MITI dari 13 Julai hingga 22 Julai 2026.';
    } else if (ipo.id === 'gb-bond-holdings-berhad') {
        ipo.stage = 2;
        ipo.status = 'MITI Allocation Phase';
        ipo.sector = 'Industrial Products & Services (Chemicals)';
        ipo.shariah = true;
        ipo.predictedGrade = 'B';
        ipo.sifuTargetPrice = 0.30;
        ipo.calibratedSifuTargetPrice = 0.30;
        ipo.v3TargetPrice = 0.30;
        ipo.zone2TargetPrice = 0.30;
        ipo.analystInsight = '✅ <b>WORTH IT (GRADE B — MITI)</b><br>Syarikat pengeluar pelekat industri (industrial adhesives), emulsion polymers, dan sealants yang bertapak di Pulau Pinang.<br><br>📊 <b>Valuation & Fundamental:</b><br>• Ditaja oleh <b>Malacca Securities</b> (Sponsor/IB berwibawa).<br>• Pertumbuhan PAT dilaraskan (adjusted PAT) meningkat mantap sebanyak <b>+62.3%</b> (dari RM5.04M FY23 kepada RM8.18M FY24).<br>• Gandaan PE Terbitan sekitar <b>12.6x PE</b> (berdasarkan adjusted PAT FY24) atau <b>9.9x PE</b> (berdasarkan unadjusted PAT FY24), yang sangat munasabah bagi sektor pembuatan kimia.<br><br>⚠️ Saham Khas Bumiputera (SKB) kini dibuka untuk permohonan melalui portal SahamOnline MITI dari 13 Julai hingga 19 Julai 2026. Status Shariah disahkan patuh oleh SC.';
    }
};

jsonData.forEach(updateIPO);
fs.writeFileSync('data.json', JSON.stringify(jsonData, null, 2));
console.log('Updated data.json');

// 2. Update data.js
const jsContent = `const IPO_DATA = ${JSON.stringify(jsonData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
fs.writeFileSync('data.js', jsContent);
console.log('Updated data.js');

// 3. Update data_export.js
if (fs.existsSync('data_export.js')) {
    let exportData = require('../data_export.js');
    exportData.forEach(updateIPO);
    const expContent = `const IPO_DATA = ${JSON.stringify(exportData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
    fs.writeFileSync('data_export.js', expContent);
    console.log('Updated data_export.js');
}

// 4. Update scratch/temp_data.js
if (fs.existsSync('scratch/temp_data.js')) {
    try {
        let tempData = require('./temp_data.js');
        tempData.forEach(updateIPO);
        const tempContent = `module.exports = ${JSON.stringify(tempData, null, 2)};`;
        fs.writeFileSync('scratch/temp_data.js', tempContent);
        console.log('Updated scratch/temp_data.js');
    } catch (e) {
        console.error('Failed to update scratch/temp_data.js:', e.message);
    }
}
