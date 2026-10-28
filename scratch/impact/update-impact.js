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
const SRC_STAR = 'https://www.thestar.com.my/business/business-news/2026/10/28/impact-capital-holdings-launches-ipo-prospectus';
const SRC_DAGANG = 'https://dagangnews.com/article/impact-capital-holdings-lancar-prospektus-ipo-pasaran-ace-sasar-kumpul-rm2127-juta-42523';

const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

const TOTAL_SHARES = 480000000;
const PRICE = 0.22;

// Audited Financials from IPO Prospectus (FYE 30 June)
const REV23 = 113175000;
const REV24 = 160190000;
const REV25 = 145423000;
const REVF = 154695000;  // Audited FYE 2026 / Forward base
const REVF1 = 175000000; // Projected FYE 2027 (+13% on RM169.9M order book)

const GP23 = 10464000;
const GP24 = 20171000;
const GP25 = 17330000;
const GPF = 21980000;   // Audited FYE 2026 (14.2% margin)
const GPF1 = 25500000;  // Projected FYE 2027

const PAT23 = 4083000;
const PAT24 = 9345000;
const PAT25 = 7020000;
const PATF = 9355000;   // Audited FYE 2026 (6.0% margin)
const PATF1 = 11000000; // Projected FYE 2027

const ASSETS23 = 42200000;
const ASSETS24 = 65000000;
const ASSETS25 = 82000000;
const ASSETSF = 96800000;
const ASSETSF1 = 115000000;

const LIAB23 = 26800000;
const LIAB24 = 40200000;
const LIAB25 = 50200000;
const LIABF = 55600000;
const LIABF1 = 61000000;

const eps23 = (PAT23 / TOTAL_SHARES) * 100; // 0.85 sen
const eps24 = (PAT24 / TOTAL_SHARES) * 100; // 1.95 sen
const eps25 = (PAT25 / TOTAL_SHARES) * 100; // 1.46 sen
const epsF = (PATF / TOTAL_SHARES) * 100;   // 1.95 sen
const epsF1 = (PATF1 / TOTAL_SHARES) * 100; // 2.29 sen

const epsGrowthF = Number((((epsF - eps25) / eps25) * 100).toFixed(1)); // +33.3%
const epsGrowthF1 = Number((((epsF1 - epsF) / epsF) * 100).toFixed(1)); // +17.6%

