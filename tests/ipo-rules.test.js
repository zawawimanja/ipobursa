const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const rules = require('../lib/ipo-rules');

const time = value => Date.parse(value);
const publicIpo = extra => ({ stage: 3, status: 'Application Open', market: 'ACE Market',
    price: 0.3, openingDate: '01-Oct-2026', closingDate: '14-Oct-2026', listingDate: '21-Oct-2026', ...extra });

test('public applications close at exactly 17:00 MYT', () => {
    const ipo = publicIpo();
    assert.equal(rules.isApplicationOpen(ipo, 'public', time('2026-10-14T16:59:59+08:00')), true);
    for (const clock of ['17:00:00', '18:00:00']) {
        const now = time(`2026-10-14T${clock}+08:00`);
        assert.equal(rules.isApplicationOpen(ipo, 'public', now), false);
        assert.deepEqual(rules.resolveLifecycle(ipo, now), { stage: 4, status: 'Pre-Listing' });
    }
});

test('MITI closes at noon and waits for a future public opening', () => {
    const ipo = publicIpo({ stage: 2, mitiOpenDate: '01-Oct-2026', mitiCloseDate: '14-Oct-2026',
        openingDate: '20-Oct-2026', closingDate: '27-Oct-2026', listingDate: '05-Nov-2026' });
    assert.equal(rules.isApplicationOpen(ipo, 'miti', time('2026-10-14T11:59:59+08:00')), true);
    const noon = time('2026-10-14T12:00:00+08:00');
    assert.equal(rules.isApplicationOpen(ipo, 'miti', noon), false);
    assert.deepEqual(rules.resolveLifecycle(ipo, noon), { stage: 6, status: 'Public Opening Soon' });
    assert.equal(rules.isApplicationOpen(ipo, 'public', noon), false);
    assert.equal(rules.resolveLifecycle({ ...ipo, stage: 6 }, time('2026-10-20T00:00:00+08:00')).stage, 3);
});

test('future public applications are never marked open', () => {
    const now = time('2026-10-14T18:00:00+08:00');
    for (const stage of [3, 6]) {
        const ipo = publicIpo({ stage, openingDate: '20-Oct-2026', closingDate: '27-Oct-2026' });
        assert.equal(rules.resolveLifecycle(ipo, now).status, 'Public Opening Soon');
        assert.equal(rules.isApplicationOpen(ipo, 'public', now), false);
    }
});

