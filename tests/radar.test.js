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

function render(records) {
    const container = { style: {}, innerHTML: '' };
    const sandbox = {
        ipoData: records, document: { getElementById: () => container },
        malaysiaToday: () => new Date(2026, 9, 14),
        parseFlexDate: value => {
            const parts = rules.dateParts(value);
            return parts ? new Date(parts.year, parts.month, parts.day) : null;
        },
        getIpoGrade: () => ({ grade: 'A' }), isCdCollapsed: () => false,
        shariahBadge: () => '', IpoRules: rules
    };
    vm.runInNewContext(openingHelper + radar + '\nrenderTodayActionRadar();', sandbox);
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
