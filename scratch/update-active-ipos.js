const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const dataJsonPath = path.join(ROOT, 'data.json');
const overridesJsonPath = path.join(ROOT, 'overrides.json');
const dataJsPath = path.join(ROOT, 'data.js');
const dataExportJsPath = path.join(ROOT, 'data_export.js');

let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let overrides = JSON.parse(fs.readFileSync(overridesJsonPath, 'utf8'));

// 1. Big Caring Group Bhd (BCG) - Listed Today 19 Nov 2026
const bcgPatch = {
    code: '5358',
    symbol: 'BCG',
    price: 1.08,
    openPrice: 1.05,
    currentPrice: 1.08,
    closePrice: 1.08,
    highPrice: 1.19,
    lowPrice: 0.98,
    performance: '0.00%',
    debutChange: '-2.78%',
    dailyChange: '+2.86%',
    stage: 5,
    status: 'Listed',
    listingDate: '19-Nov-2026',
    analystInsight: '<b>Debut Listing 19 Nov 2026 (Main Market):</b> Dibuka pada RM1.05 (-2.78% / diskaun 3 sen) berbanding harga tawaran IPO RM1.08. Saham menyentuh paras terendah RM0.98 sebelum melonjak ke paras tertinggi RM1.19 (+10.2%) dan ditutup stabil pada paras tawaran <b>RM1.08 (0.00% / flat)</b> dengan dagangan rancak.<br>• <b>Skala Mega & Sokongan Cornerstone:</b> Penyenaraian terbesar 2026 dengan permodalan pasaran RM8.0 bilion didokong 19 pelabur institusi terkemuka (JPMorgan, IFC Bank Dunia, abrdn dll) yang menyerap 665.5 juta unit (9.0% modal diperbesarkan).<br>• <b>Keputusan Langganan & Fundamental:</b> Langganan awam 4.31×. PATAMI FY26 disahkan RM191.6 juta (+56.7%) dan penjimatan kos faedah pinjaman bank ~RM26.3 juta setahun daripada RM570.7 juta hasil IPO yang digunakan untuk melunaskan pinjaman.'
};

// 2. IOIPG Malaysia REIT (IOIREIT) - Stage 4 (Pre-Listing, Listing 25 Nov 2026)
const ioiPatch = {
    code: '5359',
    symbol: 'IOIREIT',
    price: 0.91, // Final price trimmed from initial max 0.96; 5 sen cash refund for retail
    stage: 4,
    status: 'Pre-Listing',
    openingDate: '03-Nov-2026',
    closingDate: '10-Nov-2026',
    listingDate: '25-Nov-2026',
    totalShares: 5500000000,
    marketCap: 5005000000,
    sector: 'REITs',
    market: 'Main Market',
    financialProfileStatus: 'complete',
    targetPe: 15,
    fairValue: 0.98,
    sifuTargetPrice: 0.98,
    calibratedSifuTargetPrice: 0.98,
    v7TargetPrice: 1.00,
    zone2TargetPrice: 1.05,
    analystInsight: '📊 <b>REIT PERTAMA IOI — HARGA AKHIR RM0.91 & UNJURAN YIELD ~7.0%</b><br>• <b>Penetapan Harga Akhir:</b> Harga runcit & institusi dimuktamadkan pada RM0.91/unit (diskaun 5 sen dari harga siling RM0.96; pemohon runcit menerima pulangan tunai 5 sen sesaham). Nilai ini sejajar dengan NAV pro forma RM0.896.<br>• <b>Portfolio Landmark:</b> Menempatkan IOI City Mall (pusat beli-belah kedua terbesar Malaysia), IOI City Towers, PFCC Towers dan 6 hotel premium.<br>• <b>Yield Dividen:</b> Unjuran yield agihan tunai melonjak kepada ~6.96% - 7.00% berikutan pelarasan harga kepada RM0.91. Sesuai untuk pelabur pendapatan dividen defensif.'
};

