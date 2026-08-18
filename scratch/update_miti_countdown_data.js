// Update MITI countdown data for active MITI allocations (from SahamOnline portal, 18-Aug-2026 — live numbers 18-Aug evening)
const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

// 1. Big Caring Group — portal: 922.73M tawaran, 653 pemohon, tutup 6 hari lagi (18-Aug -> 23-Aug)
const big = data.find(x => x.id === 'big-caring-group-bhd');
if (big) {
    big.mitiCloseDate = '23-Aug-2026';
    big.mitiOfferShares = 922730000;
    big.mitiApplicants = 653;
    console.log('Updated Big Caring:', big.mitiOpenDate, '->', big.mitiCloseDate, '| offers', big.mitiOfferShares, '| apps', big.mitiApplicants);
} else console.log('Big Caring NOT FOUND');

// 2. IOIPG Malaysia REIT — portal: 687.5M tawaran, 86 pemohon, tutup 9 hari lagi (18-Aug -> 26-Aug)
const io = data.find(x => x.id === 'ioipg-malaysia-reit');
if (io) {
    io.mitiCloseDate = '26-Aug-2026';
    io.mitiOfferShares = 687500000;
    io.mitiApplicants = 86;
    console.log('Updated IOIPG:', io.mitiOpenDate, '->', io.mitiCloseDate, '| offers', io.mitiOfferShares, '| apps', io.mitiApplicants);
} else console.log('IOIPG NOT FOUND');

// 3. MyDCD — MITI tranche is NOW OPEN: portal 224.25M tawaran, 115 pemohon, tutup 10 hari lagi (18-Aug -> 27-Aug)
const my = data.find(x => x.id === 'mydcd-berhad');
if (my) {
    my.stage = 2;
    my.status = 'MITI Allocation Phase';
    my.mitiOpenDate = '18-Aug-2026';
    my.mitiCloseDate = '27-Aug-2026';
    my.mitiOfferShares = 224250000;
    my.mitiApplicants = 115;
    my.analystInsight = "✅ <b>TEMA PUSAT DATA — HARGA MAHAL (GRADE B — MITI)</b><br>MyDCD ialah integrator MEPF untuk pusat data melalui DCD Technology Sdn Bhd (est. 2010). 95.6% hasil FYE2025 daripada integrasi MEPF pusat data.<br><br>📊 <b>Fundamental (prospektus):</b><br>• Hasil FYE2025 RM372.0 juta (+105.6% YoY), PAT RM39.5 juta (margin 10.6%); GP margin hanya 16.4%.<br>• EPS FYE2025 atas modal diperbesar 1,794 juta saham = 2.20 sen → P/E ±25.5x pada RM0.56 — premium untuk margin nipis.<br>• Order book RM213.33 juta (30 Nov 2025): 92% diiktiraf FYE2026; +8 kontrak DC baharu RM206.40 juta (18 Dis 2025).<br>• Konsentrasi melampau: Binastra 61.7% (RM229.5 juta), top-5 = 94.2% hasil.<br>• Dividen pra-IPO RM55 juta + hingga RM33 juta = payout sehingga 223% sebelum listing!<br>• IPO: 335 juta saham baharu (18.7% modal diperbesar) + OFS 145 juta (30.2%; RM81.2 juta ke penjual).<br><br>📅 Peruntukan MITI (224.25 juta saham) SEDANG DIBUKA — 115 pemohon setakat 18 Ogos 2026, ditutup 27 Ogos 2026. Harga masih indikatif RM0.56.<br><br>⚠️ <b>Kesimpulan:</b> Tema pusat data paling panas di Bursa 2026 — debut pop berkemungkinan besar. Tetapi RM0.56 melebihi nilai wajar anggaran RM0.40-0.45 (PE 20x): sesuai scalp play (jual hari pertama), bukan hold jangka panjang pada harga ini.";
    console.log('Updated MyDCD -> stage', my.stage, my.status, '| MITI', my.mitiOpenDate, '->', my.mitiCloseDate, '| offers', my.mitiOfferShares, '| apps', my.mitiApplicants);
} else console.log('MyDCD NOT FOUND');

fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');

const jsWrapper = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'data.js'), jsWrapper, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'data_export.js'), jsWrapper, 'utf8');
console.log('Wrote data.json, data.js, data_export.js');
