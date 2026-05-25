const fs = require('fs');
const path = require('path');
const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const updates = [
  {
    id: 'elsa',
    analystInsight: '❌ <b>AVOID</b><br>Sektor O&G services sedang sejuk. Ada OFS yang menambah tekanan jual. Risiko tinggi untuk open below atau flat. Skip.'
  },
  {
    id: 'sum-technology',
    analystInsight: '⚠️ <b>WORTH IT</b><br>💡 Note: Boleh apply, tapi jangan harap pop besar.<br>Sektor Tech Hardware adalah sektor terbaik 2026. Tiada OFS, Shariah-compliant. Tapi IB adalah Malacca Securities (mid-tier).'
  },
  {
    id: 'mm-computer',
    analystInsight: '❌ <b>AVOID</b><br>OFS besar (47M!) dan IT Services sektor biasa. Profil hampir sama dengan OGX. Jangan apply.'
  },
  {
    id: 'pentech',
    analystInsight: '⚠️ <b>AVOID</b><br>💡 Note: Low conviction, skip je.<br>ICT Infra adalah sektor boring. Tiada momentum tema besar. IB TBA.'
  },
  {
    id: 'eckem',
    analystInsight: '🚫 <b>AVOID</b><br>💡 Note: Ko skip — bukan Shariah.<br>Industrial Chemical. Walaupun IB bagus (M&A), tidak patuh Syariah.'
  }
];

updates.forEach(u => {
  const ipo = data.find(d => d.id === u.id);
  if (ipo) {
    ipo.analystInsight = u.analystInsight;
    console.log('[UPDATED] ' + ipo.companyName);
  }
});

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(DATA_JS, jsContent);
console.log('Update complete.');
