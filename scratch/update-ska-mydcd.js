const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const overridesJsonPath = path.join(__dirname, '..', 'overrides.json');
const dataJsPath = path.join(__dirname, '..', 'data.js');
const dataExportJsPath = path.join(__dirname, '..', 'data_export.js');

let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let overrides = JSON.parse(fs.readFileSync(overridesJsonPath, 'utf8'));

// 1. SKA CAPITAL BERHAD
// ACE Market, 895,500,000 shares, IPO Price RM0.43 (Mcap RM385.07M)
// Business: Substation and underground utility engineering
const skaData = {
    financialProfileStatus: 'complete',
    financialEvidenceStatus: 'audited-prospectus',
    financialReviewDate: '29-Oct-2026',
    headers: ['FYE 23', 'FYE 24', 'FYE 25', 'Projection (FYE F)', 'Projection (FYE F+1)'],
    historicalYears: [23, 24, 25],
    projectionHeaders: ['FYE 26 (F)', 'FYE 27 (F+1)'],
    
    // Revenue
    rev23: 44440000,
    rev24: 151800000,
    rev25: 241360000,
    revF: 285000000,
    revF1: 330000000,
    
    // GP
    gp23: 11270000,
    gp24: 29470000,
    gp25: 44040000,
    gpF: 54000000,
    gpF1: 64000000,
    
    // PATAMI
    pat23: 560000,
    pat24: 16290000,
    pat25: 28940000,
    patF: 34500000,
    patF1: 40000000,
    
    // Balance Sheet (Total Assets)
    assets23: 31468000,
    assets24: 65214000,
    assets25: 189095000,
    assetsF: 260000000,
    assetsF1: 300000000,
    
    // Balance Sheet (Total Liabilities)
    liab23: 38087000,
    liab24: 52803000,
    liab25: 153810000,
    liabF: 195000000,
    liabF1: 220000000,
    
    // Per Share & Valuation
    totalShares: 895500000,
    price: 0.43,
    eps23: 0.06,
    eps24: 1.82,
    eps25: 3.23,
    epsF: 3.85,
    epsF1: 4.47,
    epsGrowthF: 19.2,
    epsGrowthF1: 15.9,
    targetPe: 14.0,
    sifuTargetPrice: 0.54,
    calibratedSifuTargetPrice: 0.54,
    v3TargetPrice: 0.52,
    zone1TargetPrice: 0.52,
    zone2TargetPrice: 0.58,
    v7TargetPrice: 0.58,
    fairValue: 0.54,
    sifuGrade: 'B+',
    predictedGrade: 'B+',
    
    financialReview: {
        title: 'SKA: Penyata kewangan prospektus disahkan; pertumbuhan tinggi utiliti grid & pencawang.',
        summary: 'Hasil FY25 RM241.36 juta dan PATAMI RM28.94 juta (EPS 3.23 sen) memberi PE sejarah 13.31x. Unjuran FY26 menjana PATAMI RM34.5 juta (EPS 3.85 sen) didokong order book kukuh RM313.4 juta dalam kejuruteraan pencawang kuasa dan utiliti bawah tanah sempena pemodenan grid TNB dan pusat data.',
        profitLabel: 'PAT attributable to owners (PATAMI)',
        historicalPe: { year: 25, patami: 28940000 },
        scenarioLabel: 'Senario Gandaan Penilaian Berasaskan EPS FY26 (3.85 sen):',
        sopNote: 'Gandaan PE 14.0x wajar berdasarkan segmen kontraktor pencawang/grid kuasa (setaraf MN Holdings). Nilai wajar Sifu RM0.54 memberikan potensi kenaikan +25.6% dari harga IPO RM0.43.'
    }
};

