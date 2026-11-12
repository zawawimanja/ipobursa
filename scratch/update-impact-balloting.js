const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const overridesPath = path.join(rootDir, 'overrides.json');
const dataJsonPath = path.join(rootDir, 'data.json');
const dataJsPath = path.join(rootDir, 'data.js');

const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

const impactOverride = overrides['impact-capital-holdings-berhad'] || {};

const ballotingUpdates = {
    stage: 4,
    status: 'Pre-Listing',
    closingDate: '06-Nov-2026',
    ballotingDate: '12-Nov-2026',
    allotmentDate: '19-Nov-2026',
    listingDate: '24-Nov-2026',
    price: 0.22,
    totalShares: 480000000,
    os: 139.69,
    isAutoOS: true,
    osSource: 'https://www.klsescreener.com/v2/announcements/view/11701137',
    osSourceDate: '12 Nov 2026',
    osMetric: 'overall-public-oversubscription',
    predictedGrade: 'A',
    grade: 'A',
    sifuGrade: 'A',
    epsF: 1.95,
    financialProfileStatus: 'complete',
    analystInsight: '<b>BALLOTING 12 NOV 2026: OS 139.69x — PERMINTAAN LUAR BIASA!</b><br>• Tranche awam 24.00 juta saham menerima 15,203 permohonan bagi 3.38 bilion saham bernilai RM742.84 juta (terlebih langgan 139.69x).<br>• Permintaan amat kuat didorong gandaan PE murah 11.29x, order book RM169.9 juta, dan tajaan Public Investment Bank.<br>• Notis peruntukan diposkan selewat-lewatnya 19 Nov 2026; penyenaraian Pasaran ACE pada 24 Nov 2026.<br>• <a href="https://www.klsescreener.com/v2/announcements/view/11701137" target="_blank" rel="noopener noreferrer">Pengumuman Balloting Bursa</a>'
};

const fullAnalysisPrefix = '<b>KEPUTUSAN LANGGANAN AWAM & BALLOTING (12 NOV 2026)</b><br>AscendServ Capital Markets Services Sdn Bhd mengumumkan bahawa tranche awam 24,000,000 saham telah terlebih langgan sebanyak 139.69 kali ganda. Sebanyak 15,203 permohonan bagi 3,376,530,600 saham telah diterima daripada orang awam Malaysia dengan nilai keseluruhan RM742,836,732.00.<br><br>Sambutan luar biasa ini disokong oleh harga tawaran yang menarik (RM0.22, P/E sejarah 11.29x atas PAT FY26 RM9.36 juta), baki buku pesanan kukuh RM169.9 juta, serta kedudukan strategik syarikat dalam pembangunan infrastruktur digital di Sarawak. Notis peruntukan akan dihantar kepada pemohon yang berjaya selewat-lewatnya pada 19 November 2026 menjelang penyenaraian di Pasaran ACE pada 24 November 2026.<br><br>';

Object.assign(impactOverride, ballotingUpdates);
overrides['impact-capital-holdings-berhad'] = impactOverride;

fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
console.log('✅ Updated overrides.json for impact-capital-holdings-berhad');

const idx = data.findIndex(d => d.id === 'impact-capital-holdings-berhad');
if (idx !== -1) {
    if (data[idx].fullAnalysis && !data[idx].fullAnalysis.includes('KEPUTUSAN LANGGANAN AWAM & BALLOTING (12 NOV 2026)')) {
        data[idx].fullAnalysis = fullAnalysisPrefix + data[idx].fullAnalysis;
    }
    Object.assign(data[idx], impactOverride);
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
    console.log('✅ Updated data.json for impact-capital-holdings-berhad');

    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(dataJsPath, jsContent, 'utf8');
    console.log('✅ Updated data.js');
}

// Bump version in html files
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
        content = content.replace(/data\.js\?v=\d+\.\d+/g, 'data.js?v=5.6');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Bumped ${f} to data.js?v=5.6`);
    }
});

// Run apply-overrides
console.log('\nRunning apply-overrides.js...');
execSync('node apply-overrides.js', { cwd: rootDir, stdio: 'inherit' });

// Run calc_sifu_targets
console.log('\nRunning calc_sifu_targets.js...');
execSync('node scratch/calc_sifu_targets.js', { cwd: rootDir, stdio: 'inherit' });

// Run generate-ipo-pages
console.log('\nRunning generate-ipo-pages.js...');
execSync('node generate-ipo-pages.js', { cwd: rootDir, stdio: 'inherit' });

console.log('\n🎉 Finished updating Impact Capital balloting status!');
