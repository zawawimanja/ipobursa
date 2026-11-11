const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const overridesPath = path.join(rootDir, 'overrides.json');
const dataJsonPath = path.join(rootDir, 'data.json');
const dataJsPath = path.join(rootDir, 'data.js');

const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

const bcgOverride = overrides['big-caring-group-bhd'] || {};

const ballotingUpdates = {
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
};

if (bcgOverride.fullAnalysis && !bcgOverride.fullAnalysis.includes('KEPUTUSAN BALLOTING')) {
    bcgOverride.fullAnalysis = '<b>KEPUTUSAN LANGGANAN AWAM & BALLOTING (10 NOV 2026)</b><br>Malaysian Issuing House (MIH) mengumumkan tranche awam terlebih langgan sebanyak 4.31 kali ganda. Sebanyak 29,474 permohonan bagi 783,748,400 saham diterima (nilai permohonan RM846.45 juta) berbanding 147,638,000 saham terbitan yang diperuntukkan untuk orang awam Malaysia.<br><br>Kadar langganan 4.31x menunjukkan sambutan runcit yang sederhana berikutan saiz terbitan yang besar (RM2.03 bilion jumlah dana terkumpul) dan penilaian premium PE sejarah 41.6x. Walau bagaimanapun, tranche institusi mendapat sokongan teguh dengan 19 pelabur institusi terkemuka (cornerstone) menyerap 665.5 juta unit (9.0% modal). Notis peruntukan akan dihantar pada 18 Nov 2026, dan penyenaraian di Pasaran Utama dijadualkan pada 19 Nov 2026.<br><br>' + bcgOverride.fullAnalysis;
}

Object.assign(bcgOverride, ballotingUpdates);
overrides['big-caring-group-bhd'] = bcgOverride;

fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
console.log('✅ Updated overrides.json for big-caring-group-bhd');

const idx = data.findIndex(d => d.id === 'big-caring-group-bhd');
if (idx !== -1) {
    Object.assign(data[idx], bcgOverride);
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
    console.log('✅ Updated data.json for big-caring-group-bhd');

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

console.log('\n🎉 Finished updating Big Caring Group balloting status!');

