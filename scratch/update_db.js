const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 1. Remove golden-destinations
const initialLength = data.length;
data = data.filter(x => x.id !== 'golden-destinations');
console.log(`Removed duplicate: golden-destinations (reduced entries from ${initialLength} to ${data.length})`);

// 2. Update gdgroup
const gd = data.find(x => x.id === 'gdgroup');
if (gd) {
    gd.companyName = "Golden Destinations Group Berhad";
    gd.pe = 15.85;
    gd.closingDate = "2026-04-06T17:00:00";
    gd.prospectusUrl = "https://bursamalaysia.com/";
    gd.analystInsight = "⚠️ <b>AVOID / RISK OF WEAK LISTING (GRADE C)</b><br>Golden Destinations Berhad didagangkan di bawah harga tawaran selepas debut (-11.11%). Sektor pelancongan (Consumer - Tourism) kurang mendapat minat runcit dengan langganan (OS) yang rendah sebanyak 7.04x. Sokongan daripada UOB Kay Hian juga tidak mencukupi untuk menaikkan harga.";
    console.log('gdgroup updated with full name, PE, dates and analyst insight.');
} else {
    console.warn('gdgroup NOT found in data.json!');
}

// 3. Add analyst insights for others
const insights = {
    isf: "✅ <b>WORTH IT — STABLE SWING PLAY (GRADE B)</b><br>ISF Group Berhad menunjukkan prestasi cemerlang dengan kenaikan +45.45% pada hari penyenaraian (tutup RM0.48). Sektor perpaipan industri (Piping) disokong oleh permintaan infrastruktur yang kukuh. Nisbah PE sederhana (14.2x) menjadikannya pilihan menarik untuk pelaburan jangka sederhana (Swing).",
    ogm: "⚠️ <b>RISK PLAY (GRADE C)</b><br>OGM (One Gasmaster) merosot -12% pada hari pertama penyenaraian (tutup RM0.22). Sektor pemantauan alam sekitar (Environmental Monitoring) mempunyai profil pertumbuhan yang perlahan, dan walaupun disokong oleh Malacca Securities, langganan runcit 20x tidak cukup kuat untuk mengatasi tekanan jualan.",
    sbs: "⚠️ <b>AVOID / LOW INTEREST (GRADE C)</b><br>SBS (SBS Nexus Berhad) mencatatkan permulaan hambar dengan penurunan -2.00% (tutup RM0.245). Profil syarikat sektor Consumer ini mempunyai margin keuntungan yang nipis dan dana kegunaan kebanyakannya untuk pemasaran (marketing), yang dilihat kurang memberi nilai tambah fundamental berbanding pelaburan CAPEX.",
    teamstr: "📊 <b>NEUTRAL SWING PLAY (GRADE B)</b><br>Teamstar Berhad didagangkan sedikit di bawah harga IPO (-5.77%) walaupun mendapat langganan runcit sebanyak 35.2x. Sektor pembuatan aluminium mempunyai potensi industri tetapi margin terkesan oleh kenaikan kos bahan mentah global. Menarik untuk dipantau jika harga stabil di bawah PE 10.5x."
};

Object.keys(insights).forEach(id => {
    const ipo = data.find(x => x.id === id);
    if (ipo) {
        ipo.analystInsight = insights[id];
        console.log(`Added analyst insight for: ${id}`);
    } else {
        console.warn(`Target IPO ${id} NOT found!`);
    }
});

// Write to data.json (maintain 4 spaces formatting)
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
console.log('Saved to data.json.');

// Write to data.js (replicate syntax)
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(jsPath, jsContent);
console.log('Saved to data.js.');
