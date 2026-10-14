const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
    parseMitiDate,
    normalizedCompany,
    matchEntry,
    parsePublicOffers,
    unwrapLivewire,
    parseMaklumatJSON,
    saveData,
    readData,
    updateFields
} = require('../lib/miti-sync');
const { syncPortal, applyOffers } = require('../scratch/sync-miti-portal-dates');
const { applyResults, checkResponse } = require('../scratch/sync-miti-applicants-login');
const { readSyncStatus } = require('../lib/sync-health');

function createFixtureProject(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ipobursa-miti-sync-'));
    t.after(() => {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith('ipobursa-miti-sync-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    const initialData = [
        {
            id: 'unioleo-holdings-berhad',
            companyName: 'Unioleo Holdings Berhad',
            symbol: 'UNIOLEO',
            market: 'ACE Market',
            price: 0.28,
            stage: 1,
            status: 'Draft / Exposure Phase',
            year: 2026,
            sector: 'Industrial'
        },
        {
            id: 'demo-listed-berhad',
            companyName: 'Demo Listed Berhad',
            symbol: 'DEMO',
            market: 'Main Market',
            price: 1.00,
            stage: 5,
            status: 'Listed',
            year: 2025
        }
    ];
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(initialData, null, 4));
    const js = `const IPO_DATA = ${JSON.stringify(initialData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(path.join(root, 'data.js'), js);
    fs.writeFileSync(path.join(root, 'data_export.js'), js);
    fs.writeFileSync(path.join(root, 'overrides.json'), JSON.stringify({}, null, 4));
    return { root, initialData };
}

test('parseMitiDate parses multiple valid formats and rejects invalid dates', () => {
    assert.equal(parseMitiDate('14/10/2026'), '14-Oct-2026');
    assert.equal(parseMitiDate('2026-10-14'), '14-Oct-2026');
    assert.equal(parseMitiDate('2026-10-14 00:00:00'), '14-Oct-2026');
    assert.equal(parseMitiDate('14 Ogos 2026'), '14-Aug-2026');
    assert.equal(parseMitiDate('28 September 2026'), '28-Sep-2026');
    assert.equal(parseMitiDate('11 Oktober 2026'), '11-Oct-2026');
    assert.equal(parseMitiDate('14-Oct-2026'), '14-Oct-2026');

    // Invalid dates
    assert.equal(parseMitiDate('31/02/2026'), null);
    assert.equal(parseMitiDate(''), null);
    assert.equal(parseMitiDate(null), null);
    assert.equal(parseMitiDate('not a date'), null);
});

test('normalizedCompany and matchEntry cleanly match companies without suffix/punctuation', () => {
    assert.equal(normalizedCompany('Unioleo Holdings Berhad'), 'unioleoholdings');
    assert.equal(normalizedCompany('UNIOLEO HOLDINGS BHD.'), 'unioleoholdings');

    const data = [
        { id: 'unioleo', companyName: 'Unioleo Holdings Berhad' }
    ];
    assert.equal(matchEntry(data, 'UNIOLEO HOLDINGS BERHAD')?.id, 'unioleo');
    assert.equal(matchEntry(data, 'Unknown Sdn Bhd'), undefined);

    const ambiguousData = [
        { id: 'a1', companyName: 'Alpha Bhd' },
        { id: 'a2', companyName: 'Alpha Berhad' }
    ];
    assert.throws(() => matchEntry(ambiguousData, 'Alpha Bhd'), /Ambiguous MITI company match/);
});

test('parsePublicOffers extracts announcements accurately and ignores unrelated banner text', () => {
    const html = `
        <html>
        <body>
            <div>Semakan Keputusan Kini Dibuka Keputusan permohonan bagi syarikat berikutkini boleh disemak: SKA CAPITAL BERHAD Sila log masuk ke akaun anda untuk melihat keputusan permohonan.</div>
            <p>Bermula 1 Januari 2026, tempoh Moratorium SKB diubah ke tempoh asal 180 hari.</p>
            <h4>Makluman pembukaan saham bagi syarikat UNIOLEO HOLDINGS BERHAD adalah bermula pada 14/10/2026 sehingga 21/10/2026.</h4>
            <p>Sila log masuk ke akaun untuk memohon.</p>
        </body>
        </html>
    `;
    const offers = parsePublicOffers(html);
    assert.equal(offers.length, 1);
    assert.equal(offers[0].company, 'UNIOLEO HOLDINGS BERHAD');
    assert.equal(offers[0].open, '14-Oct-2026');
    assert.equal(offers[0].close, '21-Oct-2026');
});

test('parsePublicOffers handles multiple announcements and explicit empty states', () => {
    const multiHtml = `
        <div class="announcements">
            <p>Makluman pembukaan saham bagi syarikat ABC FOOD BERHAD adalah bermula pada 01/10/2026 sehingga 10/10/2026.</p>
            <p>Makluman pembukaan saham bagi syarikat XYZ TECH BHD adalah bermula pada 15/10/2026 sehingga 25/10/2026.</p>
        </div>
    `;
    const offers = parsePublicOffers(multiHtml);
    assert.equal(offers.length, 2);
    assert.equal(offers[0].company, 'ABC FOOD BERHAD');
    assert.equal(offers[1].company, 'XYZ TECH BHD');

    const emptyHtml = '<div>Tiada tawaran saham awam dibuka buat masa ini.</div>';
    assert.deepEqual(parsePublicOffers(emptyHtml), []);

    const brokenHtml = '<div>Laman web sedang diselenggara.</div>';
    assert.throws(() => parsePublicOffers(brokenHtml), /MITI portal returned no recognized offer announcement/);
});

test('unwrapLivewire unrolls Livewire collection meta tags', () => {
    const raw = [
        [
            { name: 'Demo Berhad', tarikh: '2026-10-20' }
        ],
        { s: 'clctn' }
    ];
    const unwrapped = unwrapLivewire(raw);
    assert.deepEqual(unwrapped, [{ name: 'Demo Berhad', tarikh: '2026-10-20' }]);
});

test('parseMaklumatJSON extracts profiles and detects expired session or missing data', () => {
    const validSnapshot = JSON.stringify({
        data: {
            profiles: [
                [
                    {
                        name: 'Unioleo Holdings Berhad',
                        tarikh_akhir_tiers: '21/10/2026',
                        rating: '15,000,000',
                        stockIndication: 'RM 0.28'
                    }
                ],
                { s: 'clctn' }
            ]
        }
    });

    const validHtml = `<div wire:snapshot='${validSnapshot}'></div>`;
    const results = parseMaklumatJSON(validHtml);
    assert.equal(results.length, 1);
    assert.equal(results[0].company, 'Unioleo Holdings Berhad');
    assert.equal(results[0].mitiCloseDate, '21-Oct-2026');
    assert.equal(results[0].offerShares, 15000000);
    assert.equal(results[0].price, 0.28);

    const loginHtml = '<form><input id="data.username" /></form>';
    assert.throws(() => parseMaklumatJSON(loginHtml), /MITI login was not accepted/);

    const emptyHtml = '<div><div>';
    assert.throws(() => parseMaklumatJSON(emptyHtml), /MITI authenticated share page was not recognized/);
});

test('syncPortal updates data.json and sync-status on successful fetch and fails closed on error', async t => {
    const project = createFixtureProject(t);
    const mockHtml = '<h4>Makluman pembukaan saham bagi syarikat UNIOLEO HOLDINGS BERHAD adalah bermula pada 14/10/2026 sehingga 21/10/2026.</h4>';

    const result = await syncPortal({
        root: project.root,
        fetch: async () => ({ ok: true, text: async () => mockHtml })
    });
    assert.equal(result.found, 1);
    assert.equal(result.updated, 1);

    const { data, overrides } = readData(project.root);
    const unioleo = data.find(ipo => ipo.id === 'unioleo-holdings-berhad');
    assert.equal(unioleo.stage, 2);
    assert.equal(unioleo.status, 'MITI Allocation Phase');
    assert.equal(unioleo.mitiOpenDate, '14-Oct-2026');
    assert.equal(unioleo.mitiCloseDate, '21-Oct-2026');
    assert.equal(unioleo.hasMitiTranche, true);
    assert.equal(overrides['unioleo-holdings-berhad']?.stage, 2);

    const health = readSyncStatus(project.root);
    assert.equal(health.sources['miti-portal'].status, 'success');

    // Now test failure preserves existing data and marks status failed
    await assert.rejects(async () => {
        await syncPortal({
            root: project.root,
            fetch: async () => ({ ok: false, status: 403 })
        });
    }, /MITI public portal HTTP 403/);

    const healthAfterFail = readSyncStatus(project.root);
    assert.equal(healthAfterFail.sources['miti-portal'].status, 'failed');
    // Ensure previous updated data is still intact
    const dataAfterFail = readData(project.root).data;
    assert.equal(dataAfterFail.find(ipo => ipo.id === 'unioleo-holdings-berhad').stage, 2);
});

test('applyResults updates MITI allocation details without demoting listed stocks', t => {
    const project = createFixtureProject(t);
    const found = [
        {
            company: 'Unioleo Holdings Berhad',
            mitiCloseDate: '21-Oct-2026',
            offerShares: 20000000,
            price: 0.28
        },
        {
            company: 'Demo Listed Berhad',
            mitiCloseDate: '20-Oct-2026',
            offerShares: 5000000,
            price: 0.50
        }
    ];

    const result = applyResults(found, project.root);
    assert.equal(result.updated, 2);
    assert.equal(result.unmatched, 0);

    const { data } = readData(project.root);
    const unioleo = data.find(ipo => ipo.id === 'unioleo-holdings-berhad');
    assert.equal(unioleo.stage, 2);
    assert.equal(unioleo.mitiOfferShares, 20000000);
    assert.equal(unioleo.price, 0.28);

    const listed = data.find(ipo => ipo.id === 'demo-listed-berhad');
    // Listed stage 5 must not be demoted or have its price overwritten
    assert.equal(listed.stage, 5);
    assert.equal(listed.price, 1.00);
    assert.equal(listed.mitiOfferShares, 5000000);
});

test('checkResponse throws clear errors for missing response or HTTP error status', () => {
    assert.throws(() => checkResponse(null, 'test phase'), /returned no HTTP response/);
    assert.throws(() => checkResponse({ status: () => 403 }, 'login page'), /MITI login page HTTP 403/);
    assert.throws(() => checkResponse({ status: () => 500 }, 'share page'), /MITI share page HTTP 500/);
    assert.doesNotThrow(() => checkResponse({ status: () => 200 }, 'page'));
});