// 3. Impact Capital Holdings Berhad (IMPACT) - Stage 4 (Pre-Listing, Listing 24 Nov 2026)
const impactPatch = {
    code: '0483',
    symbol: 'IMPACT',
    price: 0.22,
    stage: 4,
    status: 'Pre-Listing',
    openingDate: '27-Oct-2026',
    closingDate: '06-Nov-2026',
    listingDate: '24-Nov-2026',
    os: 139.69,
    predictedGrade: 'A',
    sifuGrade: 'A',
    analystInsight: '🔥 <b>LEBIHAN LANGGANAN HANGAT 139.69× (GRADE A)</b><br>• <b>Sambutan Luar Biasa:</b> Tranche awam terlebih langgan sebanyak 139.69 kali (sebanyak 15,203 permohonan bernilai RM743.6 juta untuk 24 juta saham yang diperuntukkan). Bahagian Bumiputera terlebih langgan 135.15×, Bukan-Bumi 144.23×.<br>• <b>Valuation Menarik:</b> Implied PE hanya 11.3x pada harga IPO RM0.22 dengan unjuran sasaran Sifu RM0.29 (P/E 15.0x).<br>• <b>Kekuatan Fundamental:</b> Order book RM169.9 juta di Sarawak, penerima manfaat digitalisasi negeri & pusat data, serta Patuh Syariah.'
};

// 4. Yes Group Management Berhad (YES) - Stage 4 (Pre-Listing, Listing 26 Nov 2026)
const yesPatch = {
    code: '0485',
    symbol: 'YES',
    companyName: 'Yes Group Management Berhad',
    market: 'ACE Market',
    sector: 'Consumer Services (Corporate Incentive Travel & Events)',
    shariah: true,
    price: 0.18,
    totalShares: 530000000,
    marketCap: 95400000,
    stage: 4,
    status: 'Pre-Listing',
    openingDate: '04-Nov-2026',
    closingDate: '13-Nov-2026',
    listingDate: '26-Nov-2026',
    ballotingDate: '18-Nov-2026',
    os: 1.80,
    isAutoOS: true,
    osMetric: 'overall-public-oversubscription',
    osSourceDate: '18 Nov 2026',
    predictedGrade: 'B',
    sifuGrade: 'B',
    headers: ['FYE 24', 'FYE 25', 'FYE 26', 'Projection (FYE 27)', 'Projection (FYE 28)'],
    historicalYears: [24, 25, 26],
    projectionHeaders: ['FYE 27 (F)', 'FYE 28 (F+1)'],
    rev24: 47629000,
    rev25: 75474000,
    rev26: 67143000,
    revF: 75000000,
    revF1: 82000000,
    gp24: 11828000,
    gp25: 15893000,
    gp26: 16034000,
    gpF: 18000000,
    gpF1: 19800000,
    pat24: 5199000,
    pat25: 7343000,
    pat26: 7534000,
    patF: 8500000,
    patF1: 9500000,
    assets24: 32000000,
    assets25: 45000000,
    assets26: 52000000,
    assetsF: 68000000,
    assetsF1: 76000000,
    liab24: 14000000,
    liab25: 18000000,
    liab26: 21000000,
    liabF: 22000000,
    liabF1: 23000000,
    eps24: 0.98,
    eps25: 1.39,
    eps26: 1.42,
    epsF: 1.60,
    epsF1: 1.79,
    epsGrowthF: 12.8,
    epsGrowthF1: 11.8,
    pe: 12.68,
    ipoPe: 12.68,
    targetPe: 14.0,
    fairValue: 0.22,
    sifuTargetPrice: 0.22,
    calibratedSifuTargetPrice: 0.22,
    v7TargetPrice: 0.22,
    zone2TargetPrice: 0.24,
    financialProfileStatus: 'complete',
    financialEvidenceStatus: 'audited-prospectus',
    analystInsight: '<b>Pre-Listing (Balloting 1.80×):</b> Langganan awam 1.80× (kadar langganan 2.80× dengan 2,053 permohonan untuk 74.15 juta saham). Tranche Bukan-Bumiputera mencatatkan langganan 4.11× manakala tranche Bumiputera 0.49× (diserap oleh Bukan-Bumi).<br>• <b>Bisnes MICE & Pelancongan Korporat:</b> Menerajui jenama Yes Travel dalam penganjuran pelancongan insentif korporat dan acara korporat berskala besar.<br>• <b>Valuation:</b> Pada harga IPO RM0.18, PE bersejarah ialah 12.68x (PAT FY26 RM7.53 juta). Sasaran wajar Sifu RM0.22 berasaskan unjuran PE 14.0x.'
};

