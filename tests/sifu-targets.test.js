const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../scratch/calc_sifu_targets.js'), 'utf8');
const targetFields = ['sifuTargetPrice', 'calibratedSifuTargetPrice', 'v7TargetPrice', 'zone2TargetPrice'];
const base = extra => ({ id: 'fixture', companyName: 'Fixture', year: 2026, stage: 6,
    shariah: true, sector: 'Healthcare', market: 'Main Market', ...extra });

function calculate(t, records, overrides = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sifu-targets-'));
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(records));
    fs.writeFileSync(path.join(root, 'overrides.json'), JSON.stringify(overrides));
    const logs = [];
    const sandbox = { require, __dirname: path.join(root, 'scratch'), process: { exitCode: 0 },
        console: { log: value => logs.push(value), error: value => logs.push(value) } };
    vm.runInNewContext(source, sandbox, { timeout: 5000 });
    assert.equal(sandbox.process.exitCode, 0, logs.join('\n'));
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
    for (const file of ['data.js', 'data_export.js']) {
        const exported = { module: { exports: {} } };
        vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), exported);
        assert.equal(JSON.stringify(exported.module.exports), JSON.stringify(data));
    }
    return { data, logs };
}

test('incomplete shareholder earnings suppress stale manual and group-PAT targets', t => {
    const ipo = base({ id: 'big-caring-group-bhd', price: 1.08,
        financialProfileStatus: 'incomplete', headers: ['FY25', 'FY26'],
        totalShares: 7381835680, patF: 231800000, targetPe: 30,
        sifuTargetPrice: 0.94, calibratedSifuTargetPrice: 1, v7TargetPrice: 1, zone2TargetPrice: 1 });
    const { data: [result], logs } = calculate(t, [ipo], {
        [ipo.id]: { sifuTargetPrice: 0.94, calibratedSifuTargetPrice: 1 }
    });
    targetFields.forEach(field => assert.equal(result[field], null, field));
    assert.equal(result.price, 1.08);
    assert.match(logs.join('\n'), /Financial profile incomplete/);
});

test('incomplete status from overrides clears targets even outside the calculation selection', t => {
    const records = [base({ id: 'selected', price: 1.08 }),
        base({ id: 'outside-selection', year: 2025, shariah: false, price: 1.08 })];
    const overrides = Object.fromEntries(records.map(ipo => [ipo.id, {
        financialProfileStatus: 'incomplete', sifuTargetPrice: 0.94,
        calibratedSifuTargetPrice: 1, v7TargetPrice: 1, zone2TargetPrice: 1
    }]));
    const { data } = calculate(t, records, overrides);
    data.forEach(ipo => targetFields.forEach(field => assert.equal(ipo[field], null, `${ipo.id}.${field}`)));
});

test('unknown IPO prices do not create RM0.50 targets or substitute a current quote', t => {
    const records = [0, null, undefined].map((price, index) => base({ id: `unknown-${index}`, price,
        currentPrice: 2, sifuTargetPrice: 0.5, calibratedSifuTargetPrice: 0.6 }));
    const { data, logs } = calculate(t, records);
    data.forEach(ipo => targetFields.forEach(field => assert.equal(ipo[field], null, `${ipo.id}.${field}`)));
    assert.match(logs.join('\n'), /IPO price and analyst target unavailable/);
});

test('verified complete earnings retain valuation calculation and matching target exports', t => {
    const { data: [result] } = calculate(t, [base({ price: 0.3, headers: ['FY25'],
        patF: 20000000, totalShares: 1000000000, targetPe: 30 })]);
    assert.equal(result.sifuTargetPrice, 0.6);
    assert.ok(result.calibratedSifuTargetPrice > 0);
    assert.equal(result.v7TargetPrice, result.calibratedSifuTargetPrice);
    assert.equal(result.zone2TargetPrice, result.calibratedSifuTargetPrice);
});

test('known manual targets and analyst targets remain valid without an IPO price', t => {
    const { data } = calculate(t, [base({ id: 'manual', price: 0 }),
        base({ id: 'analyst', price: 0, avgTP: 0.75 })], {
        manual: { sifuTargetPrice: 1.2, calibratedSifuTargetPrice: 1.3 }
    });
    assert.equal(data[0].sifuTargetPrice, 1.2);
    assert.equal(data[0].calibratedSifuTargetPrice, 1.3);
    assert.equal(data[1].sifuTargetPrice, 0.75);
    assert.ok(data[1].calibratedSifuTargetPrice > 0);
});
