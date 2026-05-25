const fs = require('fs');
const path = require('path');
const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const updates = [
  {
    id: 'sum-technology',
    ib: 'Malacca Securities',
    predictedGrade: 'B',
    analystInsight: '✅ <b>WORTH IT — TAPI JANGAN HARAP BESAR (GRADE B)</b><br>Sektor Tech Hardware adalah sektor terbaik 2026 (SEMICO +50%, SkyeChip +151%). Tiada OFS, Shariah-compliant, harga RM0.28 berpatutan.<br><br>⚠️ <b>Caveat penting:</b> IB adalah <b>Malacca Securities</b> — mid-tier IB dengan rekod 2026: avg +5.8%, 3/5 win rate. Berbanding M&A atau Maybank yang biasa deliver pop besar, Malacca lebih conservative. Jangkaan realistik: <b>+5% hingga +20% listing day</b>, bukan +50%.<br><br>Strategi: Apply untuk scalp ringan. Jangan lebih-lebih harap.'
  },
  {
    id: 'stratus-global',
    ib: 'UOB Kay Hian',
    predictedGrade: 'B',
    analystInsight: '✅ <b>WORTH IT — VALUE PLAY SEBENAR (GRADE B)</b><br>Stratus Global adalah <b>factory automation + cleanroom AMHS provider untuk industri semiconductor</b> — sektor paling hot 2026.<br><br>📊 <b>Kenapa menarik:</b><br>• PE hanya ~14x vs peers Tech (29.8x) dan Semiconductor (38.2x) = <b>diskaun 50-60%</b><br>• Tiada OFS — pure public issue 356.25M shares<br>• Main Market (RM937M mktcap) = institutional backing kuat<br>• Shariah-compliant ✅<br><br>⚠️ <b>Satu-satunya risiko:</b> IB UOB Kay Hian — rekod kita hanya GDGROUP (Consumer sector, -11%) tapi tu sektor berbeza. Untuk Main Market semiconductor play, story fundamental lebih dominant dari IB retail reputation.<br><br><b>Kesimpulan: Apply. Target RM0.95+. Ini lebih kepada hold play bukan pure scalp.</b>'
  },
  {
    id: 'bus-cap',
    predictedGrade: 'C',
    analystInsight: '⚠️ <b>AVOID / RENDAH KEYAKINAN (GRADE C)</b><br>Industrial fabrication (bus body) — sektor tiada momentum tema besar. IB TA Securities rekod moderate. Harga RM0.23 murah tapi sektor membosankan.<br><br>Risiko: Mirip Inspace pattern — OS mungkin tinggi tapi sektor tak sexy = listing day flat atau negatif. <b>Skip kecuali OS cecah 150x+.</b>'
  },
  {
    id: 'aerodyne',
    predictedGrade: 'A',
    analystInsight: '🌟 <b>MUST APPLY (GRADE A)</b><br>Global drone tech leader listing di Main Market dengan Maybank IB — kombinasi terbaik berdasarkan formula 2026.<br><br>✅ IB Maybank (rekod terbaik 2026)<br>✅ Sektor Tech + Defence/Drone = tema AI & autonomy<br>✅ Main Market = institutional heavy<br>✅ Shariah<br><br>Aerodyne adalah drone unicorn Malaysia dengan operasi global (30+ negara). Ini bukan ACE Market biasa — ini caliber SkyeChip. <b>Apply maximum allocation.</b>'
  },
  {
    id: 'carsome',
    predictedGrade: 'A',
    analystInsight: '✅ <b>MUST APPLY (GRADE A — MITI)</b><br>Regional used-car unicorn listing di Main Market dengan CIMB. Brand awareness tinggi, operasi Malaysia + Singapura + Indonesia + Thailand.<br><br>✅ IB CIMB (tier 1 untuk Main Market)<br>✅ Harga RM1.20 = Main Market premium<br>✅ Regional exposure = institutional magnet<br>✅ Consumer brand yang dikenali ramai<br><br>⚠️ MITI phase — pastikan apply melalui saham.miti.gov.my. Jangan tertinggal allocation window.'
  }
];

updates.forEach(u => {
  const ipo = data.find(d => d.id === u.id);
  if (!ipo) { console.log('[NOT FOUND] ' + u.id); return; }
  if (u.ib) ipo.ib = u.ib;
  if (u.predictedGrade) ipo.predictedGrade = u.predictedGrade;
  if (u.analystInsight) ipo.analystInsight = u.analystInsight;
  console.log('[UPDATED] ' + ipo.companyName + ' -> Grade ' + (u.predictedGrade || ipo.predictedGrade));
});

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(DATA_JS, jsContent);
console.log('\nDone.');