// 5. Emits Berhad (EMITS) - Stage 3 (Application Open - closing today 19 Nov 2026)
const emitsPatch = {
    code: '0486',
    symbol: 'EMITS',
    companyName: 'Emits Berhad',
    market: 'ACE Market',
    sector: 'Technology (OEM Passive Antennas & Telecommunications)',
    shariah: true,
    price: 0.16,
    totalShares: 468769000,
    marketCap: 75003040,
    stage: 3,
    status: 'Application Open',
    openingDate: '06-Nov-2026',
    closingDate: '19-Nov-2026',
    listingDate: '01-Dec-2026',
    predictedGrade: 'B',
    sifuGrade: 'B',
    headers: ['FYE 23', 'FYE 24', 'FYE 25', 'Projection (FYE 26)', 'Projection (FYE 27)'],
    historicalYears: [23, 24, 25],
    projectionHeaders: ['FYE 26 (F)', 'FYE 27 (F+1)'],
    rev23: 32010000,
    rev24: 40990000,
    rev25: 39650000,
    revF: 45000000,
    revF1: 52000000,
    gp23: 8100000,
    gp24: 12380000,
    gp25: 11120000,
    gpF: 13000000,
    gpF1: 15500000,
    pat23: 2170000,
    pat24: 5830000,
    pat25: 5200000,
    patF: 6200000,
    patF1: 7500000,
    assets23: 28000000,
    assets24: 36000000,
    assets25: 42000000,
    assetsF: 52000000,
    assetsF1: 61000000,
    liab23: 11000000,
    liab24: 14000000,
    liab25: 16000000,
    liabF: 17000000,
    liabF1: 18000000,
    eps23: 0.46,
    eps24: 1.24,
    eps25: 1.11,
    epsF: 1.32,
    epsF1: 1.60,
    epsGrowthF: 19.2,
    epsGrowthF1: 21.0,
    pe: 14.41,
    ipoPe: 14.41,
    targetPe: 15.0,
    fairValue: 0.20,
    sifuTargetPrice: 0.20,
    calibratedSifuTargetPrice: 0.20,
    v7TargetPrice: 0.20,
    zone2TargetPrice: 0.22,
    financialProfileStatus: 'complete',
    financialEvidenceStatus: 'audited-prospectus',
    analystInsight: '<b>Permohonan Awam Dibuka (Tutup 19 Nov 2026):</b> Pengeluar antena pasif (OEM) untuk industri telekomunikasi selular global.<br>• <b>Asas Kewangan:</b> Hasil FY25 RM39.65 juta dengan PAT RM5.20 juta (EPS 1.11 sen). Pada harga IPO 16 sen, PE sejarah ialah 14.4x.<br>• <b>Pertumbuhan & Status Syariah:</b> Patuh Syariah sepenuhnya, mendapat manfaat daripada peningkatan rangkaian telekomunikasi 5G dan IoT. Sasaran wajar Sifu RM0.20 (PE 15.0x).'
};

