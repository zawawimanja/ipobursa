const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const insights = {
    "5e-resources": "✅ <b>WORTH IT (GRADE B)</b><br>5E Resources mempunyai kedudukan pasaran yang kuat dalam pengurusan sisa berjadual (scheduled waste management) Johor dengan lesen DOE yang ketat. ROE tinggi >20% dengan baki tunai bersih RM49.3M memberi kelebihan fundamental kukuh.<br><br>📊 <b>Kelebihan Utama:</b><br>• Keuntungan margin tinggi >25% dengan ROE >20%.<br>• Posisi tunai bersih RM49.3M.<br>• Kriteria ESG & limpahan permintaan dari Pusat Data (Data Center) Johor.",
    "ams-material": "✅ <b>WORTH IT (GRADE B)</b><br>AMS Advanced Material menyediakan pemprosesan aluminium dan tembaga bagi sektor aeroangkasa dan sokongan semikonduktor. Menunjukkan lonjakan hasil ketara pada FPE 25.<br><br>📊 <b>Kelebihan Utama:</b><br>• Hasil FPE 25 melonjak ke RM64.9M vs RM43.2M FPE 24.<br>• Sokongan penaja jamin utama Maybank IB & M&A Securities.<br>• PE Terbitan menawarkan diskaun berbanding gergasi papan utama.",
    "empire-premium": "🚀 <b>PREMIUM SCALABLE BRAND (GRADE A)</b><br>Empire Premium Food mempamerkan prestasi pertumbuhan luar biasa dengan PAT CAGR 3 tahun cecah 61% menerusi model grab-and-go. Keputusan 3Q25 sangat mantap membuktikan keberkesanan fasa scale-up.<br><br>📊 <b>Kelebihan Utama:</b><br>• Margin kasar stabil sekitar 40% dengan CAGR PAT 61%.<br>• Model perniagaan grab-and-go berisiko rendah & kos cawangan rendah.<br>• Penyenaraian Main Market dengan sokongan Maybank IB.",
    "hocksoon": "⚠️ <b>AVOID / NOT FOR SCALPING (GRADE C)</b><br>Hock Soon Capital mencatatkan ketahanan kos yang luar biasa selepas penyingkiran subsidi ayam (poultry) dengan margin kekal pada 17.6%. Walau bagaimanapun, harga tawaran memberi potensi peningkatan (upside) yang amat rendah (3% hingga 5%) untuk scalp.<br><br>📊 <b>Kelebihan Utama:</b><br>• PE Terbitan sangat murah (6.2x - 6.9x) vs poultry peers.<br>• Margin kekal stabil pada 17.6% pasca pemotongan subsidi.",
    "inspace-creation": "✅ <b>WORTH IT (GRADE B)</b><br>Inspace Creation menerima sambutan balloting yang sangat padat mencecah 70.30x langganan awam. Pertumbuhan PAT CAGR sangat memberangsangkan sebanyak 300% dalam tempoh 3 tahun dipacu pertumbuhan pasaran hiasan dalaman.<br><br>📊 <b>Kelebihan Utama:</b><br>• Oversubscription runcit sangat kukuh pada 70.30x.<br>• PAT CAGR tumbuh 300% disokong pasaran domestik yang berkembang.<br>• PE Sasaran murah pada 11.4x berbanding purata peers 15.5x.",
    "manforce-group": "📊 <b>NEUTRAL SWING PLAY (GRADE B)</b><br>Manforce Group Berhad didagangkan menerusi perpindahan papan LEAP ke ACE. Menyasarkan peningkatan kuota penempatan pekerja asing daripada 6,761 kepada 11,230 pekerja menjelang FY27.<br><br>📊 <b>Kelebihan Utama:</b><br>• Perpindahan ke papan ACE meningkatkan kecairan pasaran runcit.<br>• Unjuran peningkatan saiz pekerja asing menyokong EPS growth +16%.",
    "mtt-shipping": "✅ <b>WORTH IT (GRADE B)</b><br>MTT Shipping and Logistics merupakan peneraju pasaran (market leader) kapal kargo domestik di semenanjung dan Sabah/Sarawak. Mempunyai baki lembaran yang mantap dengan gearing rendah 0.5x.<br><br>📊 <b>Kelebihan Utama:</b><br>• Peneraju pasaran domestic shipping dengan fleet moden.<br>• Polisi dividen tinggi (50% payout ratio) & gearing 0.5x.<br>• PE Terbitan munasabah di paras 9.18x - 10.04x.",
    "ogx": "⚠️ <b>RISK PLAY (GRADE C)</b><br>OGX Group menunjukkan pemulihan hasil yang baik pada FPE 25Q2 (RM94M vs RM66.9M), namun ketiadaan sentimen pasaran yang menyokong semasa listing menyebabkan harganya merosot di bawah IPO.<br><br>📊 <b>Kelebihan Utama:</b><br>• Keputusan suku tahunan 25Q2 melonjak menandakan fasa pertumbuhan semula.<br>• Sifu unjurkan PE 17.0x dengan Fair Value RM0.40 - RM0.49.",
    "sunmed": "🚀 <b>PREMIUM SCALABLE BRAND (GRADE A)</b><br>Sunway Healthcare (SUNMED) merekodkan permohonan runcit tertinggi dengan tarikan jenama Sunway yang sangat kuat. Merupakan hospital pertahanan bertaraf mega dengan profil pertumbuhan jangka panjang yang mantap.<br><br>📊 <b>Kelebihan Utama:</b><br>• Rekod jumlah permohonan runcit tertinggi (hype amat besar).<br>• Hospital defensif bertaraf mega dengan kualiti aset gred-A.<br>• Potensi sasaran Fair Value RM1.84 (+26.9% upside)."
};

Object.keys(insights).forEach(id => {
    const ipo = data.find(x => x.id === id);
    if (ipo) {
        ipo.analystInsight = insights[id];
        console.log(`Enriched analystInsight for hardcoded IPO: ${id}`);
    } else {
        console.warn(`Warning: ${id} NOT found in data.json!`);
    }
});

// Write to data.json
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
console.log('Saved data.json.');

// Write to data.js
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(jsPath, jsContent);
console.log('Saved data.js.');
