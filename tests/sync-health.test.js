const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { updateSourceStatus, readSyncStatus, safeMessage } = require('../lib/sync-health');
const { runSyncStep } = require('../scripts/run-sync-step');

function temporaryRoot(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ipo-sync-health-'));
    t.after(() => {
        assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
        fs.rmSync(root, { recursive: true, force: true });
    });
    return root;
}

test('source results preserve legacy metadata and each source freshness', t => {
    const root = temporaryRoot(t);
    fs.writeFileSync(path.join(root, 'sync-status.js'), 'const SYNC_STATUS = {lastSync: "old", totalIpos: 307}; module.exports = SYNC_STATUS;');
    updateSourceStatus('miti', { status: 'success', now: '2026-10-13T01:00:00Z' }, root);
    const current = updateSourceStatus('klse', { status: 'failed', now: '2026-10-13T02:00:00Z' }, root);
    assert.equal(current.totalIpos, 307);
    assert.equal(current.source, 'miti');
    assert.equal(current.status, 'Partial');
    assert.equal(current.sources.miti.lastSuccess, '2026-10-13T01:00:00.000Z');
    assert.equal(current.sources.klse.lastSuccess, null);
    assert.match(current.lastSync, /9:00:00 am/);
});

test('failure and skipped guard preserve last successful refresh', t => {
    const root = temporaryRoot(t);
    updateSourceStatus('isaham-api', { status: 'success', now: '2026-10-13T01:00:00Z' }, root);
    const legacyTime = readSyncStatus(root).lastSync;
    updateSourceStatus('isaham-api', { status: 'failed', now: '2026-10-13T02:00:00Z' }, root);
    const current = updateSourceStatus('isaham-api', { status: 'skipped', now: '2026-10-13T03:00:00Z' }, root);
    assert.equal(current.sources['isaham-api'].lastSuccess, '2026-10-13T01:00:00.000Z');
    assert.equal(current.sources['isaham-api'].lastAttempt, '2026-10-13T03:00:00.000Z');
    assert.equal(current.lastSync, legacyTime);
});

test('cached-source success uses observed refresh time rather than execution time', t => {
    const root = temporaryRoot(t);
    const current = updateSourceStatus('isaham-scrape', {
        status: 'success', now: '2026-10-14T01:00:00Z', lastSuccess: '2026-10-13T01:00:00Z'
    }, root);
    assert.match(current.lastSync, /^13\/10\/2026, 9:00:00 am$/);
    const unknown = updateSourceStatus('isaham-scrape', {
        status: 'success', now: '2026-10-14T02:00:00Z', lastSuccess: null
    }, root);
    assert.equal(unknown.lastSync, current.lastSync);
    assert.equal(unknown.sources['isaham-scrape'].lastSuccess, null);
});

test('public messages redact configured credentials and credential patterns', t => {
    const original = process.env.ISAHAM_API_TOKEN;
    process.env.ISAHAM_API_TOKEN = 'private-test-token';
    t.after(() => {
        if (original === undefined) delete process.env.ISAHAM_API_TOKEN;
        else process.env.ISAHAM_API_TOKEN = original;
    });
    const message = safeMessage('private-test-token Bearer other-token https://user:pass@example.com?key=secret-key');
    assert.doesNotMatch(message, /private-test-token|other-token|user:pass|secret-key/);
    assert.match(message, /redacted/);
});

test('wrapper records a failed subprocess and returns its exit status', t => {
    const root = temporaryRoot(t);
    let invocation;
    const exit = runSyncStep(['i3investor', 'scrape-i3.js', '--quiet'], {
        root,
        spawnSync: (...args) => { invocation = args; return { status: 2 }; }
    });
    assert.equal(exit, 2);
    assert.deepEqual(invocation[1], [path.join(root, 'scrape-i3.js'), '--quiet']);
    assert.equal(invocation[2].shell, false);
    const source = readSyncStatus(root).sources.i3investor;
    assert.equal(source.status, 'failed');
    assert.equal(source.lastSuccess, null);
});

test('missing-token skip never invokes a subprocess or creates freshness', t => {
    const root = temporaryRoot(t);
    const exit = runSyncStep(['isaham-api', '--skip', 'API token is not configured.'], {
        root, spawnSync: () => { throw new Error('Should not run'); }
    });
    assert.equal(exit, 0);
    const source = readSyncStatus(root).sources['isaham-api'];
    assert.equal(source.status, 'skipped');
    assert.equal(source.lastSuccess, null);
});

test('managed API partial results and successful daily guards are not overwritten', t => {
    const root = temporaryRoot(t);
    const lastSuccess = '2026-10-13T01:00:00.000Z';
    updateSourceStatus('isaham-api', { status: 'success', now: lastSuccess }, root);
    assert.equal(runSyncStep(['isaham-api', '--managed-status', 'sync-isaham-api.js'], {
        root, spawnSync: () => ({ status: 0 })
    }), 0);
    assert.equal(readSyncStatus(root).sources['isaham-api'].lastSuccess, lastSuccess);
    const exit = runSyncStep(['isaham-api', '--managed-status', 'sync-isaham-api.js'], {
        root,
        spawnSync: () => {
            updateSourceStatus('isaham-api', { status: 'partial', now: '2026-10-13T03:00:00Z', message: 'Live endpoint failed.' }, root);
            return { status: 1 };
        }
    });
    assert.equal(exit, 1);
    const source = readSyncStatus(root).sources['isaham-api'];
    assert.equal(source.status, 'partial');
    assert.equal(source.lastSuccess, lastSuccess);
    assert.equal(source.message, 'Live endpoint failed.');
});

