const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const overridesPath = path.join(rootDir, 'overrides.json');
const dataJsonPath = path.join(rootDir, 'data.json');
const dataJsPath = path.join(rootDir, 'data.js');

const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

// 1. KEB BERHAD (ACE Market, Listing 16 Nov 2026)
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

// 2. MYDCD BERHAD (ACE Market, Listing 17 Nov 2026)
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

// 3. IMPACT CAPITAL HOLDINGS BERHAD (ACE Market, Listing 24 Nov 2026)
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

// 4. MITI IPOs yang telah tamat tempoh permohonan -> Stage 6 (Awaiting MITI Decision)
// RAIDEN HOLDINGS BERHAD (Tutup 11 Nov 2026)
overrides['raiden-holdings-berhad'] = overrides['raiden-holdings-berhad'] || {};
Object.assign(overrides['raiden-holdings-berhad'], {
    stage: 6,
    status: 'Awaiting MITI Decision'
});

// ROSADO BERHAD (Tutup 09 Nov 2026)
overrides['rosado-berhad'] = overrides['rosado-berhad'] || {};
Object.assign(overrides['rosado-berhad'], {
    stage: 6,
    status: 'Awaiting MITI Decision'
});

// Wil-Key Berhad (Tutup 02 Nov 2026)
overrides['wil-key-berhad'] = overrides['wil-key-berhad'] || {};
Object.assign(overrides['wil-key-berhad'], {
    stage: 6,
    status: 'Awaiting MITI Decision'
});

fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
console.log('✅ Updated overrides.json for KEB, MyDCD, IMPACT, Raiden, Rosado, Wil-Key');

// Update data.json entries
['keb-berhad', 'mydcd-berhad', 'impact-capital-holdings-berhad', 'raiden-holdings-berhad', 'rosado-berhad', 'wil-key-berhad'].forEach(id => {
    const idx = data.findIndex(d => d.id === id);
    if (idx !== -1) {
        Object.assign(data[idx], overrides[id]);
    }
});

fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
console.log('✅ Updated data.json');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
console.log('✅ Updated data.js');

// Run apply-overrides
console.log('\nRunning apply-overrides.js...');
execSync('node apply-overrides.js', { cwd: rootDir, stdio: 'inherit' });

// Run calc_sifu_targets
console.log('\nRunning calc_sifu_targets.js...');
execSync('node scratch/calc_sifu_targets.js', { cwd: rootDir, stdio: 'inherit' });

// Run generate-ipo-pages
console.log('\nRunning generate-ipo-pages.js...');
execSync('node generate-ipo-pages.js', { cwd: rootDir, stdio: 'inherit' });

console.log('\n🎉 Finished comprehensive active IPO update!');

