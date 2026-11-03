#!/usr/bin/env node
/**
 * update-miti-november-offers.js
 *
 * Melengkapkan tiga tawaran MITI November 2026 dalam pangkalan data:
 *   - ROSADO BERHAD  : jumlah pemohon MITI dikemas kini (kad MITI 3 Nov 2026)
 *   - RAIDEN HOLDINGS: rekod baru dicipta oleh sync-miti-portal-dates.js pada
 *                      03-Nov; harga indikatif, pemohon dan profil dilengkapkan
 *                      daripada pendedahan prospektus Bursa + The Edge/The Star.
 *   - PARKLAND BERHAD: sama seperti Raiden (tutup 13-Nov); harga belum ditetapkan.
 *
 * data.json + data.js + data_export.js + overrides.json ditulis melalui
 * lib/miti-sync.saveData supaya semuanya kekal seirama, dan nilaiManual yang
 * sama turut masuk ke overrides.json (tidak akan dimalapkan oleh apply-overrides.js).
 *
 * Guna: node scratch/update-miti-november-offers.js
 */

const path = require('node:path');
const { readData, saveData } = require('../lib/miti-sync');

const ROOT = path.join(__dirname, '..');
const MITI_DATE = '03-Nov-2026';

const BURSA_ROSADO = 'https://www.bursamalaysia.com/regulation/prospectus_exposure/rosado-berhad-rosado';
const BURSA_RAIDEN = 'https://www.bursamalaysia.com/regulation/prospectus_exposure/raiden-holdings-berhad-raiden';
const SC_PARKLAND = 'https://www.sc.com.my/resources/prospectus-exposure/prospectus-exposure-parkland-berhad';

const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

