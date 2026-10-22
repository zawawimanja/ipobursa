const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const cheerio = require('cheerio');
const { parseHistoricalOpen } = require('../scrape-i3');

const NOW = Date.parse('2026-10-22T09:30:00+08:00');

const HISTORICAL_HTML = `var dtdata = [["2026-10-22","0.20","0.21","0.19","0.195","<span class='down fw-bold'>-0.025 (-11.4%)</span>","1,000","",""],["2026-10-21","0.22","0.24","0.185","0.20","<span class='up fw-bold'>0.00 (0.00%)</span>","99,829,000","",""]];`;

// i3 publishes the label and the value as adjacent <p> cells; no Open row on later days.
const OVERVIEW_HTML = `<div class="row"><div class="col-6"><p>Last Price</p><p>0.195</p></div>` +
    `<div class="col-6"><a href="/web/stock/historical-chart/0478">Historical chart</a></div></div>`;

async function runScraper(t, records, pages) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ipo-debut-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(records));
    const requested = [];
    const statuses = [];
    const sandbox = {
        require: name => {
            if (name === 'fs') return fs;
            if (name === 'path') return path;
            if (name === 'cheerio') return cheerio;
            if (name === 'axios') return { get: async url => {
                requested.push(url);
                const data = pages[url];
                if (!data) throw new Error('Source unavailable');
                return { data };
            } };
            if (name === './lib/sync-health') return { updateSourceStatus: (source, status) => statuses.push(status) };
            if (name === './lib/ipo-rules') return require('../lib/ipo-rules');
            throw new Error(`Unexpected dependency: ${name}`);
        },
        __dirname: root,
        module: { exports: {} },
        process: { exitCode: 0 },
        console: { log() {}, error() {} },
        setTimeout: callback => callback()
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'scrape-i3.js'), 'utf8'), sandbox);
    await sandbox.module.exports.scrapeI3PricesAxios({ now: NOW });
    return { records: JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8')), requested, statuses };
}

test('historical chart rows expose the listing-day open price', () => {
    assert.equal(parseHistoricalOpen(HISTORICAL_HTML, '21-Oct-2026', NOW), 0.22);
    assert.equal(parseHistoricalOpen(HISTORICAL_HTML, '2026-10-21', NOW), 0.22);
    assert.equal(parseHistoricalOpen(HISTORICAL_HTML, '19-Oct-2026', NOW), null);
    assert.equal(parseHistoricalOpen('<html>no table</html>', '21-Oct-2026', NOW), null);
    assert.equal(parseHistoricalOpen({ price: '0.195' }, '21-Oct-2026', NOW), null);
    assert.equal(parseHistoricalOpen(HISTORICAL_HTML, '', NOW), null);
});

test('a debut missed on listing day is backfilled from the historical chart', async t => {
    const result = await runScraper(t, [
        { id: 'demo', companyName: 'Demo Berhad', symbol: 'DEMO', stage: 5, year: 2026, price: 0.20, listingDate: '21-Oct-2026' }
    ], {
        'https://klse.i3investor.com/web/stock/overview/DEMO': OVERVIEW_HTML,
        'https://klse.i3investor.com/web/stock/historical-chart/0478': HISTORICAL_HTML
    });
    assert.equal(result.records[0].openPrice, 0.22);
    assert.equal(result.records[0].currentPrice, 0.195);
    assert.equal(result.records[0].performance, '-2.50%');
    assert.deepEqual(result.requested, [
        'https://klse.i3investor.com/web/stock/overview/DEMO',
        'https://klse.i3investor.com/web/stock/historical-chart/0478'
    ]);
    assert.equal(result.statuses.at(-1).status, 'success');
});

test('a company name stored as a symbol is skipped instead of fetching i3', async t => {
    const result = await runScraper(t, [
        { id: 'demo', companyName: 'Demo Berhad', symbol: 'Demo Berhad', stage: 5, year: 2026, price: 0.20, listingDate: '21-Oct-2026' }
    ], { 'https://klse.i3investor.com/web/stock/overview/Demo Berhad': OVERVIEW_HTML });
    assert.deepEqual(result.requested, []);
    assert.equal(result.records[0].currentPrice, undefined);
});

test('a known debut or an old listing never pays for a historical lookup', async t => {
    const known = await runScraper(t, [
        { id: 'demo', companyName: 'Demo Berhad', symbol: 'DEMO', stage: 5, year: 2026, price: 0.20,
            listingDate: '21-Oct-2026', openPrice: 0.22 }
    ], { 'https://klse.i3investor.com/web/stock/overview/DEMO': OVERVIEW_HTML });
    assert.equal(known.records[0].openPrice, 0.22);
    assert.equal(known.requested.length, 1);

    const old = await runScraper(t, [
        { id: 'lama', companyName: 'Lama Berhad', symbol: 'LAMA', stage: 5, year: 2026, price: 0.20,
            listingDate: '01-Oct-2026' }
    ], { 'https://klse.i3investor.com/web/stock/overview/LAMA': OVERVIEW_HTML });
    assert.equal(old.records[0].openPrice, undefined);
    assert.equal(old.requested.length, 1);
});
