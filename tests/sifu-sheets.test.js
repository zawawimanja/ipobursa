const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../sifu-sheets.html'), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).find(source => source.includes('function calculateSheet()'));

function load(records, selected = records[0].id) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            value: '', innerHTML: '', innerText: '', placeholder: '', style: {}, className: '',
            setAttribute(name, value) { this[name] = value; }
        });
        return elements.get(id);
    };
    for (const match of html.matchAll(/<input\b[^>]*>/g)) {
        const id = match[0].match(/\bid="([^"]+)"/)?.[1];
        const value = match[0].match(/\bvalue="([^"]*)"/)?.[1];
        if (id) element(id).value = value || '';
    }
    element('sheet-stock-select').value = selected;
    const head = element('table-head');
    const sandbox = {
        IPO_DATA: records, URL, URLSearchParams, console,
        window: { location: { href: 'https://example.test/sifu-sheets.html', search: '' }, history: { replaceState() {} } },
        document: { getElementById: element, querySelector: () => head, querySelectorAll: () => [] }
    };
    vm.runInNewContext(script, sandbox);
    sandbox.loadSelectedStock();
    return { element, sandbox, head };
}

const bigCaring = extra => ({
    id: 'big-caring-group-bhd', companyName: 'Big Caring Group Bhd', price: 1.08,
    stage: 6, market: 'Main Market', sector: 'Healthcare (Pharmacy)', predictedGrade: 'B',
    totalShares: 7381835680, targetPe: 30, financialProfileStatus: 'incomplete',
    headers: ['FYE 23', 'FYE 24', 'FYE 25', 'FYE 26'], historicalYears: [23, 24, 25],
    projectionHeaders: ['FY26 — PATAMI belum disahkan', 'FY27 — belum disahkan'],
    pat23: null, pat24: null, pat25: 122300000, patF: null, patF1: null,
    rev23: 1100000000, rev25: 3410000000, groupPat26: 231800000,
    valuationScenarios: [{ multiple: 25, price: 0.785035 }, { multiple: 30, price: 0.942042 }],
    catalysts: ['PATAMI FY26 belum disahkan.'], peers: 'Bandingkan dengan runcit farmasi.',
    ...extra
});

test('Big Caring uses the MITI offer price and verified FY25 PATAMI for historical EPS and PE', () => {
    const { element, head } = load([bigCaring()]);
    assert.equal(element('inp-price').value, '1.08');
    assert.equal(element('inp-pat-25').value, '122300000');
    assert.equal(element('td-eps-25').innerText, '1.66');
    assert.equal(element('td-per-25').innerText, '65.19');
    assert.match(element('sheet-profit-label').innerText, /PATAMI/);
    assert.match(head.innerHTML, /FYE 24 \(Hist\)/);
    assert.match(head.innerHTML, /FYE 25 \(Hist\)/);
    assert.doesNotMatch(head.innerHTML, /FYE 26 \(Hist\)/);
    assert.match(head.innerHTML, /FY26 — PATAMI belum disahkan/);
});

test('missing shareholder earnings do not create zero-valued targets or an overvalued verdict', () => {
    const { element } = load([bigCaring()]);
    for (const id of ['inp-pat-23', 'inp-pat-24', 'inp-pat-fye-f', 'inp-pat-fye-f1', 'inp-eps-growth-f']) {
        assert.equal(element(id).value, '', id);
    }
    for (const id of ['td-eps-23', 'td-eps-fye-f', 'td-per-fye-f', 'td-peg-fye-f', 'td-val1-fye-f',
        'td-val1-fye-f1', 'td-v3-db', 'td-v5-db', 'td-buy1-fye-f', 'td-equity-25', 'td-roe-25']) {
        assert.equal(element(id).innerText, '—', id);
    }
    const notice = element('sheet-data-notice').innerHTML;
    assert.match(notice, /group PAT RM231\.8 juta/);
    assert.match(notice, /bukan nilai wajar disahkan atau ramalan debut/);
    assert.match(notice, /25x: RM0\.785[\s\S]*30x: RM0\.942/);
    assert.match(element('sheet-verdict-box').innerHTML, /PENILAIAN BELUM LENGKAP/);
    assert.doesNotMatch(element('sheet-verdict-box').innerHTML, /OVERVALUED|ZON BELI|ZON WATCHLIST/);
    assert.doesNotMatch(element('sifu-edu-warning-card').innerHTML, /Swing|DCA|pilihan yang baik/);
    assert.equal(element('sifu-sop-reference').style.display, 'none');
    assert.match(element('sifu-sop-dynamic-content').innerHTML, /Peruntukan penuh MITI bukan ukuran yang sama dengan OS awam/);
});