test('Malaysia deadlines do not change with server or browser timezone', () => {
    const modulePath = path.join(__dirname, '../lib/ipo-rules.js');
    const code = `const r=require(${JSON.stringify(modulePath)}); console.log(r.getDeadline({closingDate:'14-Oct-2026'}).toISOString())`;
    for (const TZ of ['UTC', 'America/Los_Angeles', 'Asia/Kuala_Lumpur']) {
        assert.equal(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' }).trim(), '2026-10-14T09:00:00.000Z');
    }
});

test('explicit close times override defaults and invalid calendar dates are rejected', () => {
    assert.equal(rules.getDeadline({ closingDate: '14-Oct-2026', closingTime: '16:30' }).toISOString(), '2026-10-14T08:30:00.000Z');
    assert.equal(rules.getDeadline({ mitiCloseDate: '14-Oct-2026', mitiCloseTime: '15:00' }, 'miti').toISOString(), '2026-10-14T07:00:00.000Z');
    for (const date of ['31-Feb-2026', '2026-13-01', 'TBA']) assert.equal(rules.dateParts(date), null);
    assert.equal(rules.atMyt('14-Oct-2026', '25:00'), null);
});

test('dayKey, closed chapters and post-listing dates are judged in Malaysia time', () => {
    for (const TZ of ['UTC', 'America/Los_Angeles', 'Asia/Kuala_Lumpur']) {
        const code = `const r=require(${JSON.stringify(path.join(__dirname, '..', 'lib', 'ipo-rules.js'))});` +
            'console.log(r.dayKey("30-Oct-2026"), r.dayKey("2026-10-30T17:00:00+08:00"), r.dayKey(new Date("2026-10-30T16:30:00Z")));';
        assert.equal(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' }).trim(),
            '2026-10-30 2026-10-30 2026-10-31');
    }
    const listed = { stage: 5, listingDate: '12-Nov-2025', closingDate: '30-Oct-2026' };
    assert.equal(rules.isChapterClosed(listed), true);
    assert.equal(rules.isChapterClosed({ stage: 3 }), false);
    assert.equal(rules.isChapterClosed({ stage: 2, mitiWithdrawn: true }), true);
    assert.equal(rules.isAfterListing(listed, listed.closingDate), true);
    assert.equal(rules.isAfterListing({ listingDate: '19-Nov-2026' }, '05-Nov-2026'), false);
    // No listing date yet means nothing to compare against, so the date stays trusted.
    assert.equal(rules.isAfterListing({ closingDate: '30-Oct-2026' }, '30-Oct-2026'), false);
});

test('a MITI payment deadline needs an exact instant, not a bare date', () => {
    const payment = rules.getMitiPayment({ mitiPaymentDeadline: '2026-10-30T17:00:00+08:00' }, time('2026-10-30T08:00:00Z'));
    assert.equal(payment.day, '2026-10-30');
    assert.equal(payment.isOpen, true);
    assert.equal(rules.getMitiPayment({ mitiPaymentDeadline: '2026-10-30T17:00:00+08:00' }, time('2026-10-30T09:00:00Z')).isOpen, false);
    for (const raw of [undefined, '', '2026-10-30', '2026-10-30T17:00:00', 'not-a-date']) {
        assert.equal(rules.getMitiPayment({ mitiPaymentDeadline: raw }), null);
    }
});

test('withdrawn and manually listed IPOs retain their lifecycle', () => {
    for (const ipo of [publicIpo({ stage: 0, status: 'Cancelled' }), publicIpo({ stage: 2, status: 'Withdrawn', mitiWithdrawn: true }), publicIpo({ stage: 5, status: 'Listed' })]) {
        assert.deepEqual(rules.resolveLifecycle(ipo, time('2026-12-01T00:00:00Z')), { stage: ipo.stage, status: ipo.status });
    }
});

test('pre-listing OS grades agree with displayed grades at their boundaries', () => {
    for (const [os, grade] of [[19.9, 'C'], [20, 'B'], [49.9, 'B'], [50, 'A'], [60, 'A']]) {
        const ipo = publicIpo({ stage: 4, os, pe: 15, ib: 'M & A Securities', predictedGrade: 'C' });
        assert.equal(rules.getIpoGrade(ipo).grade, grade);
        assert.equal(rules.recalcOsGrade(ipo), grade);
    }
    const main = publicIpo({ stage: 4, market: 'Main Market', os: 20, ib: 'Maybank' });
    assert.equal(rules.getIpoGrade(main).grade, 'A');
    assert.equal(rules.recalcOsGrade(main), 'A');
});

test('pre-OS overrides and Post-MITI stay outside post-ballot recalc', () => {
    const ipo = publicIpo({ stage: 6, predictedGrade: 'B', os: 60 });
    assert.equal(rules.getIpoGrade(ipo).grade, 'B');
    assert.equal(rules.recalcOsGrade(ipo), null);
    assert.equal(rules.recalcOsGrade(publicIpo({ stage: 4 })), null);
});

test('browser module and Node module give identical lifecycle and grades', () => {
    const sandbox = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/ipo-rules.js'), 'utf8'), sandbox);
    const ipo = publicIpo({ stage: 6, os: 60 });
    const now = time('2026-10-14T18:00:00+08:00');
    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.IpoRules.resolveLifecycle(ipo, now))), rules.resolveLifecycle(ipo, now));
    assert.equal(sandbox.IpoRules.getIpoGrade({ ...ipo, stage: 4 }).grade, rules.getIpoGrade({ ...ipo, stage: 4 }).grade);
});

test('published dataset sources remain identical and all current dates are supported', () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
    const browser = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../data.js'), 'utf8') + '; IPO_DATA;');
    assert.deepEqual(JSON.parse(JSON.stringify(browser)), data);
    for (const ipo of data) {
        for (const field of ['listingDate', 'openingDate', 'closingDate', 'mitiOpenDate', 'mitiCloseDate']) {
            if (ipo[field]) assert.ok(rules.dateParts(ipo[field]), `${ipo.id}: ${field}`);
        }
    }
});
