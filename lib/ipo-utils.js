/**
 * lib/ipo-utils.js — helper kongsi untuk skrip sync (Node).
 *
 * - normalizeName / isSafeFuzzyMatch : padanan nama syarikat yang tak tamak
 *   (elak "Company" padan dengan "XYZ Company Berhad").
 * - isJunkCompanyName : tapis tajuk/heading HTML yang tersalah dianggap nama
 *   syarikat (cth. "Features", "Others", "Company").
 * - toDisplayDate : format tarikh standard projek = DD-Mon-YYYY (cth. 09-Oct-2026).
 * - toIsoDate     : tukar mana-mana format sokongan → YYYY-MM-DD (untuk banding).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_IDX = MONTHS.reduce((acc, m, i) => { acc[m.toLowerCase()] = i; return acc; }, {});

function normalizeName(name) {
    return (name || '').toLowerCase()
        .replace(/berhad|bhd|group|holdings|corp/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// Padanan substring hanya selamat bila kedua-dua nama cukup panjang.
const MIN_FUZZY_LEN = 5;
function isSafeFuzzyMatch(a, b) {
    if (!a || !b) return false;
    if (a.length < MIN_FUZZY_LEN || b.length < MIN_FUZZY_LEN) return false;
    return a.includes(b) || b.includes(a);
}

const JUNK_NAMES = new Set([
    'features', 'feature', 'others', 'other', 'company', 'companies', 'overview',
    'details', 'detail', 'summary', 'ipo', 'ipos', 'about', 'contact', 'home',
    'news', 'more', 'prospectus', 'miti', 'future', 'upcoming', 'listing',
    'market', 'sector', 'price', 'tba', 'na', 'n/a', 'none', 'unknown', 'name',
    'business', 'financials', 'highlights', 'description', 'info', 'information'
]);

function isJunkCompanyName(name) {
    const raw = (name || '').trim();
    if (raw.length < 3) return true;
    if (!/[a-z]/i.test(raw)) return true;
    return JUNK_NAMES.has(raw.toLowerCase());
}

function pad2(n) { return String(n).padStart(2, '0'); }

/** Pulangkan { y, m (0-11), d } atau null. Sokong YYYY-MM-DD[...], D-Mon-YYYY, DD Mon YYYY. */
function parseDateParts(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return { y: +m[1], m: +m[2] - 1, d: +m[3] };
    m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s,]+(\d{4})$/);
    if (m && MONTH_IDX[m[2].toLowerCase()] !== undefined) {
        return { y: +m[3], m: MONTH_IDX[m[2].toLowerCase()], d: +m[1] };
    }
    return null;
}

function toDisplayDate(str) {
    const p = parseDateParts(str);
    if (!p) return null;
    return `${pad2(p.d)}-${MONTHS[p.m]}-${p.y}`;
}

function toIsoDate(str) {
    const p = parseDateParts(str);
    if (!p) return null;
    return `${p.y}-${pad2(p.m + 1)}-${pad2(p.d)}`;
}

/** Date tempatan (tengah malam) — selamat untuk perbandingan hari. */
function toLocalDate(str) {
    const p = parseDateParts(str);
    return p ? new Date(p.y, p.m, p.d) : null;
}

module.exports = {
    MONTHS,
    normalizeName,
    isSafeFuzzyMatch,
    isJunkCompanyName,
    parseDateParts,
    toDisplayDate,
    toIsoDate,
    toLocalDate
};