/** Nilai yang dikekalkan dalam overrides.json supaya tidak dipulangkan oleh apply-overrides.js. */
const PATCHES = {
    'rosado-berhad': {
        market: 'ACE Market',
        price: 0.63,
        priceStatus: 'indicative-miti',
        sector: 'Construction (Data Centre M&E)',
        geography: 'Johor',
        ib: 'Malacca Securities Sdn Bhd',
        mitiOfferShares: 487500000,
        mitiApplicants: 649,
        mitiApplicantsDate: MITI_DATE,
        mitiApplicantsSource: 'https://sahamonline.miti.gov.my/',
        prospectusUrl: BURSA_ROSADO,
        totalShares: 3900000000,
        financialProfileStatus: 'complete',
        headers: ['FYE 23', 'FYE 24', 'FYE 25'],
        historicalYears: [23, 24, 25],
        projectionHeaders: [],
        rev23: 26520000,
        rev24: 303276000,
        rev25: 345898000,
        gp23: 11195000,
        gp24: 82208000,
        gp25: 137505000,
        pat23: 6334000,
        pat24: 58054000,
        pat25: 100020000,
        assets23: 92346000,
        assets24: 237649000,
        assets25: 513496000,
        liab23: 87721000,
        liab24: 174970000,
        liab25: 436969000,
        eps23: 0.16,
        eps24: 1.49,
        eps25: 2.56,
        pe: 24.56,
        ipoPe: 24.56,
        targetPe: 25,
        ipoNewShares: 689000000,
        ipoOfferForSaleShares: 305500000,
        ipoTotalOfferShares: 994500000,
        ofs: true,
        ofsPercentage: 7.83,
        moratorium: 'ACE Rule 3.19(1): TSLIM Holdings 2,809,170,000 saham (72.03%) di bawah moratorium 6 bulan pertama; 1,755,000,000 (45.00%) kekal dikunci 6 bulan kedua; kemudian 1/3 setahun.',
        priceSourceNote: 'Harga RM0.63/unit adalah indikatif portal MITI (' + MITI_DATE + ') semasa tawaran 29 Okt – 09 Nov 2026. Draf prospektus (pendedahan 12 Jun 2026, dikemas kini 26 Okt 2026) masih memaparkan "IPO Price: RM[●]" pada Seksyen 3 & 4. Angka sejarah 3 tahun di bawah adalah dari Seksyen 12 Financial Information (PDF) — diselaraskan 3-Nov-2026.',
        businessSummary: 'Rosado Berhad ialah pemegang pelaburan yang melalui anak syarikatnya menyediakan penyelesaian kejuruteraan M&E — tertumpu kepada kerja elektrikal (275/132/33/11kV) untuk projek pusat data di Johor, serta kerja sivil/struktur bersepadu. Pada FYE 2025, 99.94% hasil (RM345.68j) datang daripada projek pusat data dan 99.94% hasil geografi dari Johor. Lima projek telah siap menjelang LPD dengan nilai terkumpul ~RM391.54 juta.',
        predictedGrade: 'B',
        financialSourcesHTML: [
            link(BURSA_ROSADO, 'Pendedahan prospektus Bursa: Rosado Berhad (dikemas kini 26 Okt 2026)'),
            link(BURSA_ROSADO + '#s12', 'Seksyen 12 — Financial Information (56 m/s, PDF)'),
            link(BURSA_ROSADO + '#s4', 'Seksyen 4 — Details of our IPO (14 m/s, PDF)'),
            link(BURSA_ROSADO + '#s2', 'Seksyen 2 — Approvals & Conditions / Moratorium (PDF)'),
            link('https://www.dagangnews.com/index.php/article/terkini/syarikat-kejuruteraan-pusat-data-rosado-bhd-rancang-penyenaraian-di-pasaran-ace-70159', 'DagangNews: Kontraktor pusat data Rosado BHD rancang penyenaraian ACE'),
        ],
        analystInsight: `<b>TAWARAN MITI PASARAN ACE — KONTRAKTOR M&E PUSAT DATA TULEN (29 OKT – 09 NOV 2026)</b><br>• <b>Harga Indikatif:</b> RM0.63/unit di portal MITI; draf prospektus masih "RM[●]". Permodalan tersirat ~RM2.46 bilion atas 3.90 bilion saham diperbesarkan.<br>• <b>Struktur:</b> Public issue 689j saham baru (195j balloting awam – 50% Bumiputera + 38j EP + 274j PP terpilih + 182j PP Bumiputera MITI) + OFS 305.5j saham sedia ada (7.83%) melalui PP kepada MITI Bumiputera. Jumlah tawaran 994.5j = 25.50% enlarged. MITI tranche = 182j + 305.5j = 487.5j (12.50%).<br>• <b>Kewangan audited (RM'000):</b> Hasil FY23 26,520 → FY24 303,276 → FY25 345,898 (CAGR 204% sebab mula 2022). PAT 6,334 → 58,054 → 100,020. GP margin FY25 39.75%; PAT margin 28.92%. EPS pro forma FY25 (3.9B saham) = 2.56 sen.<br>• <b>PE indikatif:</b> ~24.6x FY25 — premium untuk cerita pusat data tulen (94.60% → 99.81% → 99.94% daripada DC sejak FY23).<br>• <b>Sumber risiko:</b> Kegantungan kepada projek DC (94.6–100% hasil); tumpuan Johor 99.94%; FPE 2026 unaudited PAT ~RM74.3j menunjukkan keluk keuntungan lebih perlahan berbanding FY25.<br>• <b>Penaja:</b> Malacca Securities Sdn Bhd (penasihat utama, penaja, underwriter & ejen penempatan).<br>• <b>Permohonan MITI:</b> 649 pelabur setakat ${MITI_DATE}.<br>• ${link(BURSA_ROSADO, 'PDF prospektus penuh')}`,
        fullAnalysis: `<b>DAPATAN KAJIAN — ROSADO BERHAD (PASARAN ACE)</b><br><br><b>Perniagaan</b><br>Rosado Berhad (registration 202501048568 / 1649976-K) ialah syarikat pemegang pelaburan yang menyedia penyelesaian M&E — terutamanya kerja elektrikal voltan tinggi 275/132/33/11kV untuk pusat data, berserta kerja sivil/struktur sokongan. Pada FYE 2025, 99.94% daripada hasil RM345.68 juta datang daripada projek pusat data; 99.94% hasil geografi dari Johor. Lima projek telah selesai sepenuhnya menjelang LPD dengan nilai terkumpul ~RM391.54 juta. Antara pelanggan utama: pengoperasi pusat data berskala hyperscale dan pembekal utiliti (Customer B CLS 275/33kV di Kulai, Customer G CLS 275/33kV di Pulai, JHB1X0 Phase 1).<br><br><b>Struktur tawaran (Seksyen 4, PDF)</b><br>IPO Rosado = public issue 689,000,000 saham biasa baharu (17.67% enlarged) + offer for sale 305,500,000 saham sedia ada (7.83% enlarged). Jumlah 994,500,000 IPO Shares = 25.50% daripada enlarged 3,900,000,000 saham.<br>• Balloting orang awam: 195,000,000 (5.00%) — sekurang-kurangnya 50% rizab Bumiputera.<br>• Eligible Persons (Pink Form): 38,000,000 (0.97%).<br>• Private placement terpilih: 274,000,000 (7.03%).<br>• PP Bumiputera MITI: 182,000,000 (4.67%).<br>• OFS via PP Bumiputera MITI: 305,500,000 (7.83%) — hasil kepada Penjual Saham Sedia Ada (TSLIM Holdings), bukan syarikat.<br>Jumlah MITI tranche = 182j + 305.5j = 487.5j (12.50% enlarged). Pre-IPO issued capital: 3,211,000,000 saham.<br><br><b>Kewangan audited (Seksyen 12, RM'000)</b><br>Hasil: FY23 26,520 → FY24 303,276 → FY25 345,898.<br>Kasar untung: 11,195 → 82,208 → 137,505; GP margin 42.21% → 27.11% → 39.75%.<br>PAT: 6,334 → 58,054 → 100,020; PAT margin 23.88% → 19.14% → 28.92%.<br>EPS pro forma (enlarged 3.90B): 0.16 sen → 1.49 sen → 2.56 sen.<br>Unjuran/ stub FPE 2026 (unaudited): hasil RM312,091j, PAT RM74,280j — pertumbuhan perlahan tetapi masih positif.<br><br><b>Buku tempahan & pipeline</b><br>Buku tempahan belum ditagih di LPD mencecah ~RM817.1 juta, dengan bon pelaksanaan ~RM40.7 juta. Rosado turut membid projek bernilai ~RM1.63 bilion yang dijangka membuat keputusan dalam masa terdekat — sumber utama pengisian order book selepas 2026.<br><br><b>Moratorium & pemegang saham</b><br>ACE Rule 3.19(1). Specified Shareholder: TSLIM Holdings Bhd — 2,809,170,000 saham (72.03% enlarged) dikunci selama 6 bulan pertama; sekurang-kurangnya 1,755,000,000 (45.00%) kekal dikunci 6 bulan kedua; selepas itu 1/3 setahun boleh dilepaskan.<br><br><b>Penilaian pada RM0.63 indikatif MITI</b><br>Permodalan tersirat = 3.900j × RM0.63 = <b>RM2.457 bilion</b>.<br>PE FY25 = RM2.457b / RM100.02j = <b>~24.6x</b>.<br>Sasaran Sifu = targetPe 25x × EPS pro forma FY25 2.56 sen = <b>RM0.64</b> (hampir sama dengan harga MITI). Sasaran berkalibrasi <b>RM0.78</b> lebih optimis dan bergantung pada unjuran FY26/FY27 (bukan FPE26 stub). Gred B — disokong cerita DC tulen &amp; margin 29% tetapi dengan risiko tumpuan geografi/projek &amp; FPE26 PAT lebih rendah daripada FY25.`,
        catalysts: [
            '<strong>Hot theme pusat data:</strong> 99.94% hasil FY25 daripada projek DC — pendedahan tulen kepada pertumbuhan Johor-Singapore Economic Region.',
            '<strong>Buku tempahan RM817.1 juta:</strong> Menyokong pendapatan FYE 2026–2028; pipeline bida RM1.63 bilion.',
            '<strong>Margin tinggi:</strong> GP margin 39.75% & PAT margin 28.92% FY25 — premium bagi contractor M&E.',
            '<strong>Penaja kukuh:</strong> Malacca Securities (penasihat utama, penaja, underwriter, ejen penempatan).',
            '<strong>Pejabat & infrastruktur:</strong> Hasil IPO membiayai penambahan kapasiti projek DC dan pemerolehan equipment voltan tinggi.',
            '<strong>Risiko tumpuan:</strong> 99.94% geografi Johor, 99.94% segmen DC; satu pelanggan besar boleh menjadi konsentrasi risiko.',
            '<strong>Unjuran FPE 2026:</strong> PAT unaudited RM74.3j — lebih perlahan daripada FY25; margin tertekan jika harga DC tender turun.',
            `<strong>Tawaran MITI ditutup:</strong> 29 Okt – 09 Nov 2026.`,
        ],
        peers: '<strong>Asas perbandingan:</strong> Kontraktor M&E/elektrikal Pasaran ACE yang terdedah kepada pusat data (Rosado paling tulen berbanding Raiden & kontrakor M&E industri lain). Pada PE ~24.6x FY25 dengan 99.94% hasil DC dan buku tempahan RM817j, penilai boleh benarkan premium tetapi harga akhir perlu konsisten dengan unjuran FY26.',
        fundUse: 'Hasil IPO untuk: (i) pembelian equipment & infrastructure (trafo, switchgear, kabel voltan tinggi, kenderaan projek) dalam tempoh 12–24 bulan; (ii) pengembangan pasukan kejuruteraan & projek; (iii) modal kerja; (iv) pembayaran balik sebahagian pinjaman pengarah. Pecahan peratusan masih [●] dalam draf (bergantung pada harga akhir & jumlah hasil bersih).',
        financialReview: {
            title: 'Tawaran MITI sedang berjalan; penutup 09-Nov-2026.',
            summary: 'Rosado Berhad (ACE) dalam tawaran MITI 29 Okt – 09 Nov 2026 pada harga indikatif RM0.63. Kewangan audited Seksyen 12: hasil RM26.5j → RM303.3j → RM345.9j; PAT RM6.3j → RM58.1j → RM100.0j; GP margin FY25 39.75%. 99.94% hasil FY25 datang daripada projek pusat data.',
            profitLabel: 'Profit After Tax (PAT) audited',
            scenarioLabel: 'PE ~24.6x pada RM0.63 (EPS pro forma FY25 2.56 sen). Sasaran Sifu dikemas kini selepas harga akhir didaftarkan.',
            sopNote: 'IPO Price masih "RM[●]" dalam draf (dikemas kini 26 Okt 2026); RM0.63 dari portal MITI adalah indikatif. Gred B — disokong hot theme DC tulen + margin tinggi, dengan risiko tumpuan geografi/segmen.',
        },
    },

    'raiden-holdings-berhad': {
        market: 'ACE Market',
        price: 0.2,
        priceStatus: 'indicative-miti',
        sector: 'Construction (M&E Building Services)',
        geography: 'Johor',
        ib: 'Alliance Islamic Bank Berhad',
        mitiOfferShares: 125000000,
        mitiApplicants: 7,
        mitiApplicantsDate: MITI_DATE,
        mitiApplicantsSource: 'https://sahamonline.miti.gov.my/',
        prospectusUrl: BURSA_RAIDEN,
        priceSourceNote: 'Harga RM0.20/unit ialah indikatif portal MITI (' + MITI_DATE + '). Draf prospektus (pendedahan 13 Jul 2026, dikemas kini 2 Nov 2026) masih memaparkan "IPO Price: RM[●]" — harga akhir belum ditetapkan. Struktur tawaran & kewangan audited di bawah adalah dari PDF seksyen prospektus Bursa.',
        businessSummary: 'Raiden Holdings Berhad ialah syarikat pemegang pelaburan yang melalui anak syarikatnya (Raiden M&E, Ritec Solution, Radiant Connect) menyediakan sistem M&E terintegrasi, sistem perlindungan kebakaran & elektrikal, serta sistem keselamatan ELV (extra low voltage) dan komunikasi untuk pelanggan industri — kilang, gudang, fasiliti penyelenggaraan pesawat (MRO) dan pusat data. Beribu pejabat di Johor Bahru; projek di Johor, Penang, Kedah dan Selangor.',
        predictedGrade: 'B',
        ipoNewShares: 210000000,
        ipoOfferForSaleShares: 80000000,
        ipoTotalOfferShares: 290000000,
        ipoProceedsBasis: 'Terbitan awam 210,000,000 saham baharu (50j balloting orang awam — 50% rizab Bumiputera, 20j pengarah/pekerja/orang layak, 95j penempatan persendirian ke pelabur terpilih, 45j penempatan Bumiputera MITI) + tawaran jualan 80,000,000 saham sedia ada oleh Cheong Kah Yee (47j), Ooi Chi Yang (25j) & Cheong Kah Yang (8j) ke penempatan Bumiputera MITI. Jumlah 290,000,000 saham; enlarged modal 1,000,000,000 saham. Harga akhir belum ditetapkan.',
        ofs: true,
        ofsPercentage: 8.0,
        totalShares: 1000000000,
        financialProfileStatus: 'complete',
        headers: ['FYE 23', 'FYE 24', 'FYE 25'],
        historicalYears: [23, 24, 25],
        projectionHeaders: [],
        rev23: 104792000,
        rev24: 139236000,
        rev25: 163883000,
        gp23: 18040000,
        gp24: 26109000,
        gp25: 22917000,
        pat23: 11660000,
        pat24: 15706000,
        pat25: 9352000,
        assets23: 42747000,
        assets24: 68996000,
        assets25: 86137000,
        liab23: 30508000,
        liab24: 44551000,
        liab25: 54538000,
        eps23: 1.17,
        eps24: 1.57,
        eps25: 0.94,
        pe: 21.28,
        ipoPe: 21.28,
        targetPe: 18,
        moratorium: 'ACE Rule 3.19(1): 6 bulan penuh (71.05%), kemudian 45% selama 6 bulan, kemudian 1/3 setahun. COLB Capital (60/30/7/3 milik Cheong Kah Yee/Ooi Chi Yang/Cheong Kah Yang/Liew Chun Kiat) pegang 51%.',
        financialSourcesHTML: [
            link(BURSA_RAIDEN, 'Pendedahan prospektus Bursa Malaysia: Raiden Holdings Berhad (dikemas kini 2 Nov 2026)'),
            link(BURSA_RAIDEN + '/#section-4', 'Seksyen 4 — Details of the Offering (PDF)'),
            link(BURSA_RAIDEN + '/#section-9', 'Seksyen 9 — Financial Information (PDF, 49 m/s)'),
            link('https://theedgemalaysia.com/node/810471', 'The Edge: Engineering firm Raiden Holdings files for ACE Market IPO (13 Jul 2026)'),
        ],
        analystInsight: `<b>TAWARAN MITI PASARAN ACE — KONTRAKTOR M&E INDUSTRI (3 NOV – 11 NOV 2026)</b><br>• <b>Harga Indikatif:</b> RM0.20/unit di portal MITI; draf prospektus masih "IPO Price: RM[●]". Permodalan tersirat ~RM200 juta pada 1.00 bilion saham diperbesarkan.<br>• <b>Struktur:</b> Public issue 210j saham baru (5.00j awam balloting + 2.00j EP + 9.50j PP + 4.50j MITI) + OFS 8.00j daripada Cheong Kah Yee/Ooi Chi Yang/Cheong Kah Yang — semua OFS ke penempatan MITI. MITI tranches = 45j + 80j = 125j.<br>• <b>Kewangan audited (RMj):</b> Hasil 104.8 → 139.2 → 163.9 (CAGR 25.06% FY23–FY25). PAT 11.7 → 15.7 → <b>9.4</b> — susut 40% YoY pada FY25 sebab projek siap hampir selesai; GP pun turun 26.1 → 22.9.<br>• <b>PE indikatif:</b> ~21x FY25 (EPS pro-forma 0.94 sen) atau ~13x FY24. Agak tinggi bagi syarikat yang keuntungannya menyusut.<br>• <b>Buku pesanan:</b> RM153.38 juta belum ditagih di LPD, diiktiraf FYE 2026–2028.<br>• <b>Penaja:</b> Alliance Islamic Bank (penasihat utama, penaja, penaja jamin & ejen penempatan tunggal).<br>• <b>Permohonan MITI:</b> 7 pelabur setakat ${MITI_DATE}.<br>• ${link(BURSA_RAIDEN, 'PDF prospektus Bursa')}`,
        fullAnalysis: `<b>DAPATAN KAJIAN — RAIDEN HOLDINGS BERHAD (PASARAN ACE)</b><br><br><b>Perniagaan</b><br>Raiden ialah syarikat pemegang pelaburan; melalui anak syarikat Raiden M&E (diakuisisi Jun 2026), Ritec Solution dan Radiant Connect ia menyediakan (i) sistem M&E terintegrasi untuk pengguna industri, (ii) sistem perlindungan kebakaran & elektrikal, serta (iii) sistem keselamatan ELV dan komunikasi. Projek tertumpu kepada hartanah industri — kilang, gudang, fasiliti MRO dan pusat data. Beribu pejabat di Johor Bahru; semua pendapatan dari Semenanjung Malaysia (Johor, Penang, Kedah, Selangor). Pengasas/Pengarah Urusan: Cheong Kah Yee (umur 37, berkelulusan undang-undang, memulakan perniagaan 2021).<br><br><b>Struktur tawaran (daripada Details of the IPO, PDF)</b><br><em>Public issue:</em> 210,000,000 saham baru = 21.00% daripada enlarged 1,000,000,000 saham.<br>• 50,000,000 (5.00%) — balloting orang awam Malaysia; 50% rizab Bumiputera.<br>• 20,000,000 (2.00%) — pengarah/pekerja/orang layak (Eligible Persons).<br>• 95,000,000 (9.50%) — penempatan persendirian kepada pelabur terpilih.<br>• 45,000,000 (4.50%) — penempatan persendirian Bumiputera diluluskan MITI ("MITI Tranche").<br><em>Offer for Sale:</em> 80,000,000 saham sedia ada (8.00%) melalui penempatan persendirian kepada pelabur Bumiputera MITI — penjual: Cheong Kah Yee (47j), Ooi Chi Yang (25j), Cheong Kah Yang (8j). Hasil OFS <em>pergi kepada penjual</em>, bukan syarikat.<br>Jumlah tawaran = 290j (125j MITI + 165j bukan MITI).<br><br><b>Kewangan audited (Seksyen 9, RM'000)</b><br>Hasil: FY23 104,792 → FY24 139,236 → FY25 163,883 (CAGR 25.06%).<br>Kasar untung: 18,040 → 26,109 → <b>22,917</b> (GP margin turun 18.7% → 16.5% sebab campuran projek).<br>PAT: 11,660 → 15,706 → <b>9,352</b> (jatuh 40.5% YoY FY25)<br>Jumlah aset: 42,747 → 68,996 → 86,137<br>Jumlah liabiliti: 30,508 → 44,551 → 54,538<br>Komposisi hasil berubah: integrasi sistem M&E turun dari 90.94% (FY23) → 39.33% (FY25), saki-baki daripada M&E subsystem dan lain-lain — diversifikasi tetapi margin lebih rendah.<br><br><b>Buku pesanan & unjuran</b><br>Tiada unjuran laba berkanun (ACE Market tidak mewajibkan); buku pesanan belum ditagih <b>RM153.38 juta</b> di LPD, dijangka diiktiraf FYE 2026–FYE 2028. Ini satu-satunya petunjuk trajectory masa depan.<br><br><b>Penaja & pemegang saham</b><br>Alliance Islamic Bank Berhad (AIB) — penasihat utama, penaja, penaja jamin & ejen penempatan tunggal (ACE Rule 3.19(1) tidak memerlukan penaja jamin berasingan). COLB Capital pegang 51.00% selepas penyenaraian; dipegang 60/30/7/3 oleh Cheong Kah Yee/Ooi Chi Yang/Cheong Kah Yang/Liew Chun Kiat. Moratorium 6+6+3 tahun seperti standard ACE.<br><br><b>Penilaian pada RM0.20 indikatif MITI</b><br>Permodalan tersirat = 1,000j × RM0.20 = <b>RM200 juta</b>.<br>PE FY25 = RM200j / RM9.352j = <b>~21x</b> (EPS pro forma 0.94 sen).<br>PE FY24 = RM200j / RM15.706j = ~13x (EPS 1.57 sen).<br>21x untuk syarikat yang PAT susut 40% — agak premium. Disokong oleh CAGR hasil 25%, buku pesanan RM153 juta, dan pendedahan kepada pusat data/MRO. Sasaran Sifu akan dimuktahirkan selepas harga akhir ditetapkan dalam prospektus berdaftar.`,
        catalysts: [
            '<strong>Pendedahan pusat data & MRO:</strong> Sistem M&E terintegrasi untuk kilang, gudang, fasiliti MRO dan pusat data.',
            '<strong>Buku pesanan belum ditagih RM153.0 juta:</strong> Menyokong pendapatan sehingga 2028.',
            '<strong>Hasil tumbuh:</strong> Hasil FY25 RM164.0 juta.',
            '<strong>Penaja tunggal:</strong> Alliance Islamic Bank sebagai penasihat utama, penaja, penaja jamin & ejen penempatan.',
            '<strong>Pengembangan ke Lembah Klang:</strong> Pejabat baharu ~10,000 kaki persegi + 32 kakitangan dibiayai hasil IPO.',
            `<strong>Risiko keuntungan menyusut:</strong> Keuntungan FY25 ~RM9 juta berbanding RM16 juta pada FY24; OFS kepada Cheong Kah Yee, Cheong Kah Yang & Ooi Chi Yang.`,
            `<strong>Tawaran MITI dibuka:</strong> Permohonan Bumiputera MITI 03 Nov – 11 Nov 2026.`,
        ],
        peers: '<strong>Asas perbandingan:</strong> Kontraktor M&E / building services Pasaran ACE yang terdedah kepada projek industri, MRO dan pusat data. Pada PE ~21x (FY25) ia agak premium; jika harga akhir dinaikarkan lagi ke RM0.22–0.25, PE FY25 mencecah 23–26x dan memerlukan pertumbuhan PAT semula untuk justifikasi.',
        fundUse: 'Hasil terbitan baharu (gross proceeds) untuk: (i) pengembangan perniagaan — pejabat baharu ~10,000 kaki persegi di Lembah Klang + 32 kakitangan, dalam masa 36 bulan; (ii) perbelanjaan modal — perisian pengurusan projek & perakaunan, peralatan seperti boom lift dan forklift, dalam masa 24 bulan; (iii) modal kerja, dalam masa 24 bulan. Breakdown peratusan masih [●] dalam draf (bergantung pada harga akhir). Hasil OFS (80j saham) pergi sepenuhnya kepada penjual (Cheong Kah Yee, Ooi Chi Yang, Cheong Kah Yang), bukan syarikat.',
        financialReview: {
            title: 'Tawaran MITI dibuka; harga akhir belum ditetapkan.',
            summary: 'Raiden Holdings Berhad dalam fasa permohonan MITI (03 Nov – 11 Nov 2026) pada harga indikatif RM0.20. Berdasarkan prospektus audited: hasil 3 tahun CAGR 25.06% (RM104.8j → RM163.9j), tetapi PAT FY25 turun 40.5% kepada RM9.35j. Buku pesanan RM153.38j menyokong pendapatan FYE 2026–2028.',
            profitLabel: 'Profit After Tax (PAT) audited',
            scenarioLabel: 'PE ~21x pada RM0.20 (EPS pro forma FY25 0.94 sen); sasaran Sifu dikemaskini selepas harga akhir ditetapkan.',
            sopNote: 'IPO Price masih "RM[●]" dalam draf (dikemas kini 2 Nov 2026). RM0.20 dari portal MITI adalah indikatif. Gred B diberikan atas buku pesanan RM153j + pendedahan pusat data/MRO + penaja AIB, tetapi dengan amaran PAT FY25 turun dan PE agak premium.',
        },
    },

    'parkland-berhad': {
        market: 'Main Market',
        price: 0,
        priceStatus: 'not-determined',
        sector: 'Property (Integrated Township Development)',
        geography: 'Melaka',
        ib: 'Hong Leong Investment Bank Berhad',
        mitiOfferShares: 295000000,
        mitiApplicants: 31,
        mitiApplicantsDate: MITI_DATE,
        mitiApplicantsSource: 'https://sahamonline.miti.gov.my/',
        prospectusUrl: SC_PARKLAND,
        totalShares: 2360000000,
        financialProfileStatus: 'complete',
        headers: ['FYE 23', 'FYE 24', 'FYE 25', 'FPE 26'],
        historicalYears: [23, 24, 25],
        projectionHeaders: ['FPE 26'],
        rev23: 500172000,
        rev24: 617384000,
        rev25: 745792000,
        gp23: 162515000,
        gp24: 248435000,
        gp25: 308388000,
        pat23: 93242000,
        pat24: 134296000,
        pat25: 171822000,
        assets23: 1360163000,
        assets24: 1594382000,
        assets25: 1967644000,
        liab23: 865040000,
        liab24: 976693000,
        liab25: 1167367000,
        eps23: 3.72,
        eps24: 5.35,
        eps25: 6.72,
        revF: 417949000,
        gpF: 166896000,
        patF: 87006000,
        epsF: 3.43,
        ipoNewShares: 468142500,
        ipoOfferForSaleShares: 153400000,
        ipoTotalOfferShares: 621542500,
        ofs: true,
        ofsPercentage: 6.50,
        moratorium: 'Main Market Para 5.29(a) Part II Equity Guidelines: Mandatory — Excel VC 945,928,750 saham (40.1%) + Datuk Tan See Sen 142,014,400 (6.0%) dikunci 6 bulan selepas penyenaraian. Voluntary — Datuk Yap 108,816,000 (4.6%), Poh Seng Kian 92,854,700 (3.9%), Ching Ah Lai 83,573,700 (3.5%), dan pemegang saham lain.',
        priceSourceNote: `Portal MITI memaparkan "Akan Ditentukan Kemudian" untuk harga tawaran (${MITI_DATE}). Seksyen 4 draf prospektus SC (pendedahan 10 Jul 2026, dikemas kini 2 Nov 2026) masih "IPO Price: RM[●]". Kelulusan penyenaraian Pasaran Utama diperoleh 29 Okt 2026; harga akhir belum diumumkan. Kewangan FY23–FY25 + FPE26 di bawah adalah daripada Seksyen 12 Financial Information (PDF SC, 85 m/s).`,
        businessSummary: 'Parkland Berhad ialah pemaju perbandaran bersepadu dan hartanah berpangkalan di Melaka, diasaskan oleh Datuk Tan See Sen. Portfolio semasa: sembilan projek aktif merentasi 6 township & 3 projek perumahan, meliputi 779 ekar dengan GDV terkumpul RM5.9 bilion. Divisyen pembinaan dalaman (Ave Engineering & Megaform Builders diakuisisi FYE 2025) memberi integrasi menegak. Penasihat utama: Hong Leong Investment Bank Berhad.',
        predictedGrade: 'B',
        financialSourcesHTML: [
            link(SC_PARKLAND, 'Pendedahan prospektus SC: Parkland Berhad (dikemas kini 2 Nov 2026)'),
            link(SC_PARKLAND, 'Seksyen 12 — Financial Information (PDF SC, 85 m/s)'),
            link(SC_PARKLAND, 'Seksyen 4 — Details of our IPO (PDF SC, 20 m/s)'),
            link('https://www.thestar.com.my/business/business-news/2026-10-29/parkland-secures-approval-for-main-market-listing', 'The Star: Parkland secures approval for Main Market listing (29 Okt 2026)'),
            link('https://theedgemalaysia.com/node/823782', 'The Edge: Parkland — regulator green-lights Main Market IPO (29 Okt 2026)'),
        ],
        analystInsight: `<b>TAHANAN PERTAMA PASARAN UTAMA — PEMAJU BANDAR BERSEPADU (MELAKA) (TAWARAN MITI 02 NOV – 13 NOV 2026)</b><br>• <b>Harga Tawaran:</b> "Akan Ditentukan Kemudian" di portal MITI; draf SC masih "RM[●]". 295.0 juta saham dalam tawaran MITI.<br>• <b>Struktur:</b> IPO 621,542,500 saham (26.3% enlarged 2.36B) = public issue 468,142,500 (19.8%) + offer for sale 153,400,000 (6.5%). Retail 70,800,000 (3.0%): balloting 47.2j (50% Bumiputera) + EP Pink Form 23.6j + EP lain 9.94j. Institutional 550,742,500 (23.3%): PP Bumiputera MITI 141.6j + PP institusi 255.7j + OFS 153.4j. MITI tranche = 141.6j + 153.4j = 295j (12.50% enlarged) √ selari portal MITI.<br>• <b>Kewangan audited (RM'000):</b> Hasil FY23 500,172 → FY24 617,384 → FY25 745,792 (CAGR 22.2%). PAT 93,242 → 134,296 → 171,822 (CAGR 35.6%). PAT attributable to owners: 87,669 → 125,360 → 158,666. GP margin FY25 41.4%; PAT margin 23.0%. EPS pro forma enlarged 2.36B: 3.72 → 5.35 → 6.72 sen.<br>• <b>FPE 2026 (unaudited 12M Jun 2026):</b> hasil RM417.9j, PAT RM87.0j — belum boleh dibandingkan langsung dengan FY25.<br>• <b>PE:</b> Belum boleh dikira — harga akhir belum ditetapkan. Panduan: PE 10x EPS FY25 bersamaan RM0.67; 12x RM0.81; 15x RM1.01.<br>• <b>Penaja:</b> Hong Leong Investment Bank (penasihat utama); HLIB & AmInvestment Bank (ejen penempatan & penaja jamin bersama).<br>• <b>Permohonan MITI:</b> 31 pelabur setakat ${MITI_DATE}.<br>• ${link(SC_PARKLAND, 'Pendedahan prospektus SC')}`,
        fullAnalysis: `<b>DAPATAN KAJIAN — PARKLAND BERHAD (PASARAN UTAMA)</b><br><br><b>Perniagaan</b><br>Parkland Berhad (registration 202101008874 / 1409173-M) ialah pemaju perbandaran bersepadu dan hartanah berpangkalan di Melaka, diasaskan oleh Datuk Tan See Sen (Pengarah Urusan). Portfolio semasa: sembilan projek aktif merentasi 6 pembangunan township & 3 projek perumahan, meliputi 779 ekar dengan GDV terkumpul RM5.9 bilion — landasan pendapatan berbilang tahun. Parkland vertikal ke dalam divisyen pembinaan (Ave Engineering & Megaform Builders diakuisisi FYE 2025), memberi kawalan kos dan kepesaan penghantaran tetapi mendedahkan syarikat kepada volatile kos buruh &amp; bahan.<br><br><b>Struktur tawaran (Seksyen 4, PDF SC)</b><br>IPO Pasaran Utama: 621,542,500 IPO Shares (26.3% enlarged 2,360,000,000 saham).<br>• Public issue 468,142,500 saham baru (19.8% enlarged):<br>&nbsp;&nbsp;- Balloting orang awam 47,200,000 (2.0%) — sekurang-kurangnya 50% Bumiputera (Bumi 23.6j + Non-Bumi 23.6j)<br>&nbsp;&nbsp;- Eligible Persons Pink Form 23,600,000 (1.0%)<br>&nbsp;&nbsp;- EP/ESOS lain 9,940,000 (0.4%)<br>&nbsp;&nbsp;- PP institusi &amp; selected investors 255,742,500 (10.8%)<br>&nbsp;&nbsp;- PP Bumiputera diluluskan MITI 141,600,000 (6.0%)<br>• Offer for sale 153,400,000 saham sedia ada (6.5%) — penjual: Excel Venture Capital Sdn Bhd (kenderaan ~24 pemegang saham sedia ada termasuk pengasas); hasil OFS pergi kepada penjual, bukan syarikat.<br>Jumlah MITI tranches = 141.6j PP + 153.4j OFS = 295.0j (12.50% enlarged) — tepat dengan portal MITI.<br>Harga akhir belum ditetapkan dalam draf; tertakluk clawback &amp; reallocation.<br><br><b>Kewangan audited (Seksyen 12, RM'000)</b><br>Hasil: FY23 500,172 → FY24 617,384 → FY25 745,792 (CAGR 22.2%).<br>Kasar untung: 162,515 → 248,435 → 308,388; GP margin 32.5% → 40.2% → 41.4%.<br>PBT: 119,781 → 176,806 → 226,063; PAT: 93,242 → 134,296 → 171,822; PAT attributable to owners: 87,669 → 125,360 → 158,666 (NCI 5,573 → 8,936 → 13,156).<br>EPS pro forma (enlarged 2.36B): 3.72 sen → 5.35 sen → 6.72 sen.<br>Stub FPE 2026 (unaudited 12M Jun 2026): hasil RM417.9j, PAT RM87.0j (owners RM80.9j) — mencerminkan separuh tahun pertama; belum setanding FY25 12M.<br><br><b>Pipeline &amp; tanah simpanan</b><br>Land bank 779 ekar (SBU) dengan GDV terkumpul RM5.9 bilion. Ansuran usahasama Johor — pembelian balik hak pembangunan 248 ekar hub komersial/industri daripada Cahaya Bumimas Sdn Bhd (RM219.5 juta beransuran) — memberi pendedahan kepada FCDC &amp; Johor–Singapore JS-SEZ.<br><br><b>Penaja &amp; moratorium</b><br>Hong Leong Investment Bank Berhad (penasihat utama); HLIB &amp; AmInvestment Bank Berhad (ejen penempatan &amp; penaja jamin bersama). Mandatory Para 5.29(a) Part II Equity Guidelines: Excel Venture Capital Sdn Bhd 945,928,750 (40.1%) &amp; Datuk Tan See Sen 142,014,400 (6.0%) dikunci 6 bulan. Voluntary: Datuk Yap 108,816,000 (4.6%), Poh Seng Kian 92,854,700 (3.9%), Ching Ah Lai 83,573,700 (3.5%), dan pemegang saham lain.<br><br><b>Penilaian semasa</b><br>Tiada harga tawaran dalam draf &amp; MITI portal — PE &amp; sasaran Sifu belum boleh dikira. Untuk rujukan pembanding pemaju Pasaran Utama tier pertengahan pada 10x–15x PAT attributable: EPS FY25 6.72 sen bersamaan RM0.67 (10x) hingga RM1.01 (15x). Sasaran Sifu akan dimuktahirkan selepas prospektus berdaftar &amp; harga akhir diumumkan.`,
        catalysts: [
            '<strong>GDV RM5.9 bilion:</strong> Sembilan projek aktif merentasi 779 ekar — landasan pendapatan berbilang tahun.',
            '<strong>Pelebaran Johor (JS-SEZ/FCDC):</strong> Ansuran usahasama 248 ekar hub komersial/industri dengan Cahaya Bumimas (RM219.5 juta beransuran).',
            '<strong>Momentum pertumbuhan:</strong> Hasil FY23–FY25 CAGR 22.2%; PAT attributable CAGR ~34.6%; GP margin menaik (32.5% → 41.4%).',
            '<strong>Integrasi menegak:</strong> Divisyen pembinaan dalaman (Ave Engineering &amp; Megaform Builders) mengawal kos &amp; jadual penghantaran.',
            '<strong>Penaja kukuh:</strong> Hong Leong Investment Bank (penasihat utama); HLIB &amp; AmInvestment Bank (ejen penempatan &amp; penaja jamin bersama).',
            '<strong>Risiko OFS:</strong> 153.4j saham (6.5% enlarged) dijual oleh Excel Venture Capital Sdn Bhd — hasil pergi kepada penjual, bukan syarikat.',
            '<strong>Risiko tumpuan geografi:</strong> Melaka &amp; Johor, bukan Klang Valley; FPE 2026 PAT ~RM87.0j belum setanding FY25 12M.',
            `<strong>Tawaran MITI dibuka:</strong> Permohonan Bumiputera MITI 02 Nov – 13 Nov 2026; harga akhir akan diumumkan sebelum prospektus berdaftar.`,
        ],
        peers: '<strong>Asas perbandingan:</strong> Bandingkan dengan pemaju hartanah tier pertengahan di Pasaran Utama (Mah Sing, Gamuda Land, Eco World, pemaju berfokus Melaka/Johor). Tanpa harga akhir, PE dan P/B belum boleh disahkan; sasaran Sifu ditangguh. Julat wajar pemaju dengan land bank & margin setanding: 10x–15x PE EPS FY25 6.72 sen.',
        fundUse: 'Hasil IPO (public issue) untuk: (i) ansuran usahasama tanah Johor (Cahaya Bumimas Sdn Bhd, RM219.5 juta untuk hak pembangunan 248 ekar), (ii) pembelian tanah di Semenanjung Malaysia (belum dikenal pasti spesifik), (iii) modal kerja, (iv) kos pembangunan projek dirancang &amp; sedang berjalan (sehingga RM1.2 bilion). Hasil OFS (153.4j saham) pergi sepenuhnya kepada Excel Venture Capital Sdn Bhd, bukan syarikat.',
        financialReview: {
            title: 'Tawaran MITI dibuka; harga tawaran belum ditetapkan.',
            summary: 'Parkland Berhad (Main Market) dalam permohonan MITI 02 Nov – 13 Nov 2026 tanpa harga tawaran akhir. Seksyen 12 PDF SC: hasil FY23–FY25 CAGR 22.2% (RM500.2j → RM745.8j), PAT attributable pemilik CAGR ~34.6% (RM87.7j → RM158.7j), GP margin FY25 41.4%, PAT margin 23.0%, EPS pro forma FY25 6.72 sen.',
            profitLabel: 'Profit After Tax (PAT) audited',
            scenarioLabel: 'Sasaran harga Sifu ditangguh sehingga harga tawaran akhir diumumkan. Pada EPS FY25 6.72 sen, PE 10x bersamaan RM0.67; 12x RM0.81; 15x RM1.01.',
            sopNote: 'Harga "Akan Ditentukan Kemudian" di portal MITI; "IPO Price: RM[●]" dalam draf SC (dikemas kini 2 Nov 2026). Kewangan FY23–FY25 + FPE26 lengkap; penilaian penuh (PE &amp; sasaran Sifu) menunggu prospektus berdaftar.',
        },
    },
};

