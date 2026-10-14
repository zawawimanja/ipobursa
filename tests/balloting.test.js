const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { parseIndex, parseAnnouncement, selectTargets, syncBalloting, matchesCompany } = require('../sync-balloting');
const { readSyncStatus } = require('../lib/sync-health');

const NOW = Date.parse('2026-10-14T23:00:00+08:00');
const SOURCE = 'https://www.klsescreener.com/v2/announcements/view/11677871';
const ECOSYS = { id: 'ecosys', companyName: 'EcoSys (Malaysia) Berhad', stage: 5,
    listingDate: '14-Oct-2026', closingDate: '29-Sep-2026', ballotingDate: '01-Oct-2026', os: 0 };

// Minimal excerpts of the public HTML structure verified on 14 Oct 2026.
function announcement(company = ECOSYS.companyName, body = '<p>The Malaysian public represents an overall oversubscription rate of 206.70 times.</p>', date = '01 Oct 2026') {
    return `<div id="main"><h3>${company} - INITIAL PUBLIC OFFERING ("IPO")</h3>
    <p><div class="link-ck-content-data ck-content">${body}</div></p>
    <div class="ven_announcement_info"><h4>Announcement Info</h4><table>
    <tr><td class="formContentLabel">Date Announced</td><td class="formContentData">${date}</td></tr>
    <tr><td>Category</td><td>Special Announcement</td></tr></table></div></div>`;
}

function index(company = ECOSYS.companyName, id = '11677871') {
    return `<div class="announcements"><a href="/v2/announcements/view/${id}" target="_blank" class="announcement-item">
    <div class="meta"><span class="category-tag cat-SA">Special Ann</span></div>
    <div class="title">${company} - INITIAL PUBLIC OFFERING ("IPO")</div></a></div>`;
}

