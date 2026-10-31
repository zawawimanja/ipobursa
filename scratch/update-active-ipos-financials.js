/**
 * scratch/update-active-ipos-financials.js
 *
 * Mengisi data kewangan lengkap bagi IPO aktif di dashboard:
 * 1. Big Caring Group Bhd (BCG) — data penuh prospektus berdaftar (29-Okt-2026):
 *    FY24, FY25, FY26 untuk Revenue, GP, PATAMI, Total Assets, Total Liabilities.
 * 2. KEB Berhad — mengisi pe: 5.98x berdasarkan harga RM0.35 dan EPS FY25 5.85 sen.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));

// ── 1. Big Caring Group Bhd ───────────────────────────────────────────────────
const bcgFinancials = {
    rev23: 1110700000,
    rev24: 2171400000,
    rev25: 3412000000,
    rev26: 4024000000,

    gp23: 232400000,
    gp24: 465100000,
    gp25: 845800000,
    gp26: 1212400000,

    pat23: 37000000,
    pat24: 37200000,
    pat25: 122300000,
    pat26: 191600000,

    assets23: 727613000,
    assets24: 2460246000,
    assets25: 3170871000,
    assets26: 3476521000,

    liab23: 568481000,
    liab24: 2040957000,
    liab25: 2642090000,
    liab26: 2917391000,

    eps23: 0.5012,
    eps24: 0.5039,
    eps25: 1.6568,
    eps26: 2.5956,

    headers: [
        'FYE 24',
        'FYE 25',
        'FYE 26 — audit prospektus',
        'FY27 — belum disahkan',
        'FY28 — belum disahkan'
    ],
    historicalYears: [24, 25, 26],
    projectionHeaders: [
        'FY27 — belum disahkan',
        'FY28 — belum disahkan'
    ],

    financialEvidenceStatus: 'audited-prospectus',
    financialReviewDate: '29-Oct-2026',
    priceSourceNote: 'RM1.08 ialah harga runcit yang disahkan dalam prospektus berdaftar Big Caring Group Bhd (29 Okt 2026). Harga runcit akhir ialah yang lebih rendah antara RM1.08 atau harga institusi yang ditetapkan pada 10 Nov 2026.'
};

const bcg = data.find(x => x.id === 'big-caring-group-bhd');
if (bcg) {
    Object.assign(bcg, bcgFinancials);
    overrides['big-caring-group-bhd'] = Object.assign({}, overrides['big-caring-group-bhd'], bcgFinancials);
    console.log('✅ Kemas kini kewangan Big Caring Group Bhd selesai.');
}

// ── 2. KEB Berhad ─────────────────────────────────────────────────────────────
const keb = data.find(x => x.id === 'keb-berhad');
if (keb) {
    // PE atas EPS FY25 5.85 sen pada harga RM0.35 = 5.98x
    const kebUpdate = { pe: 5.98 };
    Object.assign(keb, kebUpdate);
    overrides['keb-berhad'] = Object.assign({}, overrides['keb-berhad'], kebUpdate);
    console.log('✅ Kemas kini PE KEB Berhad selesai (5.98x).');
}

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

console.log('Semua fail JSON dikemas kini.');