test('an unknown IPO price stays blank instead of using RM0.50 or a current quote', () => {
    const { element } = load([{ id: 'unknown', companyName: 'Unknown IPO', price: 0, currentPrice: 9.99, stage: 1, predictedGrade: 'B' }]);
    assert.equal(element('inp-price').value, '');
    assert.equal(element('inp-price').placeholder, 'Belum disahkan');
    assert.match(element('sheet-data-notice').innerHTML, /Harga IPO belum disahkan/);
    assert.equal(element('td-market-cap').innerText, '—');
    assert.equal(element('td-val1-fye-f').innerText, '—');
    assert.match(element('sheet-verdict-box').innerHTML, /PENILAIAN BELUM LENGKAP/);
    assert.doesNotMatch(element('sheet-catalysts-content').innerHTML, /RM 0\.50|RM 9\.99|RM 0\.00/);
    assert.doesNotMatch(element('sifu-edu-warning-card').innerHTML, /Swing|DCA/);
});

test('the Sunmed comparison is a separate scrollable table with escaped content and source links', () => {
    const { element } = load([bigCaring({ researchComparison: {
        title: 'Big Caring & SUNMED', columns: ['Perkara', 'SUNMED', 'Big Caring'],
        rows: [['Pembukaan debut', 'RM1.70 (+17.24%)', 'Belum listing <script>']],
        note: 'Prestasi SUNMED tidak meramalkan Big Caring.',
        sources: [{ label: 'Prospektus', url: 'https://example.test/prospectus' }, { label: 'Bad', url: 'javascript:alert(1)' }]
    } })]);
    const comparison = element('sheet-research-comparison');
    assert.equal(comparison.style.display, 'block');
    assert.match(comparison.innerHTML, /overflow-x:auto/);
    assert.match(comparison.innerHTML, /Leret ke kiri\/kanan untuk melihat semua lajur/);
    assert.match(comparison.innerHTML, /position:sticky;left:0/);
    assert.match(comparison.innerHTML, /RM1\.70 \(\+17\.24%\)/);
    assert.match(comparison.innerHTML, /Belum listing &lt;script&gt;/);
    assert.match(comparison.innerHTML, /https:\/\/example.test\/prospectus/);
    assert.doesNotMatch(comparison.innerHTML, /javascript:/);
});

test('a complete profile keeps its calculator and clears incomplete-profile notices on switching stocks', () => {
    const complete = { id: 'complete', companyName: 'Complete IPO', price: 1, totalShares: 100000000,
        stage: 3, targetPe: 15, headers: ['FYE 23', 'FYE 24', 'FYE 25', 'FY26 forecast', 'FY27 forecast'],
        historicalYears: [23, 24, 25], predictedGrade: 'B' };
    for (const suffix of ['23', '24', '25', 'F', 'F1']) Object.assign(complete, {
        [`rev${suffix}`]: 100000000, [`pat${suffix}`]: 10000000,
        [`gp${suffix}`]: 30000000, [`assets${suffix}`]: 100000000, [`liab${suffix}`]: 50000000
    });
    const { element, sandbox } = load([bigCaring(), complete]);
    element('sheet-stock-select').value = 'complete';
    sandbox.loadSelectedStock();
    assert.equal(element('sheet-data-notice').style.display, 'none');
    assert.equal(element('sheet-research-comparison').style.display, 'none');
    assert.equal(element('sheet-profit-label').innerText, 'Profit After Tax (PAT)');
    assert.equal(element('td-val1-fye-f').innerText, 'RM 1.50');
    assert.match(element('sheet-verdict-box').innerHTML, /ZON BELI/);
    assert.equal(element('td-per-fye-f').innerText, '10.00');
    assert.equal(element('sifu-sop-reference').style.display, '');
});

test('sync counts hide unavailable values and preserve a real zero count', () => {
    const { element, sandbox } = load([bigCaring()]);
    sandbox.SYNC_STATUS = { lastSync: '22 Oct 2026' };
    sandbox.window.location.search = '?stock=big-caring-group-bhd';
    sandbox.window.onload();
    assert.equal(element('sync-status-enriched').innerHTML, '');
    assert.equal(element('sync-status-enriched').style.display, 'none');
    assert.equal(element('sync-status-total').innerHTML, '');
    sandbox.SYNC_STATUS.enrichedCount = 0;
    sandbox.SYNC_STATUS.totalIpos = 52;
    sandbox.window.onload();
    assert.equal(element('sync-status-enriched').style.display, '');
    assert.match(element('sync-status-enriched').innerHTML, />0<\/strong>/);
    assert.match(element('sync-status-total').innerHTML, /52 IPOs/);
});

