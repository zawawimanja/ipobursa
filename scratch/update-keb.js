const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const overridesJsonPath = path.join(__dirname, '..', 'overrides.json');
const dataJsPath = path.join(__dirname, '..', 'data.js');
const dataExportJsPath = path.join(__dirname, '..', 'data_export.js');

let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let overrides = JSON.parse(fs.readFileSync(overridesJsonPath, 'utf8'));

// KEB Berhad Prospectus Data (ACE Market, 882.39M shares @ RM0.35)
const kebData = {
    financialProfileStatus: 'complete',
    financialEvidenceStatus: 'audited-prospectus',
    financialReviewDate: '29-Oct-2026',
    headers: ['FYE 23', 'FYE 24', 'FYE 25', 'Projection (FYE F)', 'Projection (FYE F+1)'],
    historicalYears: [23, 24, 25],
    projectionHeaders: ['FYE 26 (F)', 'FYE 27 (F+1)'],
    
    // Revenue
    rev23: 183326000,
    rev24: 187457000,
    rev25: 359270000,
    revF: 380000000,
    revF1: 410000000,
    
    // Gross Profit
    gp23: 64200000,
    gp24: 61900000,
    gp25: 107500000,
    gpF: 114000000,
    gpF1: 123000000,
    
    // PAT
    pat23: 33075000,
    pat24: 33416000,
    pat25: 51610000,
    patF: 55000000,
    patF1: 60000000,
    
    // Balance Sheet (Total Assets)
    assets23: 350000000,
    assets24: 420000000,
    assets25: 492349000,
    assetsF: 530000000,
    assetsF1: 570000000,
    
    // Balance Sheet (Total Liabilities)
    liab23: 180000000,
    liab24: 210000000,
    liab25: 234010000,
    liabF: 245000000,
    liabF1: 255000000,
    
    // Valuation & Multiples
    totalShares: 882390000,
    price: 0.35,
    eps23: 3.75,
    eps24: 3.79,
    eps25: 5.85,
    epsF: 6.23,
    epsF1: 6.80,
    epsGrowthF: 6.5,
    epsGrowthF1: 9.1,
    targetPe: 7.0,
    sifuTargetPrice: 0.44,
    calibratedSifuTargetPrice: 0.44,
    v3TargetPrice: 0.38,
    zone1TargetPrice: 0.38,
    zone2TargetPrice: 0.45,
    v7TargetPrice: 0.45,
    fairValue: 0.44,
    sifuGrade: 'B',
    predictedGrade: 'B',
    
    financialReview: {
        title: 'KEB: Penyata kewangan prospektus disahkan; PAT FY25 melonjak RM51.6 juta.',
        summary: 'Hasil FY25 melonjak RM359.27 juta dan PAT RM51.61 juta (EPS 5.85 sen) didorong kemajuan projek pembangunan hartanah kediaman di Selangor. Pada harga IPO RM0.35, P/E sejarah hanya 5.98x. Sasaran wajar Sifu RM0.44 pada gandaan konservatif P/E 7.0x.',
        profitLabel: 'Profit After Tax (PAT)',
        historicalPe: { year: 25, patami: 51610000 },
        scenarioLabel: 'Senario Gandaan Penilaian Berasaskan EPS FY26 (6.23 sen):',
        sopNote: 'Gandaan P/E 7.0x adalah standard konservatif untuk pemaju hartanah ACE Market. Pada harga RM0.35, saham menawarkan potensi kenaikan +25.7%.'
    }
};

const kebIdx = data.findIndex(x => x.id === 'keb-berhad');
if (kebIdx !== -1) {
    Object.assign(data[kebIdx], kebData);
}

overrides['keb-berhad'] = overrides['keb-berhad'] || {};
Object.assign(overrides['keb-berhad'], kebData);

fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(overridesJsonPath, JSON.stringify(overrides, null, 2), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
fs.writeFileSync(dataExportJsPath, jsContent, 'utf8');

console.log('Successfully updated KEB Berhad with full audited prospectus data!');
