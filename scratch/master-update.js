const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const overridesPath = path.join(rootDir, 'overrides.json');
const dataJsonPath = path.join(rootDir, 'data.json');
const dataJsPath = path.join(rootDir, 'data.js');

// 1. Edit sync-balloting.js
const syncBallotingPath = path.join(rootDir, 'sync-balloting.js');
let ballotingCode = fs.readFileSync(syncBallotingPath, 'utf8');
ballotingCode = ballotingCode.replace(
    'normalizeCompany(company[1]).length >= 4',
    'normalizeCompany(company[1]).length >= 3'
);
if (!ballotingCode.includes('const approx =')) {
    ballotingCode = ballotingCode.replace(
        "const number = '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)';",
        "const number = '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)';\n    const approx = '(?:approximately\\s+|about\\s+)?';"
    ).replace(
        "const overallOs = new RegExp('overall\\s+oversubscription\\s+rate\\s+of\\s+' + number + '\\s*times', 'gi');",
        "const overallOs = new RegExp('overall\\s+oversubscription\\s+rate\\s+of\\s+' + approx + number + '\\s*times', 'gi');"
    ).replace(
        "const publicOs = new RegExp('oversubscription\\s+rate\\s+of\\s+' + number + '\\s*times', 'gi');",
        "const publicOs = new RegExp('oversubscription\\s+rate\\s+of\\s+' + approx + number + '\\s*times', 'gi');"
    ).replace(
        "const overallSubscription = new RegExp('overall\\s+subscription\\s+rate\\s+of\\s+' + number + '\\s*times', 'gi');",
        "const overallSubscription = new RegExp('overall\\s+subscription\\s+rate\\s+of\\s+' + approx + number + '\\s*times', 'gi');"
    );
}
fs.writeFileSync(syncBallotingPath, ballotingCode, 'utf8');
console.log('✅ Updated sync-balloting.js (short names & approximate regex)');

// 2. Load overrides and data
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

// 3. SKA CAPITAL BERHAD
overrides['ska-capital-berhad'] = overrides['ska-capital-berhad'] || {};
Object.assign(overrides['ska-capital-berhad'], {
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
    financialProfileStatus: 'complete',
    analystInsight: '<b>SKA LISTED RM0.51 (+18.60%) — DEBUT KUKUH, OS 80.42x</b><br>• Disenaraikan di Pasaran ACE pada 11 Nov 2026; dibuka pada RM0.51 (+18.60% / +8 sen premium) dengan paras tertinggi RM0.575 dan ditutup pada RM0.50 (+16.28%).<br>• Permintaan runcit luar biasa (OS 80.42x) dan volum dagangan hari pertama mencecah 189.7 juta unit.<br>• Sasaran Sifu RM0.54 (Zon 2 RM0.54–RM0.58, PE sasaran 14.0x) berbanding harga tawaran RM0.43 didokong buku pesanan RM313.4 juta dalam kejuruteraan pencawang kuasa & grid TNB.<br>• <a href="https://www.klsescreener.com/v2/announcements/view/11694461" target="_blank" rel="noopener noreferrer">Keputusan Langganan Bursa</a> · <a href="https://klse.i3investor.com/web/stock/overview/0480" target="_blank" rel="noopener noreferrer">Carta i3investor</a>',
    fullAnalysis: '<b>ANALISIS PENYENARAIAN SKA CAPITAL — 11 NOV 2026</b><br><br><strong>Debut Pasaran ACE:</strong> SKA Capital Berhad (SKACAP: 0480) memulakan dagangan pada 11 Nov 2026 dengan harga pembukaan RM0.51, iaitu premium +18.60% (+8 sen) berbanding harga IPO RM0.43. Dagangan hari pertama aktif dengan volum 189.73 juta saham, mencecah paras tertinggi RM0.575 sebelum ditutup pada RM0.50 (+16.28%).<br><br><strong>Permintaan Luar Biasa:</strong> Tranche awam terlebih langgan sebanyak 80.42 kali ganda (RM312.3 juta nilai permohonan awam diterima). Tranche MITI (111.94 juta saham) dan institusi juga diambil sepenuhnya.<br><br><strong>Struktur & Dana:</strong> Market cap pada harga penutup RM0.50 bernilai RM447.75 juta (berbanding RM385.07 juta pada harga IPO RM0.43). Menjana RM72.27 juta dana baharu untuk modal kerja projek pencawang dan utiliti bawah tanah.<br><br><strong>Kewangan & Asas:</strong> PATAMI FY25 RM28.94 juta (EPS 3.23 sen). Unjuran FY26 dijangka mencecah PATAMI RM34.5 juta (EPS 3.85 sen) disokong buku pesanan RM313.4 juta serta 6 kontrak TNB bernilai RM89.3 juta yang dimenangi menjelang penyenaraian.<br><br><strong>Sasaran & Penilaian:</strong> Nilai wajar Sifu ditetapkan pada RM0.54 (PE sasaran 14.0x FY26F), manakala penyelidikan institusi (PublicInvest) meletakkan nilai wajar RM0.70.'
});
if (overrides['ska-capital-berhad'].financialReview) {
    overrides['ska-capital-berhad'].financialReview.title = 'SKA: Penyata kewangan prospektus disahkan; disenaraikan 11 Nov 2026 dengan debut kukuh RM0.51 (+18.60%).';
    overrides['ska-capital-berhad'].financialReview.summary = 'Hasil FY25 RM241.36 juta dan PATAMI RM28.94 juta (EPS 3.23 sen) memberi PE sejarah 13.31x pada harga IPO RM0.43. Unjuran FY26 menjana PATAMI RM34.5 juta (EPS 3.85 sen) didokong order book kukuh RM313.4 juta dalam kejuruteraan pencawang kuasa dan pemodenan grid TNB. Saham disenaraikan pada 11 Nov 2026 dengan pembukaan kukuh RM0.51 (+18.60%) dan langganan awam 80.42x.';
}