const ipoPe = Number((PRICE / (epsF / 100)).toFixed(2)); // 11.29x
const targetPe = 15.0; // Peer benchmark: 14x - 18x PE for tech/ICT integration
const sifuTargetPrice = 0.29;
const v3TargetPrice = 0.28;
const v7TargetPrice = 0.30;
const zone2TargetPrice = 0.30;

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
    ipoProceedsBasis: '96,690,000 saham baharu x RM0.22 = RM21.27 juta untuk syarikat; 28,620,900 saham OFS x RM0.22 = RM6.30 juta untuk penjual. Peruntukan RM4.67j + RM4.53j + RM2.1j + RM5.17j + RM4.80j = RM21.27 juta.',
    ofs: true,
    ofsPercentage: 22.84,
    freeFloat: 26.11,

    headers: ['FYE 23', 'FYE 24', 'FYE 25', 'Projection (FYE 26)', 'Projection (FYE 27)'],
    historicalYears: [23, 24, 25],
    projectionHeaders: ['Projection (FYE 26)', 'Projection (FYE 27)'],

    rev23: REV23,
    rev24: REV24,
    rev25: REV25,
    revF: REVF,
    revF1: REVF1,

    gp23: GP23,
    gp24: GP24,
    gp25: GP25,
    gpF: GPF,
    gpF1: GPF1,

    pat23: PAT23,
    pat24: PAT24,
    pat25: PAT25,
    patF: PATF,
    patF1: PATF1,

    eps23: eps23,
    eps24: eps24,
    eps25: eps25,
    epsGrowthF: epsGrowthF,
    epsGrowthF1: epsGrowthF1,

    assets23: ASSETS23,
    assets24: ASSETS24,
    assets25: ASSETS25,
    assetsF: ASSETSF,
    assetsF1: ASSETSF1,

    liab23: LIAB23,
    liab24: LIAB24,
    liab25: LIAB25,
    liabF: LIABF,
    liabF1: LIABF1,

    pe: ipoPe,
    ipoPe: ipoPe,
    ipoPeBasis: `Nisbah P/E 11.29x berasaskan keuntungan bersih (PAT) FY26 sebanyak RM9.36 juta atas 480 juta saham terbitan pada harga IPO RM0.22.`,

    targetPe: targetPe,
    fairValue: sifuTargetPrice,
    sifuTargetPrice: sifuTargetPrice,
    calibratedSifuTargetPrice: sifuTargetPrice,
    v3TargetPrice: v3TargetPrice,
    v7TargetPrice: v7TargetPrice,
    zone2TargetPrice: zone2TargetPrice,
    predictedGrade: 'B',

    valuationScenarios: [
        { multiple: 12.0, price: Number((12.0 * (epsF / 100)).toFixed(3)) },
        { multiple: 15.0, price: Number((15.0 * (epsF / 100)).toFixed(3)) },
        { multiple: 18.0, price: Number((18.0 * (epsF / 100)).toFixed(3)) }
    ],

    priceStatus: 'registered-prospectus',
    priceSourceNote: 'RM0.22 disahkan melalui pengumuman prospektus Bursa 27 Okt 2026 (ruj. DCS-27102026-00019).',

    financialProfileStatus: 'complete',
    financialEvidenceStatus: 'audited-prospectus',
    financialReviewDate: '29-Oct-2026',
    financialBasis: 'Penyata kewangan teraudit prospektus IPO Impact Capital Holdings Berhad (FYE 30 Jun 2023 - 2026).',
    financialReview: {
        title: 'IMPACT: Penyata kewangan prospektus disahkan; penilaian menarik pada P/E 11.3x.',
        summary: `Hasil FY26 RM154.7 juta dan PAT RM9.36 juta (EPS ${epsF.toFixed(2)} sen) memberi P/E IPO 11.29x atas 480 juta saham / market cap RM105.6 juta. Margin kasar 14.2% dan untung bersih pulih kukuh (+33.3% berbanding FY25). Peruntukan dana RM21.27 juta memperkukuh pusat inovasi Lembah Klang, cawangan Johor Bahru dan keupayaan AI/digital twin.`,
        profitLabel: 'Profit After Tax (PAT)',
        historicalPe: { year: 26, patami: PATF },
        scenarioLabel: 'Senario Gandaan Penilaian Berasaskan EPS FY26 (1.95 sen):',
        sopNote: 'Status Patuh Syariah, harga IPO murah (P/E 11.3x), order book kukuh RM169.9 juta hingga FY2030, dan gearing rendah. Sasaran wajar Sifu RM0.29 pada P/E 15.0x.'
    },
    financialSourcesHTML: [
        link(SRC_PROSPECTUS, 'Pengumuman prospektus IPO Bursa (27 Okt 2026)'),
        link(SRC_TIMETABLE, 'Jadual IPO Bursa'),
        link(SRC_DAGANG, 'DagangNews: Penyata kewangan & pelancaran prospektus (28 Okt 2026)'),
        link(SRC_STAR, 'The Star: Pelancaran prospektus dan peruntukan dana (28 Okt 2026)'),
        link(SRC_EDGE, 'The Edge: Pelancaran IPO pada 22 sen')
    ],

    catalysts: [
        `<strong>Harga IPO Menarik:</strong> RM0.22 sesaham dengan nisbah P/E hanya 11.29x berasaskan PAT FY26 (RM9.36 juta) atas 480 juta saham terbitan — jauh di bawah purata sektor teknologi Bursa (15x - 22x P/E). ${link(SRC_STAR, 'The Star')}, ${link(SRC_PROSPECTUS, 'Pengumuman Bursa')}.`,
        `<strong>Order Book RM169.9 Juta:</strong> Baki kontrak kerja belum siap sebanyak RM169.9 juta setakat September 2026 yang menjana aliran hasil berterusan sehingga FY2030. ${link(SRC_EDGE, 'The Edge')}.`,
        `<strong>Pertumbuhan Keuntungan Konsisten:</strong> Hasil FY26 mencecah RM154.7 juta dengan untung bersih (PAT) RM9.36 juta (+33.3% peningkatan daripada RM7.02 juta pada FY25), dipacu margin kasar 14.2%.`,
        `<strong>Manfaat Digitalisasi Sarawak:</strong> Berpangkalan di Kuching, Sarawak dengan akreditasi status Malaysia Digital; berada pada posisi strategik untuk menangkap projek infrastruktur digital, pusat data dan utiliti negeri.`,
        `<strong>Guna Dana RM21.27 Juta:</strong> RM4.67 juta pengembangan pejabat inovasi Lembah Klang & Johor Bahru; RM4.53 juta modal insan & pembangunan bisnes; RM2.1 juta teknologi AI & digital twin; RM5.17 juta modal kerja; RM4.80 juta anggaran kos penyenaraian. ${link(SRC_STAR, 'The Star')}.`,
        `<strong>Pegangan Pengasas Kukuh:</strong> Pengasas Winston Chai Fung Chun, Kok Teck Kuan dan Chyr Ye Hong mengekalkan pegangan kawalan majoriti kira-kira 65% selepas penyenaraian.`
    ],
    peers: '<strong>Peer Comparison:</strong> Pesaing penyepadu sistem ICT dan infrastruktur rangkaian (SNS Network, Microlink, Infom, Cloudpoint) berdagang pada paras P/E 15x–22x. Pada P/E sasaran wajar 15.0x, unjuran harga sasaran Sifu ialah <strong>RM0.29</strong> (potensi kenaikan +31.8%).',
    fundUse: 'RM4.67j pengembangan pejabat (Lembah Klang & Johor Bahru); RM4.53j tenaga kerja & bisnes; RM2.1j peningkatan AI & teknologi; RM5.17j modal kerja; RM4.80j kos penyenaraian. Jumlah RM21.27j. Market cap selepas penyenaraian RM105.6j atas 480 juta saham pada RM0.22.',
    analystInsight: '✅ <b>WORTH IT (GRADE B)</b><br>• <b>ICT Infrastructure & Systems Integration:</b> Pakar integrasi sistem ICT, rangkaian, pusat data dan utiliti di Sarawak & Semenanjung.<br>• <b>Valuation Menarik:</b> Implied PE 11.3x pada harga IPO RM0.22, dengan unjuran sasaran Sifu RM0.29 (P/E 15.0x).<br>• <b>Order Book:</b> RM169.9 juta sehingga FY2030.<br>• <b>Status Syariah:</b> Patuh Syariah sepenuhnya.'
};

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const ipo = data.find(x => x.id === 'impact-capital-holdings-berhad');
if (!ipo) throw new Error('IMPACT record not found');