function main() {
    const { data, overrides } = readData(ROOT);
    let changed = 0;

    for (const [id, patch] of Object.entries(PATCHES)) {
        const ipo = data.find(x => x.id === id);
        if (!ipo) throw new Error(`Rekod tidak dijumpai dalam data.json: ${id}`);

        let touched = 0;
        for (const [key, value] of Object.entries(patch)) {
            if (JSON.stringify(ipo[key]) === JSON.stringify(value)) continue;
            ipo[key] = value;
            touched++;
        }
        if (!touched) { console.log(`   (tiada perubahan) ${ipo.companyName}`); continue; }

        // Kekalkan nilai manual yang sama dalam overrides.json supaya tidak dipulangkan
        // oleh apply-overrides.js pada runs akan datang.
        overrides[id] ||= {};
        Object.assign(overrides[id], patch);

        console.log(`   ✨ ${ipo.companyName} — ${touched} medan dikemas kini (stage ${ipo.stage}, MITI ${ipo.mitiOpenDate} → ${ipo.mitiCloseDate}, ${ipo.mitiApplicants} pemohon)`);
        changed++;
    }

    if (!changed) { console.log('✅ Semua rekod MITI November sudah terkini. Tiada penulisan dibuat.'); return; }

    saveData(ROOT, data, overrides);
    console.log(`\n🎉 ${changed} rekod dikemas kini → data.json, data.js, data_export.js, overrides.json.`);
}

if (require.main === module) {
    try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
