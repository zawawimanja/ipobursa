/**
 * Update upcoming IPO grades based on new formula:
 * Apply if: Strong IB (Maybank/M&A/Alliance Islamic/Public/CIMB joint) + No OFS + Tech/Industrial sector
 * Skip if: Weak IB, OFS present, Consumer/Property/Services sector
 * Eckem: Not Shariah = user skip
 */
const fs = require('fs');
const path = require('path');
const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const updates = [
  {
    id: 'elsa',
    predictedGrade: 'C',
    analystInsight: '⚠️ <b>AVOID / HIGH RISK (GRADE C)</b><br>Sektor O&G services sedang sejuk — retail masih trauma dengan OGX dan OGM. Ada OFS (36.4M shares) yang menambah tekanan jual. IB belum disahkan. Walaupun ada elemen robotik dan digital, market 2026 tidak hargai O&G-adjacent dengan baik. Risiko tinggi untuk open below atau flat. <b>Skip kecuali IB Maybank/M&A dan OS cecah 80x+.</b>'
  },
  {
    id: 'sum-technology',
    predictedGrade: 'B',
    analystInsight: '✅ <b>WORTH IT (GRADE B)</b><br>Sektor Tech (Hardware) adalah sektor terbaik 2026 — SEMICO (+50%) dan SkyeChip (+151%) dah buktikan. Tiada OFS, Shariah-compliant. Tapi IB masih TBA — ini risiko utama. <b>Formula baru: apply kalau IB keluar Maybank/M&A/Alliance Islamic. Skip kalau IB Mercury/UOB/CIMB sole.</b> Harga RM0.28 berpatutan untuk entry.'
  },
  {
    id: 'mm-computer',
    predictedGrade: 'C',
    analystInsight: '❌ <b>AVOID (GRADE C — DOUBLE RED FLAG)</b><br>Dua sebab utama untuk skip:<br>1️⃣ <b>OFS besar (47.34M shares)</b> — historical data tunjuk OFS = avg -1.4% vs Non-OFS +21.2%<br>2️⃣ <b>IT Services sektor biasa</b> — bukan tech momentum, bukan industrial expansion<br>Walaupun Shariah-compliant, profil ini hampir sama dengan OGX (110x OS, ada OFS, result flat). <b>Jangan apply.</b>'
  },
  {
    id: 'pentech',
    predictedGrade: 'C',
    analystInsight: '⚠️ <b>NEUTRAL / LOW PRIORITY (GRADE C)</b><br>ICT infrastructure adalah sektor "boring" — tiada momentum tema besar seperti AI, semiconductor, atau data center. Tiada OFS, Shariah OK, harga murah RM0.20. Tapi IB TBA dan sektor ini jarang deliver listing day pop yang besar. Based on 2026 data, Industrial/ICT tanpa strong IB = avg +3-5% je. <b>Boleh apply tapi jangan harap besar. Low conviction.</b>'
  },
  {
    id: 'eckem',
    predictedGrade: 'D',
    analystInsight: '🚫 <b>TIDAK SESUAI — BUKAN SHARIAH</b><br>Eckem Holdings tidak patuh Syariah. Walaupun IB M&A Securities (rekod bagus) dan ada ekspansi kilang yang menarik, <b>skip terus bagi pelabur Shariah.</b> Untuk pelabur konvensional: Grade B kerana M&A IB + industrial expansion focus.'
  }
];

updates.forEach(u => {
  const ipo = data.find(d => d.id === u.id);
  if (!ipo) { console.log('[NOT FOUND] ' + u.id); return; }
  ipo.predictedGrade = u.predictedGrade;
  ipo.analystInsight = u.analystInsight;
  console.log('[UPDATED] ' + ipo.companyName + ' -> Grade ' + u.predictedGrade);
});

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(DATA_JS, jsContent);
console.log('\nDone.');
