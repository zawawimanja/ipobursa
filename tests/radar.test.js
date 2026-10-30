const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rules = require('../lib/ipo-rules');

const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
const openingHelper = source.slice(source.indexOf('function getOpenPerformance('), source.indexOf('function getBestSortDate('));
const radar = source.slice(source.indexOf('function renderTodayActionRadar('), source.indexOf('function renderMitiCountdownStrip('));
const listed = extra => ({ id: 'ecosys', companyName: 'EcoSys (Malaysia) Berhad',
    stage: 5, listingDate: '14-Oct-2026', price: 0.27, openPrice: 0.7,
    currentPrice: 0.8, performance: '+196.30%', os: 206.7, ...extra });

function render(records, today = new Date(2026, 9, 14), now = null) {
    const container = { style: {}, innerHTML: '' };
    const sandbox = {
        ipoData: records, document: { getElementById: () => container },
        malaysiaToday: () => today,
        parseFlexDate: value => {
            const parts = rules.dateParts(value);
            return parts ? new Date(parts.year, parts.month, parts.day) : null;
        },
        getIpoGrade: () => ({ grade: 'A' }), isCdCollapsed: () => false,
        shariahBadge: () => '', IpoRules: rules,
        deadlineLabel: (ipo, kind = 'public') => {
            const deadline = rules.getDeadline(ipo, kind);
            return deadline ? deadline.toLocaleTimeString('en-US', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit', hour12: true }) : 'TBA';
        }
    };
    const clock = now === null ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime() : now;
    vm.runInNewContext(openingHelper + radar + `\nrenderTodayActionRadar(${clock});`, sandbox);
    return container.innerHTML;
}

test('debut radar uses opening return even when current performance differs', () => {
    const html = render([listed()]);
    assert.match(html, /Harga Debut:[\s\S]*?RM 0\.70[\s\S]*?\+159\.26%/);
    assert.doesNotMatch(html, /196\.30%/);
});

test('unknown debut is explicit rather than substituting a current quote', () => {
    const html = render([listed({ openPrice: null })]);
    assert.match(html, /Harga Debut:[\s\S]*?Belum disahkan/);
    assert.doesNotMatch(html, /RM 0\.80|196\.30%|\+0\.00%/);
});

test('flat and fractional-sen debut prices retain their actual results', () => {
    const flat = render([listed({ price: 0.315, openPrice: 0.315 })]);
    assert.match(flat, /RM 0\.315[\s\S]*?\+0\.00%/);
    const red = render([listed({ price: 0.3, openPrice: 0.29 })]);
    assert.match(red, /RM 0\.29[\s\S]*?-3\.33%/);
});

test('upcoming Post-MITI listing navigates to the tab containing the record', () => {
    const html = render([listed({ stage: 6, listingDate: '21-Oct-2026' })]);
    assert.match(html, /navigateToIpo\('ecosys', 6\)/);
});

test('NWE debut leaves the daily radar after its listing date', () => {
    const nwe = listed({ id: 'nwe-resources-group-berhad',
        companyName: 'NWE Resources Group Berhad', listingDate: '21-Oct-2026' });
    const listingDay = render([nwe], new Date(2026, 9, 21));
    assert.match(listingDay, /DEBUT PENYENARAIAN HARI INI/);
    assert.match(listingDay, /NWE Resources Group Berhad/);
    assert.equal(render([nwe], new Date(2026, 9, 22)), '');
});

test('past debuts stay out while today and upcoming listings remain visible', () => {
    const html = render([
        listed({ id: 'yesterday', companyName: 'Yesterday IPO', listingDate: '21-Oct-2026' }),
        listed({ id: 'older', companyName: 'Older IPO', listingDate: '20-Oct-2026' }),
        listed({ id: 'today', companyName: 'Today IPO', listingDate: '22-Oct-2026' }),
        listed({ id: 'upcoming', companyName: 'Upcoming IPO', stage: 4, listingDate: '23-Oct-2026' })
    ], new Date(2026, 9, 22));
    assert.doesNotMatch(html, /Yesterday IPO|Older IPO|DISENARAIKAN SEMALAM/);
    assert.match(html, /Today IPO/);
    assert.match(html, /Upcoming IPO/);
    assert.match(html, /navigateToIpo\('upcoming', 4\)/);
});

// Regression: FAMIERA and AQUAWALK are listed 2025 IPOs whose open/close dates were stamped with
// the current year by a KLSE past card. They produced phantom "awam dibuka/tutup hari ini" cards.
test('a listed IPO with a year-slipped application date raises no open or close event', () => {
    const slipped = { id: 'famiera', companyName: 'FAMIERA', stage: 5, status: 'Listed', market: 'ACE Market',
        price: 0.25, openingDate: '21-Oct-2026', closingDate: '30-Oct-2026', listingDate: '12-Nov-2025' };
    assert.equal(render([slipped], new Date(2026, 9, 30)), '');
});

test('an IPO still in play is never announced as opening or closing after it listed', () => {
    const leaked = { id: 'future', companyName: 'Leaked Dates', stage: 3, status: 'Application Open',
        market: 'ACE Market', price: 0.3, openingDate: '28-Oct-2027', closingDate: '30-Oct-2027', listingDate: '12-Nov-2026' };
    const html = render([leaked], new Date(2026, 9, 30));
    assert.doesNotMatch(html, /Leaked Dates/);
});

test('MITI closing today is announced even when the IPO already went public', () => {
    const ipo = { id: 'big-caring-group-bhd', companyName: 'Big Caring Group Bhd', stage: 3,
        status: 'Application Open', market: 'Main Market', price: 1.08,
        openingDate: '29-Oct-2026', closingDate: '05-Nov-2026', listingDate: '19-Nov-2026',
        mitiOpenDate: '26-Oct-2026', mitiCloseDate: '30-Oct-2026' };
    const html = render([ipo], new Date(2026, 9, 30));
    assert.match(html, /PERMOHONAN MITI TUTUP HARI INI/);
    assert.match(html, /navigateToIpo\('big-caring-group-bhd', 3\)/);
    assert.doesNotMatch(html, /navigateToIpo\('big-caring-group-bhd', 2\)/);
});

test('the MITI payment deadline is surfaced on the day money is due and marked passed after', () => {
    const ipo = { id: 'big-caring-group-bhd', companyName: 'Big Caring Group Bhd', stage: 3,
        status: 'Application Open', market: 'Main Market', price: 1.08, closingDate: '05-Nov-2026',
        listingDate: '19-Nov-2026', mitiOpenDate: '14-Aug-2026', mitiCloseDate: '24-Aug-2026',
        mitiAllocationRate: 100, mitiPaymentDeadline: '2026-10-30T17:00:00+08:00' };
    const today = new Date(2026, 9, 30);
    const before = render([ipo], today, Date.parse('2026-10-30T08:00:00Z'));
    assert.match(before, /💰 BAYARAN MITI TUTUP HARI INI \(17:00 MYT\)/);
    assert.match(before, /Peruntukan MITI: <strong style="color:#34d399;">100%<\/strong>/);
    const after = render([ipo], today, Date.parse('2026-10-30T09:30:00Z'));
    assert.match(after, /⛔ BAYARAN MITI SUDAH LEPAS \(17:00 MYT\)/);
    assert.doesNotMatch(after, /BAYARAN MITI TUTUP HARI INI/);
});

test('a payment deadline quoted without a timezone is never guessed into an event', () => {
    const ipo = { id: 'keb', companyName: 'KEB Berhad', stage: 3, status: 'Application Open',
        market: 'ACE Market', price: 0.35, closingDate: '02-Nov-2026', listingDate: '12-Nov-2026',
        mitiPaymentDeadline: '2026-10-30' };
    const html = render([ipo], new Date(2026, 9, 30));
    // Its public closing date is still upcoming, but no payment event may be invented for it.
    assert.doesNotMatch(html, /BAYARAN MITI|Bayaran MITI/);
});
