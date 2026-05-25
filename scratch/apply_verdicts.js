const fs = require('fs');
const path = require('path');
const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const updates = [
  {
    id: 'elsa',
    ib: 'TBA',
    ofs: true,
    predictedGrade: 'C',
    analystInsight: '❌ <b>SKIP</b><br>Sektor O&G services sedang sejuk. Ada OFS yang menambah tekanan jual. Risiko tinggi untuk open below atau flat.'
  },
  {
    id: 'sum-technology',
    ib: 'Malacca Securities',
    ofs: false,
    predictedGrade: 'B',
    analystInsight: '⚠️ <b>Boleh apply, jangan harap besar</b><br>Sektor Tech Hardware adalah sektor terbaik. Tiada OFS, Shariah-compliant. Tapi IB adalah Malacca Securities (mid-tier).'
  },
  {
    id: 'mm-computer',
    ib: 'TBA',
    ofs: true,
    predictedGrade: 'C',
    analystInsight: '❌ <b>SKIP</b><br>OFS besar (47M!) dan IT Services sektor biasa. Profil hampir sama dengan OGX. Jangan apply.'
  },
  {
    id: 'pentech',
    ib: 'TBA',
    ofs: false,
    predictedGrade: 'C',
    analystInsight: '⚠️ <b>Low conviction, skip je</b><br>ICT Infra adalah sektor boring. Tiada momentum tema besar. IB TBA.'
  },
  {
    id: 'eckem',
    ib: 'M&A Securities',
    ofs: false,
    predictedGrade: 'D',
    analystInsight: '🚫 <b>Ko skip — bukan Shariah</b><br>Industrial Chemical. Walaupun IB bagus, tidak patuh Syariah.'
  }
];

updates.forEach(u => {
  const ipo = data.find(d => d.id === u.id);
  if (ipo) {
    if (u.ib !== undefined) ipo.ib = u.ib;
    if (u.ofs !== undefined) ipo.ofs = u.ofs;
    if (u.predictedGrade !== undefined) ipo.predictedGrade = u.predictedGrade;
    if (u.analystInsight !== undefined) ipo.analystInsight = u.analystInsight;
    console.log('[UPDATED] ' + ipo.companyName);
  }
});

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(DATA_JS, jsContent);
console.log('Update complete.');
