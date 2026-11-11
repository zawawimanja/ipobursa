const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const overridesPath = path.join(rootDir, 'overrides.json');
const dataJsonPath = path.join(rootDir, 'data.json');
const dataJsPath = path.join(rootDir, 'data.js');

const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

const skaOverride = overrides['ska-capital-berhad'] || {};

// Listing updates for SKA Capital
const listingUpdates = {
    stage: 5,
    status: 'Listed',
    listingDate: '11-Nov-2026',
    price: 0.43,
    openPrice: 0.51,
    currentPrice: 0.50,
    closePrice: 0.50,
    highPrice: 0.575,
    lowPrice: 0.49,
    performance: '+16.28%',
    predictedGrade: 'A',
    grade: 'A',
    sifuGrade: 'A',
    analystInsight: '<b>SKA LISTED RM0.51 (+18.60%) — DEBUT KUKUH, OS 80.42x</b><br>• Disenaraikan di Pasaran ACE pada 11 Nov 2026; dibuka pada RM0.51 (+18.60% / +8 sen premium) dengan paras tertinggi RM0.575 dan ditutup pada RM0.50 (+16.28%).<br>• Permintaan runcit luar biasa (OS 80.42x) dan volum dagangan hari pertama mencecah 189.7 juta unit.<br>• Sasaran Sifu RM0.54 (Zon 2 RM0.54–RM0.58, PE sasaran 14.0x) berbanding harga tawaran RM0.43 didokong buku pesanan RM313.4 juta dalam kejuruteraan pencawang kuasa & grid TNB.<br>• <a href="https://www.klsescreener.com/v2/announcements/view/11694461" target="_blank" rel="noopener noreferrer">Keputusan Langganan Bursa</a> · <a href="https://klse.i3investor.com/web/stock/overview/0480" target="_blank" rel="noopener noreferrer">Carta i3investor</a>',
    fullAnalysis: '<b>ANALISIS PENYENARAIAN SKA CAPITAL — 11 NOV 2026</b><br><br><strong>Debut Pasaran ACE:</strong> SKA Capital Berhad (SKACAP: 0480) memulakan dagangan pada 11 Nov 2026 dengan harga pembukaan RM0.51, iaitu premium +18.60% (+8 sen) berbanding harga IPO RM0.43. Dagangan hari pertama aktif dengan volum 189.73 juta saham, mencecah paras tertinggi RM0.575 sebelum ditutup pada RM0.50 (+16.28%).<br><br><strong>Permintaan Luar Biasa:</strong> Tranche awam terlebih langgan sebanyak 80.42 kali ganda (RM312.3 juta nilai permohonan awam diterima). Tranche MITI (111.94 juta saham) dan institusi juga diambil sepenuhnya.<br><br><strong>Struktur & Dana:</strong> Market cap pada harga penutup RM0.50 bernilai RM447.75 juta (berbanding RM385.07 juta pada harga IPO RM0.43). Menjana RM72.27 juta dana baharu untuk modal kerja projek pencawang dan utiliti bawah tanah.<br><br><strong>Kewangan & Asas:</strong> PATAMI FY25 RM28.94 juta (EPS 3.23 sen). Unjuran FY26 dijangka mencecah PATAMI RM34.5 juta (EPS 3.85 sen) disokong buku pesanan RM313.4 juta serta 6 kontrak TNB bernilai RM89.3 juta yang dimenangi menjelang penyenaraian.<br><br><strong>Sasaran & Penilaian:</strong> Nilai wajar Sifu ditetapkan pada RM0.54 (PE sasaran 14.0x FY26F), manakala penyelidikan institusi (PublicInvest) meletakkan nilai wajar RM0.70.',
    financialProfileStatus: 'complete'
};

// Update financialReview
if (skaOverride.financialReview) {
    skaOverride.financialReview.title = 'SKA: Penyata kewangan prospektus disahkan; disenaraikan 11 Nov 2026 dengan debut kukuh RM0.51 (+18.60%).';
    skaOverride.financialReview.summary = 'Hasil FY25 RM241.36 juta dan PATAMI RM28.94 juta (EPS 3.23 sen) memberi PE sejarah 13.31x pada harga IPO RM0.43. Unjuran FY26 menjana PATAMI RM34.5 juta (EPS 3.85 sen) didokong order book kukuh RM313.4 juta dalam kejuruteraan pencawang kuasa dan pemodenan grid TNB. Saham disenaraikan pada 11 Nov 2026 dengan pembukaan kukuh RM0.51 (+18.60%) dan langganan awam 80.42x.';
}

Object.assign(skaOverride, listingUpdates);
overrides['ska-capital-berhad'] = skaOverride;

fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
console.log('✅ Updated overrides.json for ska-capital-berhad');

// Update data.json
const idx = data.findIndex(d => d.id === 'ska-capital-berhad');
if (idx !== -1) {
    Object.assign(data[idx], skaOverride);
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
    console.log('✅ Updated data.json for ska-capital-berhad');

    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(dataJsPath, jsContent, 'utf8');
    console.log('✅ Updated data.js');
}

// Run apply-overrides
console.log('\nRunning apply-overrides.js...');
execSync('node apply-overrides.js', { cwd: rootDir, stdio: 'inherit' });

// Run calc_sifu_targets
console.log('\nRunning calc_sifu_targets.js...');
execSync('node scratch/calc_sifu_targets.js', { cwd: rootDir, stdio: 'inherit' });

// Run generate-ipo-pages
console.log('\nRunning generate-ipo-pages.js...');
execSync('node generate-ipo-pages.js', { cwd: rootDir, stdio: 'inherit' });

console.log('\n🎉 Finished updating SKA Capital to listed status!');