function project(t, data, overrides = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ipobursa-balloting-'));
    t.after(() => {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith('ipobursa-balloting-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(data));
    fs.writeFileSync(path.join(root, 'overrides.json'), JSON.stringify(overrides));
    return root;
}

function mockFetch(route, calls = []) {
    return async url => {
        calls.push(url);
        const html = await route(url);
        return { ok: true, status: 200, text: async () => html };
    };
}

function readJs(root, file) {
    const context = { module: { exports: {} } };
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
    return JSON.parse(JSON.stringify(context.module.exports));
}

test('KLSE index discovers IPO notices and rejects changed/challenge HTML', () => {
    assert.deepEqual(parseIndex(index()), [{ url: SOURCE, title: 'EcoSys (Malaysia) Berhad - INITIAL PUBLIC OFFERING ("IPO")' }]);
    assert.throws(() => parseIndex('<html>Please enable JavaScript</html>'), /no recognized entries/);
    assert.throws(() => parseIndex('<a href="https://example.com/11677871" class="announcement-item"><div class="title">IPO</div></a>'), /no recognized entries/);
    assert.equal(matchesCompany('ECOSYS (MALAYSIA) BHD - INITIAL PUBLIC OFFERING', ECOSYS), true);
    assert.equal(matchesCompany('ECOSYS HOLDINGS BERHAD - INITIAL PUBLIC OFFERING', ECOSYS), false);
});

test('EcoSys overall rate has priority over larger tranche figures', () => {
    const body = '<p>Bumiputera oversubscription rate of 400.00 times.</p>' +
        '<p>The Malaysian public represents an overall oversubscription rate of 206.70 times.</p>';
    assert.equal(parseAnnouncement(announcement(undefined, body), ECOSYS, NOW).os, 206.7);
});

test('Redplanet public paragraph without overall wording is supported', () => {
    const ipo = { ...ECOSYS, companyName: 'Redplanet Berhad', ballotingDate: '13-Oct-2026', listingDate: '22-Oct-2026' };
    const body = '<p>The shares available for application by the Malaysian public have been fully subscribed with an oversubscription rate of 85.28 times.</p>';
    assert.equal(parseAnnouncement(announcement(ipo.companyName, body, '13 Oct 2026'), ipo, NOW).os, 85.28);
});

test('EGH total subscription converts to excess OS, retaining original rate', () => {
    const ipo = { ...ECOSYS, companyName: 'EGH International Berhad', ballotingDate: '07-Oct-2026', listingDate: '16-Oct-2026' };
    const body = '<p>The Malaysian public has an overall subscription rate of 2.63 times.</p>' +
        '<p>Applications from the Malaysian public resulted in an overall subscription rate of 2.63 times.</p>';
    assert.deepEqual(parseAnnouncement(announcement(ipo.companyName, body, '07 Oct 2026'), ipo, NOW),
        { os: 1.63, announcedDate: '07 Oct 2026', subscriptionRate: 2.63 });
});

test('ambiguous, tranche-only, stale and wrong-company notices fail closed', () => {
    assert.throws(() => parseAnnouncement(announcement('Other Berhad'), ECOSYS, NOW), /company/);
    assert.throws(() => parseAnnouncement(announcement(undefined, undefined, '01 Oct 2025'), ECOSYS, NOW), /date/);
    assert.throws(() => parseAnnouncement(announcement(undefined, undefined, '15 Oct 2026'), ECOSYS, NOW), /date/);
    assert.throws(() => parseAnnouncement(announcement(undefined,
        '<p>The Malaysian public had high demand.</p><p>Bumiputera overall oversubscription rate of 400 times.</p>'), ECOSYS, NOW), /Unambiguous/);
    assert.throws(() => parseAnnouncement(announcement(undefined,
        '<p>The Malaysian public had an overall oversubscription rate of 200 times and an overall oversubscription rate of 300 times.</p>'), ECOSYS, NOW), /Unambiguous/);
});

test('only recently balloted/listed missing values are selected, preserving manual and sourced zero', () => {
    const data = [{ ...ECOSYS }, { ...ECOSYS, id: 'known', os: 206.7 }, { ...ECOSYS, id: 'manual' },
        { ...ECOSYS, id: 'sourced', osSource: SOURCE }, { ...ECOSYS, id: 'old', ballotingDate: '01-Jan-2026' },
        { ...ECOSYS, id: 'future', ballotingDate: '20-Oct-2026', listingDate: '28-Oct-2026', stage: 4 },
        { ...ECOSYS, id: 'missing-ballot', ballotingDate: null, listingDate: '21-Oct-2026', stage: 4 }];
    const targets = selectTargets(data, { manual: { os: 0 } }, NOW);
    assert.deepEqual(new Set(targets.map(ipo => ipo.id)), new Set(['ecosys', 'missing-ballot']));
});

test('sync falls back to ballot-day index, writes matching data exports and protects overrides', async t => {
    const root = project(t, [{ ...ECOSYS }, { ...ECOSYS, id: 'manual', os: 10 }], { manual: { os: 11, predictedGrade: 'B' }, ecosys: { predictedGrade: 'A' } });
    const calls = [];
    const request = mockFetch(url => url === SOURCE ? announcement() :
        (url.includes('date_to=2026-10-01') ? index() : index('Other Berhad', '11684755')), calls);
    assert.deepEqual(await syncBalloting({ root, now: NOW, fetch: request }), { updated: 1, failed: 0, deferred: 0 });
    assert.equal(calls.length, 3);
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json')));
    assert.equal(data[0].os, 206.7);
    assert.equal(data[0].osSource, SOURCE);
    assert.equal(data[1].os, 10);
    assert.deepEqual(readJs(root, 'data.js'), data);
    assert.deepEqual(readJs(root, 'data_export.js'), data);
    const overrides = JSON.parse(fs.readFileSync(path.join(root, 'overrides.json')));
    assert.equal(overrides.ecosys.predictedGrade, 'A');
    assert.equal(overrides.ecosys.os, 206.7);
    assert.deepEqual(overrides.manual, { os: 11, predictedGrade: 'B' });
    assert.equal(readSyncStatus(root).sources.balloting.status, 'success');
});

test('HTTP failure preserves data exactly and records visible failure', async t => {
    const root = project(t, [{ ...ECOSYS }]);
    const before = fs.readFileSync(path.join(root, 'data.json'), 'utf8');
    const request = async () => ({ ok: false, status: 403 });
    assert.deepEqual(await syncBalloting({ root, now: NOW, fetch: request }), { updated: 0, failed: 1, deferred: 0 });
    assert.equal(fs.readFileSync(path.join(root, 'data.json'), 'utf8'), before);
    assert.equal(readSyncStatus(root).sources.balloting.status, 'failed');
    assert.equal(fs.existsSync(path.join(root, 'data.js')), false);
});

test('missing ballot date uses bounded closing-date fallback and rejects a notice before closing', async t => {
    const ipo = { ...ECOSYS, id: 'nwe', companyName: 'NWE Resources Group Berhad', stage: 4,
        ballotingDate: null, closingDate: '09-Oct-2026', listingDate: '21-Oct-2026' };
    const later = Date.parse('2026-10-20T23:00:00+08:00');
    const root = project(t, [ipo]);
    const source = 'https://www.klsescreener.com/v2/announcements/view/11683581';
    const calls = [];
    const body = '<p>The Malaysian public represents an overall oversubscription rate of 2.82 times.</p>';
    const request = mockFetch(url => url === source ? announcement(ipo.companyName, body, '13 Oct 2026') :
        url.includes('date_to=2026-10-16') ? index(ipo.companyName, '11683581') : index('Other Berhad', '11684755'), calls);
    assert.deepEqual(await syncBalloting({ root, now: later, fetch: request }), { updated: 1, failed: 0, deferred: 0 });
    assert.equal(calls.length, 3);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'data.json')))[0].os, 2.82);
    assert.throws(() => parseAnnouncement(announcement(ipo.companyName, body, '08 Oct 2026'), ipo, later), /date/);
});

test('a partial run saves verified OS and reports unresolved IPOs', async t => {
    const root = project(t, [{ ...ECOSYS }, { ...ECOSYS, id: 'other', companyName: 'Other Berhad' }]);
    const request = mockFetch(url => url === SOURCE ? announcement() : index());
    assert.deepEqual(await syncBalloting({ root, now: NOW, fetch: request }), { updated: 1, failed: 1, deferred: 0 });
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'data.json')))[0].os, 206.7);
    assert.equal(readSyncStatus(root).sources.balloting.status, 'partial');
});

test('candidate budget is bounded and skipped runs make no network requests', async t => {
    const root = project(t, Array.from({ length: 8 }, (_, i) => ({ ...ECOSYS, id: `missing-${i}` })));
    let calls = 0;
    const result = await syncBalloting({ root, now: NOW, fetch: async () => { calls++; throw new Error('Unavailable'); } });
    assert.deepEqual(result, { updated: 0, failed: 6, deferred: 2 });
    assert.equal(calls, 1, 'failed shared index is cached during the run');
    const skippedRoot = project(t, [{ ...ECOSYS, os: 206.7 }]);
    assert.deepEqual(await syncBalloting({ root: skippedRoot, now: NOW, fetch: async () => { throw new Error('must not fetch'); } }),
        { updated: 0, failed: 0, deferred: 0 });
    assert.equal(readSyncStatus(skippedRoot).sources.balloting.status, 'skipped');
});
