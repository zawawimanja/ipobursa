const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { runWorkflow } = require('../bursa');

const quietLogger = { log() {}, error() {} };
const root = path.resolve('fixture project with spaces');

function runFixture(args = [], failSource) {
    const calls = [];
    const exitCode = runWorkflow(args, {
        root, logger: quietLogger,
        execFileSync(executable, argv, options) {
            calls.push({ executable, argv, options });
            if (argv.includes(failSource)) throw new Error('Fixture source unavailable');
        }
    });
    return { calls, exitCode };
}

test('automatic workflow uses public sources, regenerates derived pages, and never invokes iSaham sync', () => {
    const { calls, exitCode } = runFixture();
    assert.equal(exitCode, 0);
    const steps = calls.map(call => call.argv.slice(1));
    assert.deepEqual(steps.filter(step => step[0] === 'isaham-api'), [[
        'isaham-api', '--skip', 'Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI.'
    ]]);
    assert.ok(calls.every(call => call.argv.every(arg => !/sync-isaham(?:-api)?\.js$/.test(arg))));
    for (const source of ['klse', 'i3investor', 'balloting', 'miti-portal']) {
        assert.equal(steps.filter(step => step[0] === source).length, 1);
    }
    for (const source of ['i3investor', 'balloting', 'miti-portal']) {
        assert.ok(steps.find(step => step[0] === source).includes('--managed-status'));
    }
    const targetIndex = steps.findIndex(step => step[0] === 'target-calculation');
    const profileIndex = steps.findIndex(step => step[0] === 'ipo-pages');
    assert.ok(targetIndex > steps.findIndex(step => step[0] === 'miti-portal'));
    assert.ok(profileIndex > targetIndex);
    assert.equal(calls.at(-1).argv[0], path.join(root, 'morning-brief.js'));
    assert.ok(calls.some(call => call.argv[0] === path.join(root, 'scratch/fix-high-anomalies.js')));
});

test('source failure still refreshes independent sources and report but returns failure', () => {
    const { calls, exitCode } = runFixture([], 'klse');
    assert.equal(exitCode, 1);
    assert.ok(calls.some(call => call.argv.includes('i3investor')));
    assert.ok(calls.some(call => call.argv.includes('balloting')));
    assert.ok(calls.some(call => call.argv.includes('ipo-pages')));
    assert.equal(calls.at(-1).argv[0], path.join(root, 'morning-brief.js'));
});

test('quick aliases only generate the current report without sync or data generation', () => {
    for (const alias of ['--quick', '-q', 'quick']) {
        const { calls, exitCode } = runFixture([alias]);
        assert.equal(exitCode, 0);
        assert.deepEqual(calls.map(call => call.argv), [[path.join(root, 'morning-brief.js')]]);
    }
});

test('workflow uses the active Node runtime and argument arrays without a PATH or shell dependency', () => {
    const { calls } = runFixture();
    for (const call of calls) {
        assert.equal(call.executable, process.execPath);
        assert.equal(call.options.cwd, root);
        assert.equal(call.options.shell, false);
        assert.equal(call.options.stdio, 'inherit');
        assert.ok(path.isAbsolute(call.argv[0]));
    }
});