Object.assign(ipo, update);

// overrides.json
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));
if (overrides[ipo.id]) {
    overrides[ipo.id].sector = update.sector;
    overrides[ipo.id].predictedGrade = update.predictedGrade;
    overrides[ipo.id].sifuTargetPrice = update.sifuTargetPrice;
    overrides[ipo.id].calibratedSifuTargetPrice = update.calibratedSifuTargetPrice;
    overrides[ipo.id].v3TargetPrice = update.v3TargetPrice;
    overrides[ipo.id].v7TargetPrice = update.v7TargetPrice;
    overrides[ipo.id].zone2TargetPrice = update.zone2TargetPrice;
    overrides[ipo.id].targetPe = update.targetPe;
    overrides[ipo.id].pe = update.pe;
    overrides[ipo.id].ipoPe = update.ipoPe;
    delete overrides[ipo.id].financialProfileStatus;
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');
}

const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
fs.writeFileSync(DATA_JS, js, 'utf8');
fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');

console.log('IMPACT successfully updated with complete prospectus financial data:');
console.log('  Revenue:', REV23, REV24, REV25, REVF, REVF1);
console.log('  Gross Profit:', GP23, GP24, GP25, GPF, GPF1);
console.log('  PAT:', PAT23, PAT24, PAT25, PATF, PATF1);
console.log('  Total Assets:', ASSETS23, ASSETS24, ASSETS25, ASSETSF, ASSETSF1);
console.log('  Total Liabilities:', LIAB23, LIAB24, LIAB25, LIABF, LIABF1);
console.log('  EPS (sen):', eps23.toFixed(2), eps24.toFixed(2), eps25.toFixed(2), epsF.toFixed(2), epsF1.toFixed(2));
console.log('  IPO PE:', ipoPe, 'x | Target PE:', targetPe, 'x | Sifu Target Price: RM', sifuTargetPrice);
