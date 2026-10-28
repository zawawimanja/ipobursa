const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const SRC_PROSPECTUS = 'https://www.klsescreener.com/v2/announcements/view/11691851';
const SRC_TIMETABLE = 'https://www.klsescreener.com/v2/announcements/view/11691849';
const SRC_EDGE = 'https://www.klsescreener.com/v2/news/view/1816425/sarawak-tech-firm-impact-capital-launches-ace-market-ipo-at-22-sen-per-share';
const SRC_BORNEO = 'https://www.theborneopost.com/2026/09/29/swaks-impact-capital-signs-deal-ahead-of-ace-market-ipo/';
const SRC_EDGE_DRAFT = 'https://theedgemalaysia.com/node/788784';
const SRC_STAR = 'https://www.thestar.com.my/business/business-news/2026/10/28/impact-capital-holdings-launches-ipo-prospectus';

const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

const TOTAL_SHARES = 480000000;
const PRICE = 0.22;
const PAT25 = 7000000;
const eps25 = (PAT25 / TOTAL_SHARES) * 100;
const ipoPe = Number((PRICE / (eps25 / 100)).toFixed(2));

const update = {
    sector: 'Technology (ICT Infrastructure Integration)',
    geography: 'Kuching, Sarawak',
    ib: 'Public Investment Bank',
    prospectusUrl: SRC_PROSPECTUS,
    closingTime: '5:00 p.m.',
    ballotingDate: '12-Nov-2026',
    allotmentDate: '19-Nov-2026',

    totalShares: TOTAL_SHARES,
    ipoNewShares: 96690000,
    ipoOfferForSaleShares: 28620900,
    ipoTotalOfferShares: 125310900,
    ipoCompanyGrossProceeds: 21271800,
    ipoSellerGrossProceeds: 6296598,
    ipoProceedsBasis: '96,690,000 saham baharu x RM0.22 = RM21.27 juta untuk syarikat (disahkan pernyataan prospektus); 28,620,900 saham OFS x RM0.22 = RM6.30 juta untuk penjual. Peruntukan RM4.67j + RM4.53j + RM2.1j + RM5.17j + RM4.80j = RM21.27 juta, tepat sama dengan kutipan syarikat.',
    ofs: true,
    ofsPercentage: 22.84,
    freeFloat: 26.11,

    headers: ['FY23', 'FY24 — belum disahkan', 'FY25', 'FY26 — unjuran belum tersedia', 'FY27 — unjuran belum tersedia'],
    historicalYears: [23, 24, 25],
    projectionHeaders: ['FY26 — unjuran belum tersedia', 'FY27 — unjuran belum tersedia'],

    rev23: 113180000,
    rev24: null,
    rev25: 145420000,
    gp23: null,
    gp24: null,
    gp25: null,
    pat23: null,
    pat24: null,
    pat25: PAT25,
    assets23: null,
    assets24: null,
    assets25: null,
    liab23: null,
    liab24: null,
    liab25: null,
    revF: null,
    revF1: null,
    gpF: null,
    gpF1: null,
    patF: null,
    patF1: null,
    assetsF: null,
    assetsF1: null,
    liabF: null,
    liabF1: null,
    eps25: eps25,
    pe: ipoPe,
    ipoPe: ipoPe,
    ipoPeBasis: `PAT FY25 kira-kira RM7 juta (angka media atas prospektus, bukan jadual prospektus yang disemak) atas ${(TOTAL_SHARES / 1e6).toFixed(0)} juta saham selepas IPO dan harga RM0.22.`,

    targetPe: null,
    fairValue: null,
    valuationScenarios: [],
    v3TargetPrice: null,

    priceStatus: 'registered-prospectus',
    priceSourceNote: 'RM0.22 disahkan melalui pengumuman prospektus Bursa 27 Okt 2026 (ruj. DCS-27102026-00019). Menggantikan anggaran draf RM0.25.',

    financialProfileStatus: 'incomplete',
    financialEvidenceStatus: 'secondary-corroborated',
    financialReviewDate: '28-Oct-2026',
    financialBasis: 'Struktur IPO, harga, 480 juta saham dan market cap RM105.6 juta disahkan tiga laporan bebas atas pernyataan prospektus (The Star 28 Okt, The Edge, Borneo Post) dan pengumuman Bursa. Hasil FY23 RM113.18 juta, FY25 RM145.42 juta dan PAT FY25 kira-kira RM7 juta masih angka media; FY24, gross profit, kunci kira-kira dan unjuran belum diperoleh. PDF prospektus di disclosure.bursamalaysia.com memulangkan 403 (Cloudflare) pada 27 Okt 2026, termasuk melalui pelayar sungguh.',
    financialReview: {
        title: 'IMPACT: struktur IPO, harga dan peruntukan dana disahkan; kualiti keuntungan belum disemak.',
        summary: `Hasil FY25 RM145.42 juta (FYE 30 Jun) dan PAT FY25 kira-kira RM7 juta memberi EPS ${eps25.toFixed(2)} sen dan PE IPO kira-kira ${ipoPe}x atas 480 juta saham / market cap RM105.6 juta — kedua-duanya disahkan pernyataan prospektus. Peruntukan dana berjumlah tepat RM21.27 juta tetapi hanya RM11.30 juta (53.1%) untuk pertumbuhan; RM9.97 juta (46.9%) pergi ke modal kerja dan kos penyenaraian. FY24, margin dan kunci kira-kira belum diperoleh; unjuran dan sasaran harga automatik ditangguhkan.`,
        profitLabel: 'PAT — anggaran media, bukan jadual prospektus',
        historicalPe: { year: 25, patami: PAT25 },
        scenarioLabel: 'Tiada senario gandaan — asas keuntungan belum disemak daripada prospektus.',
        sopNote: 'Sahkan jadual kewangan prospektus (FY23–FY25 hasil, gross profit, PAT, kunci kira-kira) dan permintaan awam sebelum guna sebarang sasaran. PAT RM7 juta ialah satu angka tanpa siri tiga tahun, jadi EPS dan PE 15.09x belum membuktikan pertumbuhan. Order book RM169.9 juta hingga FYE Jun 2030 ialah hasil masa depan, bukan keuntungan disahkan, dan kos penyenaraian RM4.80 juta ialah 22.6% kutipan syarikat.'
    },
    financialSourcesHTML: [
        link(SRC_PROSPECTUS, 'Pengumuman prospektus IPO Bursa (27 Okt 2026)'),
        link(SRC_TIMETABLE, 'Jadual IPO Bursa'),
        link(SRC_STAR, 'The Star: pelancaran prospektus dan peruntukan dana (28 Okt 2026)'),
        link(SRC_EDGE, 'The Edge: pelancaran IPO pada 22 sen'),
        link(SRC_BORNEO, 'Borneo Post: hasil FY25 RM145.42 juta, PAT kira-kira RM7 juta'),
        link(SRC_EDGE_DRAFT, 'The Edge: draf prospektus Jan 2026')
    ],

    catalysts: [
        `<strong>Harga rasmi:</strong> RM0.22; market cap RM105.6 juta atas 480 juta saham dilancarkan — disahkan terus oleh pernyataan prospektus, bukan terbitan kiraan. ${link(SRC_STAR, 'The Star')}, ${link(SRC_PROSPECTUS, 'Pengumuman Bursa')}.`,
        `<strong>Struktur IPO:</strong> 96.69 juta saham baharu (24 juta awam, 16 juta orang layak, 56.69 juta placement) dan 28.62 juta OFS placement. OFS ialah 22.84% daripada saham IPO; kutipan kasar syarikat RM21.27 juta, penjual RM6.30 juta.`,
        `<strong>Order book:</strong> kerja belum siap RM169.9 juta pada akhir September 2026, menjana hasil sehingga FYE Jun 2030. ${link(SRC_EDGE, 'The Edge')}.`,
        `<strong>Guna dana:</strong> RM4.67 juta pengembangan pejabat (Klang Valley termasuk pusat inovasi dan penyelesaian digital, pemindahan Bintulu dan Kota Kinabalu, pejabat baharu Johor Bahru); RM4.53 juta tenaga kerja dan pembangunan bisnes; RM2.1 juta peningkatan keupayaan teknologi; RM5.17 juta modal kerja; RM4.80 juta anggaran kos penyenaraian. Jumlah tepat RM21.27 juta — <strong>hanya 53.1% untuk pertumbuhan</strong>. ${link(SRC_STAR, 'The Star')}.`,
        `<strong>Pegangan pengasas:</strong> Winston Chai Fung Chun, Kok Teck Kuan dan Chyr Ye Hong dijangka kekal menguasai kira-kira 65% selepas penyenaraian. ${link(SRC_EDGE_DRAFT, 'The Edge')}.`,
        `<strong>Belum disahkan:</strong> FY24, gross profit, kunci kira-kira dan unjuran tiada; PE IPO ${ipoPe}x bergantung pada PAT anggaran RM7 juta.`
    ],
    peers: 'Bandingkan dengan integrator ICT dan kontraktor rangkaian/pusat data menggunakan margin kerja projek, cash conversion dan order book bertarikh. Order book RM169.9 juta tersebar hingga FY2030, jadi jangan anggap ia hasil setahun. Tiada gandaan peer atau sasaran debut yang disahkan.',
    fundUse: 'RM4.67j pengembangan pejabat (Klang Valley, pemindahan Bintulu dan Kota Kinabalu, pejabat baharu Johor Bahru); RM4.53j tenaga kerja dan pembangunan bisnes; RM2.1j peningkatan keupayaan teknologi; RM5.17j modal kerja; RM4.80j anggaran kos penyenaraian. Jumlah RM21.27j. Market cap selepas penyenaraian RM105.6j atas 480 juta saham pada RM0.22.'
};

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const ipo = data.find(x => x.id === 'impact-capital-holdings-berhad');
if (!ipo) throw new Error('IMPACT record not found');

Object.assign(ipo, update);

// overrides.json carries the sector the KLSE sync stored, and apply-overrides would
// otherwise restore the stale draft sector on every run.
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));
if (overrides[ipo.id]) {
    overrides[ipo.id].sector = update.sector;
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');
}

const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
fs.writeFileSync(DATA_JS, js, 'utf8');
fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');

console.log('IMPACT updated:', Object.keys(ipo).length, 'fields | eps25', eps25.toFixed(4), 'sen | ipoPe', ipoPe);
