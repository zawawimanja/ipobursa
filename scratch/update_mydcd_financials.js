// Update MyDCD Berhad entry with actual figures extracted from the prospectus PDF
const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');

const mydcdUpdate = {
    // IPO / MITI stage
    symbol: 'MYDCD',
    market: 'ACE Market',
    price: 0.56,
    shariah: true,
    stage: 1,
    status: 'Draft / Exposure Phase',
    year: 2026,
    sector: 'Technology (Data Centre)',
    geography: 'Kuala Lumpur',
    ib: 'TA Securities',
    fundUse: 'Hiring 12.66%, sewa pejabat 7.16%, latihan 3.58%, IT 5.97%, subcontracted costs 35.30%, opex lain 8.82%, performance bond 17.91%, kos penyenaraian 8.60%',
    predictedGrade: 'B',
    analystInsight: "✅ <b>TEMA PUSAT DATA — HARGA MAHAL (GRADE B — MITI)</b><br>MyDCD ialah integrator MEPF untuk pusat data melalui DCD Technology Sdn Bhd (est. 2010). 95.6% hasil FYE2025 daripada integrasi MEPF pusat data.<br><br>📊 <b>Fundamental (prospektus):</b><br>• Hasil FYE2025 RM372.0 juta (+105.6% YoY), PAT RM39.5 juta (margin 10.6%); GP margin hanya 16.4%.<br>• EPS FYE2025 atas modal diperbesar 1,794 juta saham = 2.20 sen → P/E ±25.5x pada RM0.56 — premium untuk margin nipis.<br>• Order book RM213.33 juta (30 Nov 2025): 92% diiktiraf FYE2026; +8 kontrak DC baharu RM206.40 juta (18 Dis 2025).<br>• Konsentrasi melampau: Binastra 61.7% (RM229.5 juta), top-5 = 94.2% hasil.<br>• Dividen pra-IPO RM55 juta + hingga RM33 juta = payout sehingga 223% sebelum listing!<br>• IPO: 335 juta saham baharu (18.7% modal diperbesar) + OFS 145 juta (30.2%; RM81.2 juta ke penjual).<br><br>⚠️ <b>Kesimpulan:</b> RM0.56 melebihi nilai wajar anggaran RM0.40-0.45 (PE 20x). Sesuai scalp jika OS tinggi — bukan hold jangka panjang pada harga ini.",
    prospectusUrl: 'https://www.bursamalaysia.com/regulation/prospectus_exposure/mydcd-berhad-mydcd',
    ofs: true,
    ofsPercentage: 30.2,
    hasMitiTranche: true,
    // Sifu sheet profile — actuals from prospectus, projections are base-case estimates
    totalShares: 1794000000,
    headers: ['FYE 23', 'FYE 24', 'FYE 25', 'Projection (FYE F)', 'Projection (FYE F+1)'],
    rev23: 186684000, rev24: 180907000, rev25: 371985000,
    revF: 360000000, revF1: 380000000,
    gp23: 31428000, gp24: 35854000, gp25: 61026000,
    gpF: 59400000, gpF1: 62700000,
    pat23: 16780000, pat24: 20021000, pat25: 39486000,
    patF: 36000000, patF1: 38000000,
    eps23: 0.94, eps24: 1.12, eps25: 2.2,
    epsF: 2.01, epsF1: 2.12,
    epsGrowthF: -8.6, epsGrowthF1: 5.5,
    assets23: 126867000, assets24: 188037000, assets25: 341745000,
    assetsF: 360000000, assetsF1: 380000000,
    liab23: 58430000, liab24: 99579000, liab25: 268802000,
    liabF: 270000000, liabF1: 275000000,
    targetPe: 20,
    sifuTargetPrice: 0.45,
    calibratedSifuTargetPrice: 0.45,
    v3TargetPrice: 0.4,
    zone2TargetPrice: 0.55,
    v7TargetPrice: 0.55,
    catalysts: [
        'Catalyst 1: Order book RM213.33 juta (92% diiktiraf FYE2026) + 8 kontrak pusat data baharu bernilai RM206.40 juta (disahkan 18 Dis 2025).',
        'Catalyst 2: Rekod kukuh: Customer A Group (12 projek DC, RM288 juta) & Customer B Group (42 projek DC, RM147 juta; 18 projek berjalan RM79.78 juta); Binastra — projek DC Bukit Jalil & Cyberjaya.',
        'Catalyst 3: Hasil IPO: 17.9% untuk performance bond projek masa depan, 35.3% subcontracted costs — kapasiti projek lebih besar.'
    ],
    peers: 'Peer comparison: MN Holdings (P/E ~16-20x, P/S ~2.1x), EI Power (ACE, infrastruktur kuasa DC), Binastra Corp (pembinaan DC). Median Sektor Technology PE ~21x. MyDCD P/E ±25.5x — premium.',
    freeFloat: 0.38,
    anchorInvestors: false,
    lockupMonths: 6,
    promoterQuality: 'experienced_founder'
};

// 1. Update data.json
let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let my = data.find(x => x.id === 'mydcd-berhad');
if (!my) { console.error('mydcd-berhad not found in data.json'); process.exit(1); }
Object.assign(my, mydcdUpdate);
fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
console.log('Updated data.json');

// 2. Rewrite data.js from data.json (current wrapper: const IPO_DATA = [...])
const jsWrapper = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'data.js'), jsWrapper, 'utf8');
console.log('Updated data.js');

// 3. Rewrite data_export.js from data.json (same wrapper, 2-space)
fs.writeFileSync(path.join(__dirname, '..', 'data_export.js'), jsWrapper, 'utf8');
console.log('Updated data_export.js');

// 4. Sanity checks
const check = require(path.join(__dirname, '..', 'data.js')).find(x => x.id === 'mydcd-berhad');
const mcap = check.price * check.totalShares;
const eps25 = (check.pat25 / check.totalShares) * 100;
const per25 = check.price / (eps25 / 100);
const valF = ((check.patF / check.totalShares) * 100 * check.targetPe) / 100;
console.log('--- MyDCD verification ---');
console.log('Market cap @ RM0.56: RM', (mcap / 1e6).toFixed(1), 'M');
console.log('EPS FYE2025:', eps25.toFixed(2), 'sen | PER:', per25.toFixed(1), 'x');
console.log('Val F (PE', check.targetPe, '): RM', valF.toFixed(2));
console.log('NTA per share (FYE2025): RM', ((check.assets25 - check.liab25) / check.totalShares).toFixed(3));
