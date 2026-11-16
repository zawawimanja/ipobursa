const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const overridesJsonPath = path.join(__dirname, '..', 'overrides.json');
const dataJsPath = path.join(__dirname, '..', 'data.js');
const dataExportJsPath = path.join(__dirname, '..', 'data_export.js');

let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
let overrides = JSON.parse(fs.readFileSync(overridesJsonPath, 'utf8'));

const kebPatch = {
    stage: 5,
    status: 'Listed',
    listingDate: '16-Nov-2026',
    code: '0481',
    symbol: 'KEB',
    price: 0.35,
    openPrice: 0.35,
    currentPrice: 0.295,
    highPrice: 0.35,
    lowPrice: 0.29,
    performance: '-15.71%',
    debutChange: '0.00%',
    dailyChange: '-15.71%',
    os: 0.01,
    isAutoOS: true,
    osSource: 'https://www.klsescreener.com/v2/announcements/view/11697775',
    osSourceDate: '04 Nov 2026',
    osMetric: 'overall-public-oversubscription',
    predictedGrade: 'C',
    analystInsight: '<b>Debut Listing 16 Nov 2026:</b> Dibuka flat pada RM0.35 (0.00%), sebelum susut ke paras RM0.295 (-15.71%) di tengah-tengah sentimen berhati-hati sektor hartanah ACE Market.<br>• <b>Keputusan Balloting:</b> Langganan awam 1.01× (kadar lebihan 0.01× / +0.80%). Tranche Bumiputera terlebih langgan 1.24× (27.31 juta saham dimohon vs 22.06 juta ditawarkan), manakala tranche Bukan-Bumi kurang langganan (17.16 juta saham) dan dipindahkan dari lebihan Bumi.<br>• <b>Asas Fundamental:</b> PAT FY25 melonjak RM51.61 juta (EPS 5.85 sen, PE sejarah 5.98x). Sasaran wajar Sifu kekal RM0.44 pada gandaan PE 7.0x.'
};

const kebIdx = data.findIndex(x => x.id === 'keb-berhad');
if (kebIdx === -1) {
    console.error('keb-berhad not found in data.json');
    process.exit(1);
}

Object.assign(data[kebIdx], kebPatch);

overrides['keb-berhad'] = overrides['keb-berhad'] || {};
Object.assign(overrides['keb-berhad'], kebPatch);

fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(overridesJsonPath, JSON.stringify(overrides, null, 2), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
fs.writeFileSync(dataExportJsPath, jsContent, 'utf8');

console.log('Successfully updated KEB Berhad listing data to Stage 5 (Listed)!');