// 4. BIG CARING GROUP BHD
overrides['big-caring-group-bhd'] = overrides['big-caring-group-bhd'] || {};
Object.assign(overrides['big-caring-group-bhd'], {
    stage: 4,
    status: 'Pre-Listing',
    closingDate: '05-Nov-2026',
    ballotingDate: '10-Nov-2026',
    allotmentDate: '18-Nov-2026',
    listingDate: '19-Nov-2026',
    price: 1.08,
    totalShares: 7381835680,
    os: 4.31,
    isAutoOS: true,
    osSource: 'https://www.klsescreener.com/v2/announcements/view/11700075',
    osSourceDate: '10 Nov 2026',
    osMetric: 'overall-public-oversubscription',
    predictedGrade: 'C',
    grade: 'C',
    sifuGrade: 'C',
    financialProfileStatus: 'complete',
    analystInsight: '<b>BALLOTING 10 NOV 2026: OS 4.31x — PE 41.6x, LANGGANAN SEDERHANA</b><br>• Tranche awam terlebih langgan 4.31x (29,474 permohonan untuk 783.75 juta unit, nilai RM846.4M berbanding 147.64 juta unit ditawarkan).<br>• Permintaan runcit sederhana mencerminkan saiz tawaran mega (RM2.03 bilion, permodalan pasaran RM8.0 bilion) dan penilaian premium PE 41.6x atas PATAMI FY26 RM191.6 juta.<br>• 19 pelabur institusi cornerstone (termasuk IFC Bank Dunia, JPMorgan, abrdn, Principal) menyerap 665.5 juta saham (9.0% modal diperbesarkan).<br>• Notis peruntukan dihantar pada 18 Nov 2026; penyenaraian Pasaran Utama dijadualkan pada 19 Nov 2026.<br>• <a href="https://www.klsescreener.com/v2/announcements/view/11700075" target="_blank" rel="noopener noreferrer">Keputusan Langganan MIH</a> · <a href="https://theedgemalaysia.com/node/823732" target="_blank" rel="noopener noreferrer">Liputan Prospektus The Edge</a>'
});

// 5. KEB BERHAD
overrides['keb-berhad'] = overrides['keb-berhad'] || {};
Object.assign(overrides['keb-berhad'], {
    stage: 4,
    status: 'Pre-Listing',
    closingDate: '02-Nov-2026',
    ballotingDate: '04-Nov-2026',
    allotmentDate: '12-Nov-2026',
    listingDate: '16-Nov-2026',
    price: 0.35,
    os: 0.01,
    isAutoOS: true,
    osSource: 'https://www.klsescreener.com/v2/announcements/view/11697819',
    osSourceDate: '04 Nov 2026',
    osMetric: 'overall-public-oversubscription',
    predictedGrade: 'C',
    grade: 'C',
    sifuGrade: 'C',
    financialProfileStatus: 'complete',
    analystInsight: '<b>BALLOTING 04 NOV 2026: OS 0.01x (1.01x LANGGANAN PENUH)</b><br>• Tranche awam 44.12 juta unit dilanggan sepenuhnya dengan 2,126 permohonan untuk 44.47 juta unit bernilai RM15.57 juta (terlebih langgan 0.01x).<br>• Permintaan runcit sederhana dalam sektor hartanah; disokong penjimatan kos faedah dan bank tanah sedia ada.<br>• Notis peruntukan diposkan 12 Nov 2026; penyenaraian Pasaran ACE dijadualkan pada 16 Nov 2026.<br>• <a href="https://www.klsescreener.com/v2/announcements/view/11697819" target="_blank" rel="noopener noreferrer">Pengumuman Balloting Bursa</a>'
});