test('issuer review metadata uses verified history without inventing a missing financial profile', () => {
    const record = { id: 'research-fixture', companyName: 'Research Fixture', price: 0.425,
        totalShares: 100000000, stage: 3, financialProfileStatus: 'incomplete',
        historicalYears: [22, 23, 24], pat24: 3000000, targetPe: 20,
        // A stale forecast must not become an automatic target for an incomplete profile.
        patF: 9000000, patF1: 12000000,
        projectionHeaders: ['FY25 — unjuran belum disahkan', 'FY26 — unjuran belum disahkan'],
        valuationScenarios: [{ multiple: 20, price: 0.6 }],
        financialReview: { title: 'Unjuran belum tersedia', summary: 'PATAMI FY24 telah disahkan; unjuran belum disahkan.',
            profitLabel: 'PATAMI sejarah', historicalPe: { year: 24, patami: 3000000 },
            scenarioLabel: 'Senario andaian atas PATAMI sejarah, bukan sasaran.',
            sopNote: 'Sahkan harga dan permintaan sebelum membuat keputusan.' }
    };
    const { element, head } = load([record]);
    assert.equal(element('inp-price').value, '0.425');
    assert.equal(element('inp-total-shares').value, '100000000');
    assert.equal(element('td-market-cap').innerText, 'RM 42,500,000');
    assert.equal(element('inp-rev-23').value, '');
    assert.equal(element('inp-pat-25').value, '3000000');
    assert.equal(element('td-eps-25').innerText, '3.00');
    assert.equal(element('td-per-25').innerText, '14.17');
    assert.equal(element('sheet-profit-label').innerText, 'PATAMI sejarah');
    assert.equal(element('inp-pat-fye-f').value, '');
    assert.equal(element('td-val1-fye-f').innerText, '—');
    assert.match(head.innerHTML, /FYE 24 \(Hist\)/);
    assert.match(head.innerHTML, /FY25 — unjuran belum disahkan/);
    assert.match(element('sheet-data-notice').innerHTML, /Unjuran belum tersedia/);
    assert.match(element('sheet-data-notice').innerHTML, /Senario andaian atas PATAMI sejarah/);
    assert.doesNotMatch(element('sheet-data-notice').innerHTML, /group PAT|RM231\.8|PATAMI FY26/);
    assert.match(element('sifu-sop-dynamic-content').innerHTML, /Sahkan harga dan permintaan/);
    assert.equal(element('sifu-sop-reference').style.display, 'none');
    assert.match(element('sheet-verdict-box').innerHTML, /PENILAIAN BELUM LENGKAP/);
});

test('a generic incomplete record keeps absent price, shares and earnings unknown', () => {
    const { element } = load([{ id: 'missing-profile', companyName: 'Missing Profile',
        price: 0, currentPrice: 3, financialProfileStatus: 'incomplete', stage: 6 }]);
    for (const id of ['inp-price', 'inp-total-shares', 'inp-rev-23', 'inp-pat-23', 'inp-pat-fye-f']) {
        assert.equal(element(id).value, '', id);
    }
    assert.match(element('sheet-data-notice').innerHTML, /Harga IPO belum disahkan/);
    assert.match(element('sheet-data-notice').innerHTML, /Unjuran keuntungan pemegang saham/);
    assert.doesNotMatch(element('sheet-data-notice').innerHTML, /group PAT|FY26|231\.8/);
    assert.doesNotMatch(element('sifu-sop-dynamic-content').innerHTML, /FY26|Swing|DCA/);
    assert.equal(element('td-market-cap').innerText, '—');
    assert.equal(element('td-val1-fye-f').innerText, '—');
});

test('SKA research renders its actual capital and marks secondary earnings without inventing a target', () => {
    const record = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8')).find(x => x.id === 'ska-capital-berhad');
    const { element } = load([record]);
    assert.equal(element('inp-price').value, '0.43');
    assert.equal(element('td-market-cap').innerText, 'RM 385,065,000');
    assert.equal(element('td-per-25').innerText, '13.31');
    assert.match(element('sheet-profit-label').innerText, /sekunder/);
    assert.equal(element('sheet-target-pe').value, '');
    assert.equal(element('sheet-pe-status').innerText, 'Belum disahkan');
    assert.match(element('sheet-data-notice').innerHTML, /PDF kewangan asal belum berjaya diakses/);
    assert.equal(element('inp-pat-fye-f').value, '');
    assert.equal(element('td-val1-fye-f').innerText, '—');
    assert.match(element('sheet-verdict-box').innerHTML, /PENILAIAN BELUM LENGKAP/);
});

test('MyDCD research separates reported MITI price and draft historical PATAMI from missing forecasts', () => {
    const record = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8')).find(x => x.id === 'mydcd-berhad');
    const { element } = load([record]);
    assert.equal(element('inp-price').value, '0.56');
    assert.equal(element('td-market-cap').innerText, 'RM 1,004,640,000');
    assert.equal(element('td-per-25').innerText, '25.44');
    assert.match(element('sheet-data-notice').innerHTML, /tawaran MITI pengguna/);
    assert.match(element('sheet-profit-label').innerText, /PATAMI — draf Bursa/);
    assert.equal(element('inp-pat-fye-f').value, '');
    assert.equal(element('inp-rev-fye-f').value, '');
    assert.equal(element('td-val1-fye-f').innerText, '—');
    assert.doesNotMatch(element('sheet-data-notice').innerHTML, /group PAT|PATAMI FY26 belum/);
});
