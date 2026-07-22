const fs = require('fs');
const path = require('path');

const overridesPath = path.join(__dirname, '../overrides.json');
let overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));

// Update overrides for RedPlanet Berhad & KEB Berhad (both OPEN)
overrides['redplanet-berhad'] = {
    ...overrides['redplanet-berhad'],
    sector: 'Technology (Geospatial / GIS)',
    shariah: true,
    predictedGrade: 'B',
    mitiOpenDate: '20-Jul-2026',
    mitiCloseDate: '29-Jul-2026',
    prospectusUrl: 'https://sahamonline.miti.gov.my/',
    sifuTargetPrice: 0.30,
    calibratedSifuTargetPrice: 0.33,
    v3TargetPrice: 0.33,
    zone2TargetPrice: 0.33,
    analystInsight: '✅ <b>WORTH IT (GRADE B — MITI ACTIVE OPEN)</b><br>Syarikat pemindahan penyenaraian dari Pasaran LEAP ke Pasaran ACE dalam sektor Teknologi Geospatial & GIS.<br><br>📊 <b>Status Permohonan MITI:</b><br>• Saham Khas Bumiputera (SKB) KINI DIBUKA untuk permohonan di portal SahamOnline MITI.<br>• Peruntukan 12.50% saham dilaraskan untuk pelabur Bumiputera.<br><br>⚠️ Status: Permohonan AKTIF DIBUKA di portal SahamOnline MITI.'
};

overrides['keb-berhad'] = {
    ...overrides['keb-berhad'],
    sector: 'Property',
    shariah: true,
    predictedGrade: 'C',
    mitiOpenDate: '13-Jul-2026',
    mitiCloseDate: '22-Jul-2026',
    prospectusUrl: 'https://sahamonline.miti.gov.my/',
    sifuTargetPrice: 0.28,
    calibratedSifuTargetPrice: 0.28,
    v3TargetPrice: 0.28,
    zone2TargetPrice: 0.28,
    analystInsight: '🚨 <b>AVOID / HIGH RISK (GRADE C — SEKTOR HARTANAH)</b><br>Syarikat pemaju hartanah perumahan. Berdasarkan analisis perbandingan precedent Bursa Malaysia, sektor Hartanah di Pasaran ACE mempunyai peratusan kemenangan (win rate) paling rendah dan kerap ditutup diskaun.<br><br>📊 <b>Perbandingan & Amaran Sifu:</b><br>• Sejarah IPO sektor Hartanah ACE kerap dibuka bawah harga IPO (-5% hingga -15%).<br>• Modal terikat dalam projek perumahan & nisbah aliran tunai berisiko tinggi.<br><br>⚠️ Status: Permohonan AKTIF DIBUKA di portal SahamOnline MITI (Tutup 22 Julai).'
};

// Set past closed dates for all other Stage 2 IPOs so they display as CLOSED
const closedStage2Ids = ['1doc', 'spb-development-berhad', 'butterfield-fb-berhad', 'evocom-berhad', 'slgc-berhad', 'gb-bond-holdings-berhad'];
closedStage2Ids.forEach(id => {
    overrides[id] = {
        ...(overrides[id] || {}),
        mitiOpenDate: '01-Jul-2026',
        mitiCloseDate: '10-Jul-2026'
    };
});

fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
console.log('Successfully updated overrides.json for Stage 2 IPOs!');
