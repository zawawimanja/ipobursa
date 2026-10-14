const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { syncApi } = require('../sync-isaham-api');
const { readSyncStatus } = require('../lib/sync-health');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ipobursa-isaham-access-'));
    t.after(() => {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith('ipobursa-isaham-access-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    const initial = JSON.stringify([{ id: 'demo', companyName: 'Demo Berhad', price: 1 }]);
    fs.writeFileSync(path.join(root, 'data.json'), initial);
    return { root, initial, now: Date.parse('2026-10-15T10:00:00+08:00'), delay: async () => {} };
}

function rejected(status, code, message) {
    return Object.assign(new Error(`Request failed with status code ${status}`), {
        response: { status, data: { status: 'error', error: { code, message } } }
    });
}

test('missing or whitespace-only API token reports configuration requirement without changing data', async t => {
    const project = fixture(t);
    const result = await syncApi({ ...project, token: '  ' });
    assert.equal(result.status, 'failed');
    assert.match(result.message, /ISAHAM_API_TOKEN.*GitHub Actions secret/);
    assert.equal(fs.readFileSync(path.join(project.root, 'data.json'), 'utf8'), project.initial);
    assert.equal(fs.existsSync(path.join(project.root, 'isaham-api-status.json')), false);
});

test('IPO tier rejection stays failed and explains required access in aggregate health', async t => {
    const project = fixture(t);
    const calls = [];
    const result = await syncApi({ ...project, request: async endpoint => {
        calls.push(endpoint);
        if (endpoint === '/account/usage') return { data: { tier: 'free', credits_remaining: 500 } };
        throw rejected(403, 'TIER_UPGRADE_REQUIRED', 'Your plan does not include access to this endpoint');
    } });
    assert.equal(result.status, 'failed');
    assert.deepEqual(calls, ['/account/usage', '/ipo/upcoming', '/ipo/live']);
    const sources = readSyncStatus(project.root).sources;
    for (const key of ['isaham-api', 'isaham-upcoming', 'isaham-live']) {
        assert.equal(sources[key].status, 'failed');
        assert.equal(sources[key].lastSuccess, null);
        assert.match(sources[key].message, /TIER_UPGRADE_REQUIRED.*Max/);
    }
    assert.equal(fs.readFileSync(path.join(project.root, 'data.json'), 'utf8'), project.initial);
});

test('invalid API token fails the free usage check before requesting charged IPO endpoints', async t => {
    const project = fixture(t);
    const calls = [];
    const result = await syncApi({ ...project, request: async endpoint => {
        calls.push(endpoint);
        throw rejected(401, 'UNAUTHORIZED', 'Missing or invalid access token');
    } });
    assert.equal(result.status, 'failed');
    assert.deepEqual(calls, ['/account/usage']);
    assert.match(result.message, /Token iSaham tidak sah.*ISAHAM_API_TOKEN/);
    assert.equal(fs.readFileSync(path.join(project.root, 'data.json'), 'utf8'), project.initial);
});

test('unknown API error details remain useful while redacting credentials from saved health', async t => {
    const project = fixture(t);
    const result = await syncApi({ ...project, request: async () => {
        throw rejected(503, 'SERVICE_UNAVAILABLE', 'Temporary failure for Bearer private-fixture-token');
    } });
    assert.equal(result.status, 'failed');
    assert.match(result.message, /503: SERVICE_UNAVAILABLE: Temporary failure/);
    assert.ok(!result.message.includes('private-fixture-token'));
    assert.ok(!fs.readFileSync(path.join(project.root, 'sync-status.js'), 'utf8').includes('private-fixture-token'));
});
