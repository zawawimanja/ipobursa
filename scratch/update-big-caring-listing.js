const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const overridesJsonPath = path.join(__dirname, '..', 'overrides.json');
const dataJsPath = path.join(__dirname, '..', 'data.js');
const dataExportJsPath = path.join(__dirname, '..', 'data_export.js');

let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let overrides = JSON.parse(fs.readFileSync(overridesJsonPath, 'utf8'));

const bcgPatch = {
    stage: 5,
    status: 'Listed',
    listingDate: '19-Nov-2026',
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
    analystInsight: '<b>Debut Listing 19 Nov 2026 (Main Market):</b> Dibuka pada RM1.05 (-2.78% / diskaun 3 sen) berbanding harga tawaran IPO RM1.08. Saham menyentuh paras terendah RM0.98 sebelum melonjak ke paras tertinggi RM1.19 (+10.2%) dan ditutup stabil pada paras tawaran <b>RM1.08 (0.00% / flat)</b> dengan dagangan rancak.<br>• <b>Skala Mega & Sokongan Cornerstone:</b> Penyenaraian terbesar 2026 dengan permodalan pasaran RM8.0 bilion didokong 19 pelabur institusi terkemuka (JPMorgan, IFC Bank Dunia, abrdn dll) yang menyerap 665.5 juta unit (9.0% modal diperbesarkan).<br>• <b>Keputusan Langganan & Fundamental:</b> Langganan awam 4.31×. PATAMI FY26 disahkan RM191.6 juta (+56.7%) dan penjimatan kos faedah pinjaman bank ~RM26.3 juta setahun daripada RM570.7 juta hasil IPO yang digunakan untuk melunaskan pinjaman.'
};

const bcgIdx = data.findIndex(x => x.id === 'big-caring-group-bhd');
if (bcgIdx === -1) {
    console.error('big-caring-group-bhd not found in data.json');
    process.exit(1);
}

Object.assign(data[bcgIdx], bcgPatch);

overrides['big-caring-group-bhd'] = overrides['big-caring-group-bhd'] || {};
Object.assign(overrides['big-caring-group-bhd'], bcgPatch);

fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(overridesJsonPath, JSON.stringify(overrides, null, 2), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
fs.writeFileSync(dataExportJsPath, jsContent, 'utf8');

console.log('Successfully updated Big Caring Group Bhd listing data to Stage 5 (Listed)!');
