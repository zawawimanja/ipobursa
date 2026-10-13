const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { applyPublicRecords } = require('../sync-public-ipos');
const { syncApi, applyUpcoming } = require('../sync-isaham-api');
const { autoPromoteIPOs, publishScrapeStatus } = require('../sync-isaham');
const { readSyncStatus } = require('../lib/sync-health');

const NOW = Date.parse('2026-10-14T10:00:00+08:00');
const HOUR = 60 * 60 * 1000;

function temporaryProject(t, data = [{ id: 'demo', companyName: 'Demo Berhad', stage: 6, price: 1 }]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ipobursa-pipeline-'));
    t.after(() => {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith('ipobursa-pipeline-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(data));
    fs.writeFileSync(path.join(root, 'overrides.json'), '{}');
    return root;
}

function exportedData(root, file) {
    const context = { module: { exports: {} } };
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
    return JSON.parse(JSON.stringify(context.module.exports));
}

function options(root, request, now = NOW, recalculateTargets = () => {}) {
    return { root, now, request, recalculateTargets, delay: async () => {} };
}

function usage(credits = 500) { return { data: { credits_remaining: credits } }; }

test('public sync promotes Post-MITI at Malaysia dates and persists matching overrides', () => {
    const record = { id: 'demo', companyName: 'Demo Berhad', stage: 6, status: 'Awaiting MITI Decision' };
    const data = [record];
    const overrides = {};
    const feed = [{ companyName: record.companyName, ticker: 'DEMO', openDate: '14-Oct-2026', closeDate: '14-Oct-2026', listingDate: '20-Oct-2026', price: 1 }];
    assert.equal(applyPublicRecords(feed, data, overrides, NOW), 1);
    assert.equal(record.stage, 3);
    assert.equal(overrides.demo.stage, 3);
    applyPublicRecords(feed, data, overrides, Date.parse('2026-10-14T17:00:00+08:00'));
    assert.equal(record.stage, 4);
    assert.equal(overrides.demo.stage, 4);
});

test('public sync waits for opening and cannot downgrade an already listed IPO', () => {
    const data = [
        { id: 'demo', companyName: 'Demo Berhad', stage: 6 },
        { id: 'listed', companyName: 'Listed Berhad', stage: 5, status: 'Listed' }
    ];
    const dates = { openDate: '15-Oct-2026', closeDate: '19-Oct-2026', listingDate: '20-Oct-2026' };
    applyPublicRecords(data.map(ipo => ({ companyName: ipo.companyName, ...dates })), data, {}, NOW);
    assert.equal(data[0].stage, 6);
    assert.equal(data[0].status, 'Public Opening Soon');
    assert.equal(data[1].stage, 5);
});

test('API upcoming uses the same opening and 5pm cutoff as public sync', () => {
    const data = [{ id: 'demo', companyName: 'Demo Berhad', stage: 6 }];
    const feed = [{ name: 'Demo Berhad', opening_date: '2026-10-14', closing_date: '2026-10-14', listing_date: '2026-10-20' }];
    applyUpcoming(feed, data, NOW);
    assert.equal(data[0].stage, 3);
    applyUpcoming(feed, data, Date.parse('2026-10-14T17:00:00+08:00'));
    assert.equal(data[0].stage, 4);
});

test('API partial success retries only the failed endpoint and keeps recalculated exports', async t => {
    const root = temporaryProject(t);
    const calls = [];
    let failLive = true;
    const request = async endpoint => {
        calls.push(endpoint);
        if (endpoint === '/account/usage') return usage(5 + (failLive ? 5 : 0));
        if (endpoint === '/ipo/upcoming') return { data: { upcoming: [{ name: 'Demo Berhad', ipo_price: 2 }] } };
        if (failLive) throw new Error('Temporary outage');
        return { data: { live: [] } };
    };
    const calculate = fixtureRoot => {
        const file = path.join(fixtureRoot, 'data.json');
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        assert.equal(data[0].price, 2, 'calculator receives fresh API price');
        data[0].sifuTargetPrice = 3;
        data[0].v7TargetPrice = 2.8;
        fs.writeFileSync(file, JSON.stringify(data));
    };
    assert.equal((await syncApi(options(root, request, NOW, calculate))).status, 'partial');
    const saved = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
    assert.equal(saved[0].sifuTargetPrice, 3);
    assert.deepEqual(exportedData(root, 'data.js'), saved);
    assert.deepEqual(exportedData(root, 'data_export.js'), saved);
    const firstStatus = readSyncStatus(root);
    assert.equal(firstStatus.sources['isaham-api'].status, 'partial');
    assert.equal(firstStatus.sources['isaham-api'].lastSuccess, null);
    calls.length = 0;
    await syncApi(options(root, request, NOW + HOUR / 2, calculate));
    assert.deepEqual(calls, []);
    assert.equal(readSyncStatus(root).sources['isaham-api'].lastAttempt, firstStatus.sources['isaham-api'].lastAttempt);
    failLive = false;
    assert.equal((await syncApi(options(root, request, NOW + HOUR + 1, calculate))).status, 'success');
    assert.deepEqual(calls, ['/account/usage', '/ipo/live']);
    const status = readSyncStatus(root);
    assert.equal(status.sources['isaham-upcoming'].lastSuccess, firstStatus.sources['isaham-upcoming'].lastSuccess);
    calls.length = 0;
    await syncApi(options(root, request, NOW + 2 * HOUR, calculate));
    assert.deepEqual(calls, []);
});

test('failed endpoints are bounded to two attempts daily without replacing the dataset', async t => {
    const root = temporaryProject(t);
    const original = fs.readFileSync(path.join(root, 'data.json'), 'utf8');
    const calls = [];
    const request = async endpoint => {
        calls.push(endpoint);
        if (endpoint === '/account/usage') return usage();
        throw new Error('Unavailable');
    };
    await syncApi(options(root, request));
    assert.equal(readSyncStatus(root).status, 'Failed');
    await syncApi(options(root, request, NOW + HOUR + 1));
    const callCount = calls.length;
    assert.equal((await syncApi(options(root, request, NOW + 3 * HOUR))).status, 'failed');
    assert.equal(calls.length, callCount);
    assert.equal(fs.readFileSync(path.join(root, 'data.json'), 'utf8'), original);
    const marker = JSON.parse(fs.readFileSync(path.join(root, 'isaham-api-status.json'), 'utf8'));
    assert.equal(marker.endpoints.upcoming.attempts, 2);
    assert.equal(marker.endpoints.live.attempts, 2);
});

test('malformed API payload is a failed endpoint rather than a successful empty dataset', async t => {
    const root = temporaryProject(t);
    const request = async endpoint => endpoint === '/account/usage' ? usage() :
        endpoint === '/ipo/upcoming' ? { data: { unexpected: [] } } : { data: { live: [] } };
    assert.equal((await syncApi(options(root, request))).status, 'partial');
    assert.equal(readSyncStatus(root).sources['isaham-upcoming'].status, 'failed');
});

test('calculator failure stays partial and can recover without charging either endpoint', async t => {
    const root = temporaryProject(t);
    const calls = [];
    const request = async endpoint => {
        calls.push(endpoint);
        return endpoint === '/account/usage' ? usage() : { data: [] };
    };
    const failCalculation = () => { throw new Error('Calculation failed'); };
    assert.equal((await syncApi(options(root, request, NOW, failCalculation))).status, 'partial');
    calls.length = 0;
    assert.equal((await syncApi(options(root, request, NOW + HOUR))).status, 'success');
    assert.deepEqual(calls, []);
    assert.equal(readSyncStatus(root).sources['isaham-api'].lastSuccess, new Date(NOW).toISOString());
});

test('a failed forced refresh is partial even when earlier data succeeded today', async t => {
    const root = temporaryProject(t);
    const request = async endpoint => endpoint === '/account/usage' ? usage() : { data: [] };
    await syncApi(options(root, request));
    const failedRequest = async endpoint => {
        if (endpoint === '/account/usage') return usage();
        throw new Error('Forced refresh unavailable');
    };
    const result = await syncApi({ ...options(root, failedRequest, NOW + HOUR), force: true });
    assert.equal(result.status, 'partial');
});

test('legacy scraper follows shared lifecycle and preserves old drafts and withdrawn records', () => {
    const data = [
        { companyName: 'Draft', stage: 1, year: 2025 },
        { companyName: 'Withdrawn', stage: 2, mitiWithdrawn: true, mitiCloseDate: '01-Oct-2026' },
        { companyName: 'MITI', stage: 2, mitiCloseDate: '14-Oct-2026' },
        { companyName: 'Public', stage: 6, openingDate: '14-Oct-2026', closingDate: '14-Oct-2026' }
    ];
    autoPromoteIPOs(data, Date.parse('2026-10-14T17:00:00+08:00'));
    assert.deepEqual(data.map(ipo => ipo.stage), [1, 2, 6, 4]);
});

test('API marker and public health messages redact credentials', async t => {
    const root = temporaryProject(t);
    process.env.PIPELINE_TEST_API_TOKEN = 'fixture-private-token';
    t.after(() => { delete process.env.PIPELINE_TEST_API_TOKEN; });
    const request = async endpoint => {
        if (endpoint === '/account/usage') return usage();
        throw new Error('Request failed with Bearer fixture-private-token');
    };
    await syncApi(options(root, request));
    for (const file of ['isaham-api-status.json', 'sync-status.js']) {
        assert.ok(!fs.readFileSync(path.join(root, file), 'utf8').includes('fixture-private-token'));
    }
});

test('fresh cache health retains the oldest actual page timestamp across cache-only runs', t => {
    const root = temporaryProject(t);
    const cachedPage = NOW - 25 * HOUR;
    publishScrapeStatus({ networkOk: true, degraded: false, observations: [cachedPage, NOW], totalIpos: 1, now: NOW }, root);
    let source = readSyncStatus(root).sources['isaham-scrape'];
    assert.equal(source.status, 'success');
    assert.equal(source.lastSuccess, new Date(cachedPage).toISOString());
    publishScrapeStatus({ networkOk: true, degraded: false, observations: [cachedPage, NOW], totalIpos: 1, now: NOW + HOUR / 2 }, root);
    source = readSyncStatus(root).sources['isaham-scrape'];
    assert.equal(source.lastSuccess, new Date(cachedPage).toISOString());
    assert.equal(source.lastAttempt, new Date(NOW + HOUR / 2).toISOString());
    publishScrapeStatus({ networkOk: true, degraded: false, observations: [NOW, NOW + HOUR], totalIpos: 1, now: NOW + HOUR }, root);
    assert.equal(readSyncStatus(root).sources['isaham-scrape'].lastSuccess, new Date(NOW).toISOString());
});

test('completed legacy API marker restores missing health without inventing new freshness', async t => {
    const root = temporaryProject(t);
    fs.writeFileSync(path.join(root, 'isaham-api-status.json'), JSON.stringify({
        lastSyncDate: '2026-10-14', lastSync: '14/10/2026, 8:15:00 am'
    }));
    const request = async () => { assert.fail('completed endpoint must not be called'); };
    assert.equal((await syncApi(options(root, request))).status, 'success');
    const expected = '2026-10-14T00:15:00.000Z';
    const sources = readSyncStatus(root).sources;
    for (const name of ['isaham-api', 'isaham-upcoming', 'isaham-live']) {
        assert.equal(sources[name].lastSuccess, expected);
        assert.equal(sources[name].lastAttempt, expected);
    }
    await syncApi(options(root, request, NOW + HOUR));
    assert.equal(readSyncStatus(root).sources['isaham-api'].lastSuccess, expected);
});
