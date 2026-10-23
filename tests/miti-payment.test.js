const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const file of ['main.js', 'miti-journal.html']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const start = source.indexOf('function getMitiPaymentState(');
    const end = source.indexOf(file === 'main.js' ? '\nfunction createIPOCard(' : '\n        // Render Stage 2', start);
    const sandbox = {};
    vm.runInNewContext(source.slice(start, end), sandbox);
    const state = sandbox.getMitiPaymentState;

    test(`${file}: payment deadline uses the exact MYT instant independently of old application dates`, () => {
        const record = { mitiOpenDate: '23-Aug-2026', mitiCloseDate: '01-Sep-2026', mitiPaymentDeadline: '2026-10-22T17:00:00+08:00' };
        assert.equal(state(record, Date.parse('2026-10-22T08:59:59Z')).isOpen, true);
        assert.equal(state(record, Date.parse('2026-10-22T09:00:00Z')).isOpen, false);
        assert.equal(state(record, Date.parse('2026-10-23T00:00:00Z')).isOpen, false);
        assert.match(state(record).label, /22 Oct 2026.*17:00 MYT/);
        assert.equal(record.mitiCloseDate, '01-Sep-2026');
    });

    test(`${file}: missing or ambiguous payment dates do not imply a payment phase`, () => {
        for (const raw of [undefined, '', '2026-10-22', '2026-10-22T17:00:00', 'invalid']) {
            assert.equal(state({ mitiPaymentDeadline: raw }), null);
        }
    });
}
