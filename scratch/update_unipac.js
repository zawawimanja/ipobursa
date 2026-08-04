const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');
const exportPath = path.join(__dirname, '..', 'data_export.js');
const overridesPath = path.join(__dirname, '..', 'overrides.json');

const unipacData = {
    id: "united-asiapac-energy-berhad",
    companyName: "United Asiapac Energy Berhad",
    symbol: "UNIPAC",
    market: "ACE Market",
    price: 0.35,
    openingDate: "2026-07-28T09:00:00",
    closingDate: "05-Aug-2026",
    listingDate: "19-Aug-2026",
    shariah: true,
    stage: 3,
    status: "Application Open",
    year: 2026,
    sector: "Energy (Oil & Gas Services / Well Intervention)",
    ib: "TA Securities",
    fundUse: "Acquisition of specialised well intervention tools & equipment, expansion of workforce, and new corporate office.",
    geography: "Terengganu / Labuan",
    pe: 27.6,
    ofs: false,
    sifuTargetPrice: 0.41,
    calibratedSifuTargetPrice: 0.41,
    v3TargetPrice: 0.39,
    zone2TargetPrice: 0.41,
    v7TargetPrice: 0.41,
    predictedGrade: "B",
    analystInsight: "✅ <b>WORTH IT (GRADE B)</b><br>United Asiapac Energy Berhad (UNIPAC) ialah penyedia perkhidmatan intervensi telaga (well intervention) khusus untuk industri minyak & gas hulu (upstream) di Kemaman, Terengganu dan Labuan.<br><br>📊 <b>Valuation & Advisor:</b><br>• Ditaja oleh <b>TA Securities</b> (IB momentum yang baik).<br>• Harga IPO RM0.35 memberikan trailing PE sebanyak <b>27.6x</b> berdasarkan PAT FY25 (RM6.98 juta). Walau bagaimanapun, forward PE adalah sangat menarik sekitar <b>12.7x</b> berdasarkan unjuran tahunan PAT FPE2026 (9-bulan) sebanyak RM11.3M - RM11.4M.<br>• Tiada komponen <b>Offer for Sale (OFS)</b> — 100% dana awam digunakan untuk pertumbuhan syarikat.<br><br>⚠️ <b>Sifu/Analyst Verdict:</b> MBSB Research meletakkan fair value RM0.39 (selepas disemak naik). Sifat perniagaan well intervention yang defensif dan kurang terikat terus dengan harga minyak mentah menjadikan UNIPAC sebagai kaunter bernilai baik. Sasaran harga jangka pendek sekitar RM0.41 (upside ~17%). Permohonan ditutup pada 5 Ogos 2026.",
    mitiOpenDate: "01-Jul-2026",
    mitiCloseDate: "10-Jul-2026"
};

// 1. Update data.json
console.log('Reading data.json...');
let dataJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let index = dataJson.findIndex(x => x.id === unipacData.id);
if (index !== -1) {
    dataJson[index] = { ...dataJson[index], ...unipacData };
    console.log('Updated in data.json');
} else {
    dataJson.unshift(unipacData);
    console.log('Added new entry to data.json');
}
fs.writeFileSync(jsonPath, JSON.stringify(dataJson, null, 4), 'utf8');

// 2. Generate and write data.js
const jsContent = `const IPO_DATA = ${JSON.stringify(dataJson, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('Updated data.js');

// 3. Update data_export.js
if (fs.existsSync(exportPath)) {
    console.log('Reading data_export.js...');
    // We can require it because it exports standard module
    let dataExport = require(exportPath);
    let expIndex = dataExport.findIndex(x => x.id === unipacData.id);
    if (expIndex !== -1) {
        dataExport[expIndex] = { ...dataExport[expIndex], ...unipacData };
        console.log('Updated in data_export.js');
    } else {
        dataExport.unshift(unipacData);
        console.log('Added new entry to data_export.js');
    }
    const exportContent = `const IPO_DATA = ${JSON.stringify(dataExport, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(exportPath, exportContent, 'utf8');
}

// 4. Update overrides.json
if (fs.existsSync(overridesPath)) {
    console.log('Reading overrides.json...');
    let overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
    overrides[unipacData.id] = {
        symbol: unipacData.symbol,
        price: unipacData.price,
        openingDate: unipacData.openingDate,
        closingDate: unipacData.closingDate,
        listingDate: unipacData.listingDate,
        stage: unipacData.stage,
        status: unipacData.status,
        sector: unipacData.sector,
        ib: unipacData.ib,
        fundUse: unipacData.fundUse,
        geography: unipacData.geography,
        pe: unipacData.pe,
        ofs: unipacData.ofs,
        sifuTargetPrice: unipacData.sifuTargetPrice,
        calibratedSifuTargetPrice: unipacData.calibratedSifuTargetPrice,
        v3TargetPrice: unipacData.v3TargetPrice,
        zone2TargetPrice: unipacData.zone2TargetPrice,
        v7TargetPrice: unipacData.v7TargetPrice,
        predictedGrade: unipacData.predictedGrade,
        analystInsight: unipacData.analystInsight,
        mitiOpenDate: unipacData.mitiOpenDate,
        mitiCloseDate: unipacData.mitiCloseDate
    };
    fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
    console.log('Updated overrides.json');
}

console.log('All updates completed successfully!');
