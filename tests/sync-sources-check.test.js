const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { evaluate, main, parseArgs, WORKING_SOURCES } = require('../scripts/check-sync-sources');
const { updateSourceStatus } = require('../lib/sync-health');

function statusFile(sources) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-check-'));
    Object.entries(sources).forEach(([name, update]) => updateSourceStatus(name, update, root));
    return root;
}

test('sources blocked from the runner IP warn instead of failing the job', () => {
    const sources = {
        'miti-portal': { status: 'failed', message: 'MITI public portal HTTP 403 (access denied from this runner); existing data retained.' },
        'miti-applicants': { status: 'skipped', message: 'Puppeteer is not installed in CI.' },
        balloting: { status: 'failed', message: 'Overall public OS: 0 updated, 1 unavailable, 0 deferred.' },
        'isaham-api': { status: 'skipped', message: 'Not used by choice.' }
    };
    WORKING_SOURCES.forEach(name => { sources[name] = { status: 'success', message: 'Sync completed.' }; });
    const root = statusFile(sources);
    const log = console.log;
    const out = [];
    console.log = message => out.push(message);
    try {
        assert.deepEqual(main(root).errors, []);
    } finally {
        console.log = log;
    }
    assert.ok(out.some(line => line.startsWith('::warning::miti-portal is failed:')));
    assert.ok(out.some(line => line.startsWith('::warning::miti-applicants is skipped:')));
    assert.ok(out.some(line => line.startsWith('::warning::balloting is failed:')));
});

test('a source the runner can complete still blocks the pipeline', () => {
    const sources = {};
    WORKING_SOURCES.forEach(name => { sources[name] = { status: 'success', message: 'Sync completed.' }; });
    sources.klse = { status: 'failed', message: 'Sync failed (exit 1).' };
    const { errors, warnings } = evaluate(sources, WORKING_SOURCES);
    assert.deepEqual(errors, ['klse failed: Sync failed (exit 1).']);
    assert.equal(warnings.length, 0);
});

test('partial prices warn but do not block, and a silent source does', () => {
    const sources = {
        klse: { status: 'success', message: 'Sync completed.' },
        i3investor: { status: 'partial', message: '111 prices refreshed; 1 could not be refreshed.' },
        shariah: { status: 'skipped', message: 'Not run.' }
    };
    const { errors, warnings } = evaluate(sources, ['klse', 'i3investor', 'shariah']);
    assert.deepEqual(errors, []);
    assert.match(warnings.join('\n'), /i3investor partial: 111 prices/);
    assert.match(warnings.join('\n'), /shariah was skipped: Not run\./);
    const missing = evaluate({ klse: { status: 'success' } }, ['klse', 'ipo-pages']);
    assert.deepEqual(missing.errors, ['ipo-pages did not report a status.']);
});

test('each workflow only checks the sources it ran itself', () => {
    const sources = {};
    WORKING_SOURCES.forEach(name => { sources[name] = { status: 'success', message: 'Sync completed.' }; });
    sources.klse = { status: 'failed', message: 'Sync failed (exit 1).' };
    sources['miti-portal'] = { status: 'failed', message: 'MITI public portal HTTP 403.' };
    const root = statusFile(sources);
    const log = console.log;
    const error = console.error;
    console.log = () => {};
    console.error = () => {};
    try {
        assert.deepEqual(main(root, ['--only', 'ipo-pages']).errors, []);
        assert.deepEqual(main(root).errors, ['klse failed: Sync failed (exit 1).']);
        assert.deepEqual(parseArgs(['--only', 'klse,ipo-pages']), { only: ['klse', 'ipo-pages'] });
        assert.deepEqual(parseArgs([]), {});
        assert.throws(() => main(root, ['--only', 'miti-portal']), /Unknown sync source: miti-portal/);
        assert.throws(() => main(root, ['--only']), /Usage: check-sync-sources.js/);
    } finally {
        console.log = log;
        console.error = error;
    }
});
