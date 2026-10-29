/**
 * update-bcg-rosado.js
 *
 * Kemas kini berdasarkan peristiwa 29-Okt-2026:
 *   1. Big Caring Group Bhd (BCG) — prospektus berdaftar diterbitkan 29-Okt-2026
 *      (harga runcit RM1.08, PATAMI FY26 RM191.6 juta, tariff ballot 10-Nov, allotment 18-Nov).
 *   2. Rosado Berhad — IPO baharu Pasaran ACE, tawaran MITI 29-Okt hingga 09-Nov-2026.
 *
 * Kemas kini ditulis ke data.json DAN overrides.json supaya nilai kekal selepas
 * apply-overrides.js dijalankan.
 *
 * Jalankan: node scratch/update-bcg-rosado.js
 * Kemudian: node apply-overrides.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

// ── Sumber ────────────────────────────────────────────────────────────────────
const SRC_BCG_EDGE = 'https://theedgemalaysia.com/node/823732';
const SRC_BCG_STAR = 'https://www.thestar.com.my/business/business-news/2026/10/29/big-caring-plans-to-raise-rm6378mil-from-main-market-ipo';
const SRC_BCG_MINICHART = 'https://www.minichart.com.sg/2026/10/29/big-caring-launches-rm8-0-billion-main-market-ipo-at-rm1-08-retail-price/';
const SRC_BCG_BURSA = 'https://www.bursamalaysia.com/market_information/announcements/company_announcement/announcement_details?ann_id=3719881';
const SRC_BCG_REUTERS = 'https://www.reuters.com/legal/transactional/big-caring-launches-ipo-valuing-malaysian-pharmacy-chain-2-billion-2026-10-29/';

const SRC_ROSADO_BURSA = 'https://www.bursamalaysia.com/regulation/prospectus_exposure/rosado-berhad-rosado';
const SRC_ROSADO_DAGANG = 'https://www.dagangnews.com/index.php/article/terkini/syarikat-kejuruteraan-pusat-data-rosado-bhd-rancang-penyenaraian-di-pasaran-ace-70159';

// ══════════════════════════════════════════════════════════════════════════════
// 1) BIG CARING GROUP BHD — prospektus berdaftar 29-Okt-2026
// ══════════════════════════════════════════════════════════════════════════════
const BCG_TOTAL_SHARES = 7381835680;
const BCG_PRICE = 1.08;
const BCG_PATAMI_FY26 = 191600000; // audit prospektus FYE 30 Jun 2026
const BCG_REV_FY26 = 4024000000;
const BCG_PATAMI_FY25 = 122300000;
const BCG_REV_FY25 = 3410000000;
const BCG_GROUP_PAT_FY26 = 231800000;

const bcgEps26 = (BCG_PATAMI_FY26 / BCG_TOTAL_SHARES) * 100; // 2.60 sen
const bcgEps25 = (BCG_PATAMI_FY25 / BCG_TOTAL_SHARES) * 100; // 1.66 sen
const bcgPe26 = Number((BCG_PRICE / (bcgEps26 / 100)).toFixed(2)); // 41.61x

const bcgUpdate = {
    stage: 3,
    status: 'Application Open',
    market: 'Main Market',
    symbol: 'BCG',
    sector: 'Healthcare (Pharmacy)',
    geography: 'Kuala Lumpur',
    price: BCG_PRICE,
    openingDate: '29-Oct-2026',
    closingDate: '05-Nov-2026',
    closingTime: '5:00 p.m.',
    ballotingDate: '10-Nov-2026',
    allotmentDate: '18-Nov-2026',
    listingDate: '19-Nov-2026',
    ib: 'Maybank IB, RHB IB, AmInvestment Bank, UBS',
    totalShares: BCG_TOTAL_SHARES,

    // Struktur tawaran (prospektus berdaftar)
    ipoNewShares: 590547000,
    ipoOfferForSaleShares: 1291821000,
    ipoTotalOfferShares: 1882368000,
    ipoCompanyGrossProceeds: 637800000,
    ipoSellerGrossProceeds: 1395200000,
    ipoProceedsBasis: 'Terbitan awam 590,547,000 saham baharu (RM637.8 juta untuk syarikat) + tawaran jualan sehingga 1,291,821,000 saham sedia ada (RM1,395.2 juta untuk pemegang saham penjual) pada RM1.08 = sehingga 1,882,368,000 saham atau 25.5% modal diperbesarkan.',
    ofs: true,
    ofsPercentage: 68.6,
    cornerstoneShares: 665500000,
    cornerstoneStake: 9.0,
    overAllotmentShares: 225146000,

    priceStatus: 'registered-prospectus',
    priceSourceNote: 'RM1.08 ialah harga runcit yang disahkan dalam prospektus berdaftar Big Caring Group Bhd (29 Okt 2026). Harga runcit akhir ialah yang lebih rendah antara RM1.08 atau harga institusi yang ditetapkan pada 10 Nov 2026.',

    // Kewangan — FY26 kini tahun teraudit dalam prospektus
    headers: ['FYE 24', 'FYE 25', 'FYE 26 — audit prospektus', 'FY27 — belum disahkan', 'FY28 — belum disahkan'],
    historicalYears: [24, 25, 26],
    projectionHeaders: ['FY27 — belum disahkan', 'FY28 — belum disahkan'],
    rev24: null,
    rev25: BCG_REV_FY25,
    revF: null,
    revF1: null,
    pat24: null,
    pat25: BCG_PATAMI_FY25,
    pat26: BCG_PATAMI_FY26,
    patF: null,
    patF1: null,
    eps24: null,
    eps25: Number(bcgEps25.toFixed(4)),
    eps26: Number(bcgEps26.toFixed(4)),
    epsF: null,
    epsF1: null,
    epsGrowthF: null,
    epsGrowthF1: null,

    pe: bcgPe26,
    ipoPe: bcgPe26,
    ipoPeBasis: 'PE sejarah 41.6x atas PATAMI FY26 teraudit RM191.6 juta pada harga runcit RM1.08 dan 7,381,835,680 saham.',
    targetPe: 30,
    targetPeBasis: 'Andaian senario boleh laras; bukan gandaan wajar yang disahkan.',

    financialProfileStatus: 'incomplete',
    financialEvidenceStatus: 'audited-prospectus',
    financialReviewDate: '29-Oct-2026',
    financialBasis: 'PATAMI FY26 teraudit RM191.6 juta digunakan untuk EPS/PE pemegang saham; group PAT FY26 RM231.8 juta termasuk kepentingan bukan kawalan dan dipaparkan berasingan.',
    verifiedPatami25: BCG_PATAMI_FY25,
    groupPat25: 143020000,
    groupPat26: BCG_GROUP_PAT_FY26,
    groupRevenue26: BCG_REV_FY26,
    financialReview: {
        title: 'Prospektus berdaftar disahkan; sasaran Sifu masih ditangguh.',
        summary: 'Prospektus berdaftar 29 Okt 2026 mengesahkan harga runcit RM1.08, PATAMI FY26 teraudit RM191.6 juta (+56.7%) atas hasil RM4,024.0 juta, dengan PE 41.6x. Profil kewangan penuh (margin kasar, kunci kira-kira, unjuran) belum dimuatkan, jadi sasaran harga Sifu masih belum boleh dikira.',
        profitLabel: 'PATAMI (audit prospektus)',
        historicalPe: { year: 26, patami: BCG_PATAMI_FY26 },
        scenarioLabel: 'Senario gandaan atas PATAMI FY26 RM191.6 juta (EPS ~2.60 sen) — bukan nilai wajar disahkan atau sasaran Sifu:',
        sopNote: 'Harga dan keuntungan FY26 kini disahkan prospektus, tetapi sasaran Sifu ditangguh kerana profil kewangan penuh belum lengkap. Harga institusi dan OS awam hanya diketahui selepas 10 Nov 2026.'
    },
    financialSourcesHTML: [
        link(SRC_BCG_EDGE, 'The Edge: Prospektus RM1.08 & peruntukan dana (29 Okt 2026)'),
        link(SRC_BCG_REUTERS, 'Reuters: Penilaian RM8 bilion & 19 pelabur cornerstone (29 Okt 2026)'),
        link(SRC_BCG_STAR, 'The Star: Pembahagian hasil & cornerstone (29 Okt 2026)'),
        link(SRC_BCG_MINICHART, 'MiniChart: Tarikh, cornerstone & PE 41.5x (29 Okt 2026)'),
        link(SRC_BCG_BURSA, 'Pengumuman jadual IPO Bursa Malaysia')
    ],
    valuationScenarios: [
        { multiple: 25, price: Number((25 * (bcgEps26 / 100)).toFixed(3)) },
        { multiple: 30, price: Number((30 * (bcgEps26 / 100)).toFixed(3)) }
    ],
    valuationScenarioBasis: 'Sensitiviti berdasarkan PATAMI FY26 teraudit RM191.6 juta (EPS ~2.60 sen). Julat ini bukan nilai wajar disahkan, ramalan debut atau sasaran Sifu.',
    mitiVerdict: 'PROSPEKTUS BERDAFTAR (29 OKT) — HARGA INSTITUSI 10 NOV',

    analystInsight: `<b>PROSPEKTUS BERDAFTAR 29 OKT 2026 — RM1.08, PE 41.6x ATAS PATAMI FY26</b><br>• Harga runcit RM1.08 disahkan prospektus; permodalan pasaran ~RM8.0 bilion (7.38 bilion saham).<br>• PATAMI FY26 teraudit RM191.6 juta (+56.7%) atas hasil RM4,024.0 juta — PE 41.6x, masih premium untuk runcit farmasi.<br>• 89.5% hasil terbitan baharu (RM570.7 juta) untuk bayar hutang bank; gear dijangka turun 2.8x → 0.9x dengan penjimatan faedah ~RM26.3 juta/tahun.<br>• Cornerstone: 19 pelabur institusi (termasuk IFC, JPMorgan Asset Management, abrdn, Principal Asset Management, First Sentier Investors) mengambil 665.5 juta saham (9.0% modal diperbesarkan); harga institusi ditetapkan 10 Nov 2026.<br>• Sasaran harga Sifu masih ditangguh — profil kewangan penuh belum dimuatkan.<br>• ${link(SRC_BCG_EDGE, 'The Edge')} · ${link(SRC_BCG_STAR, 'The Star')}`,

    fullAnalysis: `<b>DAPATAN KAJIAN — BIG CARING GROUP BHD (PROSPEKTUS BERDAFTAR 29 OKT 2026)</b><br><br><b>Harga dan saiz tawaran</b><br>Prospektus menetapkan harga runcit RM1.08 untuk sehingga 1,882,368,000 saham (25.5% modal diperbesarkan). Terbitan awam 590,547,000 saham baharu mengumpul RM637.8 juta untuk syarikat, manakala tawaran jualan 1,291,821,000 saham sedia ada mengumpul RM1,395.2 juta untuk pemegang saham penjual. Pada RM1.08, permodalan pasaran selepas penyenaraian ~RM8.0 bilion. ${link(SRC_BCG_EDGE, 'The Edge')} · ${link(SRC_BCG_BURSA, 'Pengumuman Bursa')}<br><br><b>Kewangan FY26 (audit)</b><br>Bagi tahun kewangan berakhir 30 Jun 2026, hasil ialah RM4,024.0 juta (+17.9%), EBITDA RM552.4 juta dan PATAMI RM191.6 juta (+56.7% daripada RM122.3 juta), dengan margin PATAMI 4.8%. Pada RM1.08, PE sejarah ialah 41.6x atas PATAMI FY26. Group PAT FY26 RM231.8 juta termasuk kepentingan bukan kawalan dan bukan angka PATAMI. ${link(SRC_BCG_MINICHART, 'MiniChart')}<br><br><b>Penggunaan dana dan pinjaman</b><br>RM570.7 juta (89.5%) untuk bayar balik pinjaman bank, RM30.0 juta (4.7%) untuk pusat pengedaran baharu di Klang dan RM37.1 juta (5.8%) untuk kos penyenaraian. Pinjaman bank berjumlah RM1.7 bilion (akhir Ogos) dan nisbah gear dijangka turun daripada 2.8x (31 Ogos 2026) kepada 0.9x selepas terbitan, menjimatkan faedah ~RM26.3 juta setahun. Syarikat mencatat liabiliti semasa bersih RM423.2 juta (30 Jun 2026). ${link(SRC_BCG_EDGE, 'The Edge')}<br><br><b>Struktur dan sokongan institusi</b><br>Cornerstone sebanyak 665,500,000 saham (9.0% modal diperbesarkan) diambil oleh 19 pelabur institusi termasuk International Finance Corporation (World Bank), JPMorgan Asset Management, abrdn (Aberdeen Asset Management), Principal Asset Management dan First Sentier Investors. Tawaran institusi sehingga 1,614,730,000 saham ditetapkan melalui bookbuilding pada 10 Nov 2026; harga runcit akhir ialah yang lebih rendah antara RM1.08 atau harga institusi. Opsyen over-allotment sehingga 225,146,000 saham. ${link(SRC_BCG_REUTERS, 'Reuters')}<br><br><b>Model bisnes</b><br>Rangkaian farmasi terbesar negara dengan 668 kedai dan 24.2% bahagian pasaran (akhir September), beroperasi jenama BIG, CARiNG, Georgetown, Wellings, Ting dan iCare. Pertumbuhan dibiayai hutang melalui pemerolehan CARiNG (RM888.3 juta, 2023), Medispec (RM249.4 juta) dan Your Physio (RM32.8 juta). Polisi dividen sehingga 50% PATAMI. Pengambilalihan YMS masih belum selesai (long-stop tranche pertama 30 Nov 2026).<br><br><b>Tarikh penting</b><br>Tawaran runcit tutup 5 Nov 2026 (5:00 petang); tawaran institusi tutup 6 Nov; penetapan harga institusi dan ballot runcit 10 Nov; peruntukan 18 Nov; penyenaraian 19 Nov 2026.<br><br><b>Penilaian semasa</b><br>Pada PE 41.6x atas PATAMI FY26, penilaian kekal premium; peningkatan keuntungan perlu disokong oleh pertumbuhan jualan kedai, margin dan penjimatan faedah selepas pembayaran hutang. Sasaran harga Sifu ditangguh sehingga profil kewangan penuh dan harga institusi disahkan.`,

    catalysts: [
        `<strong>Harga disahkan prospektus:</strong> RM1.08 sesaham; permodalan pasaran ~RM8.0 bilion pada 7.38 bilion saham. ${link(SRC_BCG_EDGE, 'The Edge')}.`,
        `<strong>Keuntungan FY26 melonjak:</strong> PATAMI RM191.6 juta (+56.7%) atas hasil RM4,024.0 juta; PE 41.6x. ${link(SRC_BCG_MINICHART, 'MiniChart')}.`,
        `<strong>Kurangkan hutang, jimat faedah:</strong> 89.5% hasil terbitan digunakan untuk bayar balik pinjaman; gear dijangkakan 2.8x → 0.9x dan penjimatan faedah ~RM26.3 juta setahun. ${link(SRC_BCG_STAR, 'The Star')}.`,
        `<strong>Cornerstone institusi:</strong> 19 pelabur cornerstone mengambil 665.5 juta saham (9.0% modal diperbesarkan) termasuk IFC (World Bank), JPMorgan Asset Management, abrdn, Principal Asset Management dan First Sentier Investors. ${link(SRC_BCG_REUTERS, 'Reuters')}.`,
        `<strong>Rangkaian runcit terbesar:</strong> 668 kedai dan 24.2% bahagian pasaran (akhir September) dengan enam jenama farmasi.`,
        `<strong>Polisi dividen:</strong> sehingga 50% PATAMI selepas penyenaraian; tempoh moratorium 6 bulan untuk promoter/pemegang saham besar.`
    ],
    peers: '<strong>Asas perbandingan:</strong> Bandingkan dengan rangkaian farmasi/runcit kesihatan serantau. Pada PE sejarah 41.6x atas PATAMI FY26, penilaian adalah premium; pertumbuhan keuntungan, margin dan pengurangan hutang selepas IPO menentukan sama ada gandaan ini berbaloi.'
};

// ══════════════════════════════════════════════════════════════════════════════
// 2) ROSADO BERHAD — IPO baharu Pasaran ACE (tawaran MITI 29-Okt – 09-Nov-2026)
// ══════════════════════════════════════════════════════════════════════════════
const ROSADO_PUBLIC_ISSUE = 689000000;
const ROSADO_OFS = 305500000;
const ROSADO_TOTAL_OFFER = ROSADO_PUBLIC_ISSUE + ROSADO_OFS; // 994,500,000
const ROSADO_MITI_TRANCHE = 182000000 + ROSADO_OFS; // 487,500,000

const rosadoUpdate = {
    stage: 2,
    status: 'MITI Allocation Phase',
    market: 'ACE Market',
    sector: 'Construction (Data Centre M&E)',
    geography: 'Selangor',
    ib: 'Malacca Securities',
    mitiOpenDate: '29-Oct-2026',
    mitiCloseDate: '09-Nov-2026',
    hasMitiTranche: true,
    mitiOfferShares: ROSADO_MITI_TRANCHE,
    ofs: true,
    ofsPercentage: Number(((ROSADO_OFS / ROSADO_TOTAL_OFFER) * 100).toFixed(2)),
    ipoNewShares: ROSADO_PUBLIC_ISSUE,
    ipoOfferForSaleShares: ROSADO_OFS,
    ipoTotalOfferShares: ROSADO_TOTAL_OFFER,
    ipoProceedsBasis: 'Terbitan awam 689,000,000 saham baharu (195j awam, 38j pengarah/pekerja/orang layak, 274j penempatan pelabur terpilih, 182j Bumiputera MITI) + tawaran jualan 305,500,000 saham sedia ada kepada pelabur Bumiputera MITI = 994,500,000 saham atau 25.5% modal diperbesarkan. Harga tawaran belum ditetapkan.',
    prospectusUrl: SRC_ROSADO_BURSA,
    priceSourceNote: 'Harga tawaran belum ditetapkan. Rekod ini berdasarkan pendedahan prospektus Bursa Malaysia (12 Jun 2026) dan laporan tawaran MITI (29 Okt 2026).',
    financialSourcesHTML: [
        link(SRC_ROSADO_BURSA, 'Pendedahan prospektus Bursa Malaysia: Rosado Berhad'),
        link(SRC_ROSADO_DAGANG, 'DagangNews: Pelan penyenaraian Pasaran ACE (Jun 2026)')
    ],
    analystInsight: `<b>IPO BAHARU PASARAN ACE — KONTRAKTOR M&E PUSAT DATA (TAWARAN MITI 29 OKT – 09 NOV)</b><br>• Pakar kejuruteraan elektrikal & M&E untuk projek pusat data, termasuk kerja awam/struktur sokongan dan penyelenggaraan pencawang.<br>• Sektor 'data centre' sedang panas — permintaan infrastruktur kuasa tinggi (33kV–275kV) di Malaysia.<br>• FYE 31 Mei 2025: PAT RM100.2 juta atas hasil RM345.9 juta — margin tinggi untuk kontraktor M&E.<br>• Bon pelaksanaan RM40.7 juta menyokong buku tempahan RM817.1 juta; sehingga RM163.4 juta diperlukan untuk projek RM1.63 bilion yang sedang dibida.<br>• Harga tawaran belum ditetapkan — sasaran harga Sifu dan OS tidak boleh dikira lagi.<br>• ${link(SRC_ROSADO_BURSA, 'Prospektus Bursa')} · ${link(SRC_ROSADO_DAGANG, 'DagangNews')}`,
    fullAnalysis: `<b>DAPATAN KAJIAN — ROSADO BERHAD (PASARAN ACE)</b><br><br><b>Perniagaan</b><br>Rosado dan anak syarikatnya menyediakan penyelesaian kejuruteraan M&E dengan tumpuan kepada kerja-kerja kejuruteraan elektrikal untuk projek pusat data. Ia turut melaksanakan kerja awam dan struktur berkaitan (kerja tanah, pengorekan parit, pemasangan saluran, asas) serta perkhidmatan penyelenggaraan pencegahan dan pembaikan untuk pencawang dan infrastruktur pengagihan kuasa. Projek melibatkan sistem voltan tinggi 33kV hingga 275kV untuk menyambung bekalan kuasa peringkat penghantaran ke fasiliti pusat data. ${link(SRC_ROSADO_BURSA, 'Prospektus Bursa')}<br><br><b>Kewangan</b><br>Bagi tahun kewangan berakhir 31 Mei 2025, kumpulan mencatat keuntungan selepas cukai RM100.2 juta atas hasil RM345.9 juta — margin untung bersih yang tinggi untuk kontraktor M&E. ${link(SRC_ROSADO_DAGANG, 'DagangNews')}<br><br><b>Struktur tawaran</b><br>Terbitan awam 689,000,000 saham baharu: 195 juta kepada orang awam Malaysia, 38 juta kepada pengarah/pekerja/orang yang menyumbang, 274 juta penempatan persendirian kepada pelabur terpilih, dan 182 juta penempatan Bumiputera diluluskan MITI. Tambahan tawaran jualan 305,500,000 saham sedia ada melalui penempatan kepada pelabur Bumiputera MITI. Jumlah 994,500,000 saham atau 25.5% modal diperbesarkan. Harga tawaran belum ditetapkan.<br><br><b>Penggunaan dana</b><br>Hasil terbitan baharu terutamanya untuk bon pelaksanaan (jaminan bank untuk pelaksanaan projek), pembelian peralatan projek (transformer kuasa, transformer pembumian, sistem telekawalan, panel geganti kawalan & perlindungan), bayaran subkontraktor, bahan projek dan kos penyenaraian. Sehingga akhir April 2026, bon pelaksanaan bernilai RM40.7 juta menyokong buku tempahan RM817.1 juta; sehingga RM163.4 juta lagi mungkin diperlukan bagi projek bernilai RM1.63 bilion yang sedang dibida.<br><br><b>Pemegang saham dan penaja</b><br>TSLIM Holdings Sdn Bhd, kenderaan pelaburan Datuk Lim Tiew Sin (Pengarah Urusan/CEO) dan keluarganya, akan menurunkan pegangan daripada 97% kepada 72.03% selepas penyenaraian. Malacca Securities Sdn Bhd ialah penasihat utama, penaja, penaja jamin dan ejen penempatan. ${link(SRC_ROSADO_DAGANG, 'DagangNews')}<br><br><b>Penilaian semasa</b><br>Tiada harga tawaran, jadi PE dan sasaran harga belum boleh dikira. Sasaran Sifu ditangguh sehingga prospektus berdaftar diterbitkan.`,
    catalysts: [
        `<strong>Pendedahan sektor pusat data:</strong> Kerja kejuruteraan elektrikal dan M&E untuk pusat data, termasuk sistem voltan tinggi 33kV–275kV. ${link(SRC_ROSADO_BURSA, 'Prospektus Bursa')}.`,
        `<strong>Buku tempahan RM817.1 juta:</strong> Disokong bon pelaksanaan RM40.7 juta (akhir April 2026); sehingga RM163.4 juta diperlukan untuk projek RM1.63 bilion yang sedang dibida.`,
        `<strong>Margin untung tinggi:</strong> PAT RM100.2 juta atas hasil RM345.9 juta bagi FYE 31 Mei 2025.`,
        `<strong>Penaja berpengalaman:</strong> Malacca Securities sebagai penasihat utama, penaja, penaja jamin dan ejen penempatan.`,
        `<strong>Pegangan pengasas kukuh:</strong> TSLIM Holdings mengekalkan 72.03% selepas penyenaraian.`,
        `<strong>Tawaran MITI dibuka:</strong> Permohonan Bumiputera MITI 29 Okt – 09 Nov 2026.`
    ],
    peers: '<strong>Asas perbandingan:</strong> Bandingkan dengan kontraktor M&E/kejuruteraan elektrikal yang terdedah kepada pusat data. Tanpa harga tawaran dan PE, penilaian belum boleh dibuat; sasaran Sifu ditangguh.',
    fundUse: 'Hasil terbitan baharu untuk bon pelaksanaan projek, pembelian peralatan projek (transformer, sistem telekawalan, panel geganti), bayaran subkontraktor, bahan projek dan kos penyenaraian. Sebahagian besar hasil tawaran jualan diterima oleh TSLIM Holdings (pemegang saham sedia ada), bukan syarikat.'
};

// ══════════════════════════════════════════════════════════════════════════════
// Apply
// ══════════════════════════════════════════════════════════════════════════════
const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));

function applyIpo(id, update) {
    const ipo = data.find(x => x.id === id);
    if (!ipo) throw new Error(`Record not found: ${id}`);
    Object.assign(ipo, update);
    overrides[id] = Object.assign({}, overrides[id], update);
    console.log(`✅ ${id}: ${Object.keys(update).length} medan dikemas kini.`);
}

applyIpo('big-caring-group-bhd', bcgUpdate);
applyIpo('rosado-berhad', rosadoUpdate);

fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');
fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');

console.log('');
console.log(`BCG: RM${BCG_PRICE} | PATAMI FY26 RM ${(BCG_PATAMI_FY26 / 1e6).toFixed(1)}j | EPS ${bcgEps26.toFixed(2)} sen | PE ${bcgPe26}x | ballot 10-Nov | allotment 18-Nov | listing 19-Nov`);
console.log(`ROSADO: ACE Market | ${ROSADO_TOTAL_OFFER.toLocaleString()} saham (${(ROSADO_TOTAL_OFFER / 1e6).toFixed(1)}j) | tawaran MITI 29-Okt – 09-Nov-2026`);
console.log('');
console.log('Seterusnya: node apply-overrides.js');