// 2. MYDCD BERHAD
// ACE Market, 1,794,000,000 shares, Reported MITI Price RM0.56 (Mcap RM1,004.64M)
// Business: MEPF integrator for data centres
const mydcdData = {
    financialProfileStatus: 'complete',
    financialEvidenceStatus: 'primary-draft',
    financialReviewDate: '29-Oct-2026',
    headers: ['FYE 23', 'FYE 24', 'FYE 25', 'Projection (FYE F)', 'Projection (FYE F+1)'],
    historicalYears: [23, 24, 25],
    projectionHeaders: ['FYE 26 (F)', 'FYE 27 (F+1)'],
    
    // Revenue
    rev23: 186684000,
    rev24: 180907000,
    rev25: 371985000,
    revF: 360000000,
    revF1: 380000000,
    
    // GP
    gp23: 31428000,
    gp24: 35854000,
    gp25: 61026000,
    gpF: 59400000,
    gpF1: 62700000,
    
    // PATAMI
    pat23: 16780000,
    pat24: 20021000,
    pat25: 39486000,
    patF: 36000000,
    patF1: 38000000,
    
    // Balance Sheet (Total Assets)
    assets23: 126867000,
    assets24: 188037000,
    assets25: 341745000,
    assetsF: 360000000,
    assetsF1: 380000000,
    
    // Balance Sheet (Total Liabilities)
    liab23: 58430000,
    liab24: 99579000,
    liab25: 268802000,
    liabF: 270000000,
    liabF1: 275000000,
    
    // Per Share & Valuation
    totalShares: 1794000000,
    price: 0.56,
    eps23: 0.94,
    eps24: 1.12,
    eps25: 2.20,
    epsF: 2.01,
    epsF1: 2.12,
    epsGrowthF: -8.6,
    epsGrowthF1: 5.5,
    targetPe: 20.0,
    sifuTargetPrice: 0.45,
    calibratedSifuTargetPrice: 0.45,
    v3TargetPrice: 0.40,
    zone1TargetPrice: 0.40,
    zone2TargetPrice: 0.55,
    v7TargetPrice: 0.55,
    fairValue: 0.45,
    sifuGrade: 'B',
    predictedGrade: 'B',
    
    financialReview: {
        title: 'MyDCD: Integrator MEPF pusat data; penilaian premium pada harga MITI RM0.56.',
        summary: 'Hasil FY25 melonjak RM371.99 juta (+105.6%) dan PATAMI RM39.49 juta (EPS 2.20 sen). Pada harga tawaran MITI dilaporkan RM0.56, PE bernilai 25.44x. Order book bertarikh RM213.33M (30 Nov 2025) ditambah kontrak baharu RM206.4M. Dividen pra-IPO yang besar dan penumpuan pelanggan (Binastra 61.7%) wajar diambil kira.',
        profitLabel: 'PATAMI — draf Bursa',
        historicalPe: { year: 25, patami: 39486000 },
        scenarioLabel: 'Senario Gandaan Penilaian Berasaskan EPS FY26 (2.01 sen):',
        sopNote: 'Gandaan PE 20.0x memberikan sasaran wajar RM0.45 (diskaun vs tawaran MITI RM0.56). Sesuai untuk strategi debut / scalp sekiranya sambutan oversubscription tinggi.'
    }
};

// Apply to data.json
const skaIdx = data.findIndex(x => x.id === 'ska-capital-berhad');
if (skaIdx !== -1) {
    Object.assign(data[skaIdx], skaData);
}

const mydcdIdx = data.findIndex(x => x.id === 'mydcd-berhad');
if (mydcdIdx !== -1) {
    Object.assign(data[mydcdIdx], mydcdData);
}

// Apply to overrides.json
overrides['ska-capital-berhad'] = overrides['ska-capital-berhad'] || {};
Object.assign(overrides['ska-capital-berhad'], skaData);

overrides['mydcd-berhad'] = overrides['mydcd-berhad'] || {};
Object.assign(overrides['mydcd-berhad'], mydcdData);

// Save data.json & overrides.json
fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(overridesJsonPath, JSON.stringify(overrides, null, 2), 'utf8');

// Write data.js and data_export.js
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
fs.writeFileSync(dataExportJsPath, jsContent, 'utf8');

console.log('Successfully updated SKA Capital and MyDCD in data.json, overrides.json, data.js, and data_export.js!');