test('wrapper records process launch failures', t => {
    const root = temporaryRoot(t);
    assert.equal(runSyncStep(['klse', 'sync-public-ipos.js'], {
        root, spawnSync: () => ({ status: null, error: new Error('cannot start') })
    }), 1);
    assert.equal(readSyncStatus(root).sources.klse.status, 'failed');
});

async function runPriceFixture(t, successfulSymbols, failWrites = false) {
    const root = temporaryRoot(t);
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify([
        { id: 'a', companyName: 'A', symbol: 'A', stage: 5, year: 2026, price: 1 },
        { id: 'b', companyName: 'B', symbol: 'B', stage: 5, year: 2026, price: 1 }
    ]));
    const statuses = [];
    const mockRequire = name => {
        if (name === 'fs') return failWrites ? { ...fs, writeFileSync: () => { throw new Error('Disk write failed'); } } : fs;
        if (name === 'path') return path;
        if (name === 'axios') return { get: async url => {
            if (!successfulSymbols.includes(url.split('/').pop())) throw new Error('Source unavailable');
            return { data: '1.5' };
        } };
        if (name === './lib/sync-health') return { updateSourceStatus: (source, status) => statuses.push(status) };
        if (name === 'cheerio') return { load: price => selector => {
            if (selector === 'p') return { each: callback => callback(0, {}) };
            return { text: () => 'Last Price', next: () => ({ length: 1, text: () => price }) };
        } };
        throw new Error(`Unexpected dependency: ${name}`);
    };
    const sandbox = {
        require: mockRequire, __dirname: root, module: { exports: {} }, process: { exitCode: 0 },
        console: { log() {}, error() {} }, setTimeout: callback => callback()
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'scrape-i3.js'), 'utf8'), sandbox);
    await sandbox.module.exports.scrapeI3PricesAxios();
    return { status: statuses.at(-1), exitCode: sandbox.process.exitCode, root };
}

test('price source reports partial refresh when only some prices succeed', async t => {
    const result = await runPriceFixture(t, ['A']);
    assert.equal(result.status.status, 'partial');
    assert.equal(result.exitCode, 1);
    const data = JSON.parse(fs.readFileSync(path.join(result.root, 'data.json'), 'utf8'));
    assert.equal(data[0].currentPrice, 1.5);
    assert.equal(data[1].currentPrice, undefined);
});

test('price source fails when all requests or database writes fail', async t => {
    const requests = await runPriceFixture(t, []);
    assert.equal(requests.status.status, 'failed');
    assert.equal(requests.exitCode, 1);
    const writes = await runPriceFixture(t, ['A', 'B'], true);
    assert.equal(writes.status.status, 'failed');
    assert.equal(writes.exitCode, 1);
});

test('price source reports success after a complete saved refresh', async t => {
    const result = await runPriceFixture(t, ['A', 'B']);
    assert.equal(result.status.status, 'success');
    assert.equal(result.exitCode, 0);
});

function runTargetFixture(t, records) {
    const root = temporaryRoot(t);
    fs.writeFileSync(path.join(root, 'data.json'), typeof records === 'string' ? records : JSON.stringify(records));
    const sandbox = {
        require, __dirname: path.join(root, 'scratch'), process: { exitCode: 0 },
        console: { log() {}, error() {} }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'scratch', 'calc_sifu_targets.js'), 'utf8'), sandbox);
    return { root, exitCode: sandbox.process.exitCode };
}

test('calculator exports keep final targets identical in all dataset files', t => {
    const result = runTargetFixture(t, [
        { id: 'target', stage: 2, year: 2026, shariah: true, price: 1, avgTP: 2, sector: 'Technology', market: 'ACE' }
    ]);
    assert.equal(result.exitCode, 0);
    const data = JSON.parse(fs.readFileSync(path.join(result.root, 'data.json'), 'utf8'));
    assert.equal(data[0].calibratedSifuTargetPrice, 1.5);
    for (const file of ['data.js', 'data_export.js']) {
        const sandbox = { module: { exports: {} } };
        vm.runInNewContext(fs.readFileSync(path.join(result.root, file), 'utf8'), sandbox);
        assert.equal(JSON.stringify(sandbox.module.exports), JSON.stringify(data));
    }
});

test('calculator reports invalid data as a failed sync step', t => {
    const result = runTargetFixture(t, '{invalid json');
    assert.equal(result.exitCode, 1);
    assert.equal(fs.existsSync(path.join(result.root, 'data.js')), false);
});

test('Post-MITI records do not contribute to listed investment bank performance', t => {
    const target = { id: 'target', stage: 3, year: 2026, shariah: true, price: 1, avgTP: 2, sector: 'Technology', market: 'ACE', ib: 'Same IB' };
    const postMiti = { id: 'post-miti', stage: 6, price: 1, highPrice: 9, ib: 'Same IB' };
    const baseline = runTargetFixture(t, [target]);
    const withPostMiti = runTargetFixture(t, [target, postMiti]);
    assert.equal(baseline.exitCode, 0);
    assert.equal(withPostMiti.exitCode, 0);
    const readTarget = root => JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'))[0].calibratedSifuTargetPrice;
    assert.equal(readTarget(baseline.root), readTarget(withPostMiti.root));
});