// 6. MYDCD BERHAD
overrides['mydcd-berhad'] = overrides['mydcd-berhad'] || {};
Object.assign(overrides['mydcd-berhad'], {
    stage: 4,
    status: 'Pre-Listing',
    closingDate: '02-Nov-2026',
    ballotingDate: '04-Nov-2026',
    allotmentDate: '12-Nov-2026',
    listingDate: '17-Nov-2026',
    price: 0.56,
    os: 36.46,
    isAutoOS: true,
    osSource: 'https://www.klsescreener.com/v2/announcements/view/11697639',
    osSourceDate: '04 Nov 2026',
    osMetric: 'overall-public-oversubscription',
    predictedGrade: 'B',
    grade: 'B',
    sifuGrade: 'B',
    financialProfileStatus: 'complete',
    analystInsight: '<b>BALLOTING 04 NOV 2026: OS 36.46x — SAMBUTAN HANGAT TEMA PUSAT DATA</b><br>• Tranche awam terlebih langgan 36.46x dengan 28,816 permohonan bagi 3.36 bilion saham berbanding 89.70 juta unit ditawarkan.<br>• Permintaan runcit kukuh disokong tema integrasi MEPF pusat data dan rakan kongsi utama penyedia awan.<br>• Notis peruntukan dihantar pada 12 Nov 2026; penyenaraian Pasaran ACE dijadualkan pada 17 Nov 2026.<br>• <a href="https://www.klsescreener.com/v2/announcements/view/11697639" target="_blank" rel="noopener noreferrer">Keputusan Langganan MIH</a>'
});

// 7. IMPACT CAPITAL HOLDINGS BERHAD
overrides['impact-capital-holdings-berhad'] = overrides['impact-capital-holdings-berhad'] || {};
Object.assign(overrides['impact-capital-holdings-berhad'], {
    stage: 4,
    status: 'Pre-Listing',
    closingDate: '06-Nov-2026',
    ballotingDate: '12-Nov-2026',
    allotmentDate: '20-Nov-2026',
    listingDate: '24-Nov-2026',
    price: 0.22,
    epsF: 1.95,
    financialProfileStatus: 'complete',
    analystInsight: '<b>PERMOHONAN AWAM DITUTUP 06 NOV 2026 — MENUNGGU KEPUTUSAN UNDIAN HARI INI (12 NOV)</b><br>• Tawaran awam RM0.22 ditutup 06 Nov 2026; proses undian dijadualkan berlangsung hari ini, 12 Nov 2026.<br>• Model perniagaan integrasi infrastruktur ICT & telekomunikasi, menjana PATAMI FY25 RM7.02 juta.<br>• Nilai wajar Sifu RM0.29 (potensi +31.8% dari harga IPO RM0.22). Penyenaraian Pasaran ACE pada 24 Nov 2026.'
});

// 8. MITI EXPIRED OFFERS -> STAGE 6
['raiden-holdings-berhad', 'rosado-berhad', 'wil-key-berhad'].forEach(id => {
    overrides[id] = overrides[id] || {};
    overrides[id].stage = 6;
    overrides[id].status = 'Awaiting MITI Decision';
});

fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
console.log('✅ Saved overrides.json');

// Apply to data.json
Object.keys(overrides).forEach(id => {
    const idx = data.findIndex(d => d.id === id);
    if (idx !== -1) {
        Object.assign(data[idx], overrides[id]);
    }
});
fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
console.log('✅ Saved data.json');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
console.log('✅ Saved data.js');

// 9. Bump data.js?v= in 7 html pages
const htmlFiles = [
    'alerts.html',
    'index.html',
    'ipo-decision.html',
    'miti-journal.html',
    'morning-brief.html',
    'sifu-picks.html',
    'sifu-sheets.html'
];
htmlFiles.forEach(f => {
    const filePath = path.join(rootDir, f);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/data\.js\?v=\d+\.\d+/g, 'data.js?v=5.5');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Bumped ${f} to data.js?v=5.5`);
    }
});

// 10. Run apply-overrides, calc_sifu_targets, generate-ipo-pages
console.log('\nRunning apply-overrides.js...');
execSync('node apply-overrides.js', { cwd: rootDir, stdio: 'inherit' });

console.log('\nRunning calc_sifu_targets.js...');
execSync('node scratch/calc_sifu_targets.js', { cwd: rootDir, stdio: 'inherit' });

console.log('\nRunning generate-ipo-pages.js...');
execSync('node generate-ipo-pages.js', { cwd: rootDir, stdio: 'inherit' });

console.log('\nMaster update completed successfully!');