// 6. SCA Solutions Berhad (SCA) - Stage 3 (Application Open - 18 Nov to 26 Nov 2026)
const scaPatch = {
    code: '0487',
    symbol: 'SCA',
    companyName: 'SCA Solutions Berhad',
    market: 'ACE Market',
    sector: 'Industrial Products & Services (Automation & Engineering Solutions)',
    shariah: true,
    price: 0.28,
    totalShares: 569630000,
    marketCap: 159496400,
    stage: 3,
    status: 'Application Open',
    openingDate: '18-Nov-2026',
    closingDate: '26-Nov-2026',
    listingDate: '09-Dec-2026',
    predictedGrade: 'B',
    sifuGrade: 'B',
    headers: ['FYE 22', 'FYE 23', 'FYE 24', 'Projection (FYE 25)', 'Projection (FYE 26)'],
    historicalYears: [22, 23, 24],
    projectionHeaders: ['FYE 25 (F)', 'FYE 26 (F+1)'],
    rev22: 40762000,
    rev23: 47242000,
    rev24: 61634000,
    revF: 72000000,
    revF1: 85000000,
    gp22: 9387000,
    gp23: 12811000,
    gp24: 17333000,
    gpF: 20500000,
    gpF1: 24500000,
    pat22: 2930000,
    pat23: 5089000,
    pat24: 7782000,
    patF: 9500000,
    patF1: 11500000,
    assets22: 30000000,
    assets23: 38000000,
    assets24: 49000000,
    assetsF: 65000000,
    assetsF1: 78000000,
    liab22: 12000000,
    liab23: 15000000,
    liab24: 18000000,
    liabF: 20000000,
    liabF1: 22000000,
    eps22: 0.51,
    eps23: 0.89,
    eps24: 1.37,
    epsF: 1.67,
    epsF1: 2.02,
    epsGrowthF: 22.1,
    epsGrowthF1: 21.0,
    pe: 20.49,
    ipoPe: 20.49,
    targetPe: 18.0,
    fairValue: 0.30,
    sifuTargetPrice: 0.30,
    calibratedSifuTargetPrice: 0.30,
    v7TargetPrice: 0.30,
    zone2TargetPrice: 0.32,
    financialProfileStatus: 'complete',
    financialEvidenceStatus: 'audited-prospectus',
    analystInsight: '<b>Permohonan Awam Dibuka (18–26 Nov 2026):</b> Penyedia penyelesaian automasi perindustrian dan kejuruteraan sistem pintar.<br>• <b>Pertumbuhan Pantas:</b> PAT FY24 melonjak kepada RM7.78 juta (+52.9% berbanding FY23 RM5.09 juta) atas hasil RM61.63 juta.<br>• <b>Valuation & Syariah:</b> Patuh Syariah sepenuhnya, PE bersejarah 20.5x pada harga IPO RM0.28. Unjuran sasaran Sifu RM0.30 disokong oleh permintaan automasi kilang dan Industry 4.0.'
};

// 7. Update MITI statuses for closed offers
const mitiAwaitingPatch = {
    stage: 6,
    status: 'Awaiting MITI Decision'
};

const updates = [
    { id: 'big-caring-group-bhd', patch: bcgPatch },
    { id: 'ioipg-malaysia-reit', patch: ioiPatch },
    { id: 'impact-capital-holdings-berhad', patch: impactPatch },
    { id: 'yes-group-management-berhad', patch: yesPatch },
    { id: 'emits-berhad', patch: emitsPatch },
    { id: 'sca-solutions-berhad', patch: scaPatch },
    { id: 'parkland-berhad', patch: mitiAwaitingPatch },
    { id: 'raiden-holdings-berhad', patch: mitiAwaitingPatch },
    { id: 'rosado-berhad', patch: mitiAwaitingPatch }
];

let applied = 0;
for (const u of updates) {
    const idx = data.findIndex(x => x.id === u.id);
    if (idx !== -1) {
        Object.assign(data[idx], u.patch);
        overrides[u.id] = overrides[u.id] || {};
        Object.assign(overrides[u.id], u.patch);
        applied++;
        console.log(`Updated ${u.id}`);
    } else {
        console.warn(`Record not found: ${u.id}`);
    }
}

fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(overridesJsonPath, JSON.stringify(overrides, null, 2), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
fs.writeFileSync(dataExportJsPath, jsContent, 'utf8');

console.log(`\nBerjaya mengemas kini ${applied} IPO ke data.json, data.js, dan overrides.json!`);
