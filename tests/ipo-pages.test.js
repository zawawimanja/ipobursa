const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const { getIpoGrade } = require('../lib/ipo-rules');

const project = path.resolve(__dirname, '..');
const scratch = path.join(project, 'scratch');
const listed = extra => ({ id: 'fixture-berhad', companyName: 'Fixture Berhad',
    symbol: 'FIXTURE', market: 'ACE Market', stage: 5, status: 'Listed', price: 0.27,
    openPrice: 0.7, currentPrice: 0.8, performance: '+999%', ...extra });

function generate(t, data) {
    fs.mkdirSync(scratch, { recursive: true });
    const output = fs.mkdtempSync(path.join(scratch, 'ipo-pages-test-'));
    t.after(() => {
        // Never recursively remove a path outside this test's scratch directory.
        assert.equal(path.dirname(output), path.resolve(scratch));
        assert.ok(path.basename(output).startsWith('ipo-pages-test-'));
        fs.rmSync(output, { recursive: true, force: true });
    });
    const source = path.join(output, 'fixture-data.json');
    fs.writeFileSync(source, JSON.stringify(data));
    execFileSync(process.execPath, [path.join(project, 'generate-ipo-pages.js'),
        '--data-file', source, '--output-dir', output], { encoding: 'utf8' });
    return slug => fs.readFileSync(path.join(output, 'ipo', `${slug}.html`), 'utf8');
}

function performanceSection(html) {
    return html.match(/<section id="listing-performance"[\s\S]*?<\/section>/)?.[0] || '';
}

test('generated EcoSys profile uses current OS, commentary, debut and latest price', t => {
    // Freeze the regression example so tomorrow's market price cannot break this test.
    const ecosys = listed({ id: 'ecosys--malaysia--berhad', companyName: 'EcoSys (Malaysia) Berhad',
        symbol: 'ECOSYS', os: 206.7, analystInsight: '<b>Updated debut commentary</b>' });
    const checkedInPage = path.join(project, 'ipo', 'ecosys-malaysia-berhad.html');
    const original = fs.readFileSync(checkedInPage, 'utf8');
    const html = generate(t, [ecosys])('ecosys-malaysia-berhad');
    assert.match(html, />Listed<\/span>/);
    assert.match(html, /206\.7x/);
    assert.ok(html.includes(ecosys.analystInsight));
    const section = performanceSection(html);
    assert.match(section, /Debut Opening Price[\s\S]*?RM 0\.70[\s\S]*?\+159\.26% vs IPO/);
    assert.match(section, /Latest Recorded Price[\s\S]*?RM 0\.80[\s\S]*?\+196\.30% vs IPO/);
    assert.equal(fs.readFileSync(checkedInPage, 'utf8'), original);
});

test('opening return stays distinct from current return and stale performance strings', t => {
    const html = generate(t, [listed({ currentPrice: 0.2 })])('fixture-berhad');
    const section = performanceSection(html);
    assert.match(section, /Debut Opening Price[\s\S]*?\+159\.26% vs IPO/);
    assert.match(section, /Latest Recorded Price[\s\S]*?-25\.93% vs IPO/);
    assert.doesNotMatch(html, /999%/);
});

test('missing debut never substitutes the latest price, and invalid prices stay unknown', t => {
    const html = generate(t, [listed({ openPrice: null, currentPrice: 0.815 })])('fixture-berhad');
    const section = performanceSection(html);
    assert.match(section, /Debut Opening Price<\/span>\s*<strong[^>]*>-<\/strong>/);
    assert.match(section, /Latest Recorded Price[\s\S]*?RM 0\.815/);
    const invalidHtml = generate(t, [listed({ openPrice: 0, currentPrice: null, price: 0 })])('fixture-berhad');
    assert.doesNotMatch(performanceSection(invalidHtml), /NaN|Infinity|RM 0\.00|\+0\.00%/);
});

test('a flat debut remains a known zero return, and numeric strings retain precision', t => {
    const html = generate(t, [listed({ stage: '5', price: '0.315', openPrice: '0.315', currentPrice: '0.4' })])('fixture-berhad');
    assert.match(performanceSection(html), /RM 0\.315[\s\S]*?\+0\.00% vs IPO/);
    assert.match(performanceSection(html), /RM 0\.40[\s\S]*?\+26\.98% vs IPO/);
});

test('upcoming profiles keep application tools without implying listing results', t => {
    const html = generate(t, [listed({ stage: 4, status: 'Pre-Listing' })])('fixture-berhad');
    assert.equal(performanceSection(html), '');
    assert.doesNotMatch(html, />Listed<\/span>/);
    assert.match(html, /View Sifu Sheets/);
});

test('profiles and directory use the dashboard grade after fresh subscription results', t => {
    const ipo = listed({ stage: 4, status: 'Pre-Listing', predictedGrade: 'C', os: 60 });
    assert.equal(getIpoGrade(ipo).grade, 'A');
    const readPage = generate(t, [ipo]);
    assert.match(readPage('fixture-berhad'), /Grade: A/);
    assert.doesNotMatch(readPage('fixture-berhad'), /Grade: C/);
    assert.match(readPage('index'), /Grade: A/);
});

test('generated grades preserve manual pre-OS grades and identify predicted or unknown grades', t => {
    const entries = [
        listed({ id: 'manual-berhad', companyName: 'Manual Berhad', stage: 3, predictedGrade: 'B', os: null }),
        listed({ id: 'predicted-berhad', companyName: 'Predicted Berhad', stage: 3, os: null, openPrice: null }),
        listed({ id: 'unknown-berhad', companyName: 'Unknown Berhad', market: 'Unknown', predictedGrade: 'A' })
    ];
    const readPage = generate(t, entries);
    assert.equal(getIpoGrade(entries[0]).grade, 'B');
    assert.match(readPage('manual-berhad'), /Grade: B/);
    assert.match(readPage('predicted-berhad'), /Grade: Pred: C/);
    assert.match(readPage('unknown-berhad'), /Grade: Unrated/);
    const directory = readPage('index');
    for (const grade of ['B', 'Pred: C', 'Unrated']) assert.ok(directory.includes(`Grade: ${grade}`));
});

test('an incomplete earnings profile keeps targets unknown and separates PATAMI from group PAT', t => {
    const ipo = listed({ id: 'big-caring-group-bhd', companyName: 'Big Caring Group Bhd',
        stage: 6, status: 'Public Opening Soon', price: 1.08, totalShares: 7381835680,
        financialProfileStatus: 'incomplete', historicalYears: [23, 24, 25],
        projectionHeaders: ['FY26 — PATAMI belum disahkan', 'FY27 — belum disahkan'],
        verifiedPatami25: 122300000, pat25: 122300000, eps25: 1.6567694717,
        groupPat26: 231800000, rev25: 3410000000,
        // Stale fields must never revive an unverified projection or target.
        patF: 231800000, revF: 4000000000, epsGrowthF: 62.1,
        targetPe: 30, sifuTargetPrice: 0.94, fairValue: 1.2,
        mitiAllocationRate: 100, mitiAllocationScope: 'individual-reported', mitiApplicants: 2563 });
    const html = generate(t, [ipo])('big-caring-group-bhd');
    assert.match(html, /Sifu Target Price[\s\S]*?>\s*TBA\s*</);
    assert.match(html, /Target P\/E Ratio[\s\S]*?Belum disahkan/);
    assert.match(html, /P\/E IPO FY25 \(PATAMI\)[\s\S]*?65\.19x/);
    assert.match(html, /PATAMI \(verified\)/);
    assert.match(html, /FY26 — PATAMI belum disahkan/);
    assert.match(html, /Group PAT FY26 yang dilaporkan ialah RM 231\.80 M; angka ini bukan PATAMI/);
    assert.match(html, /122\.30 M/);
    assert.doesNotMatch(html, /4\.00 B|\+62\.1%|RM 0\.94|RM 1\.20|30x/);
    assert.match(html, /Laporan individu: 100% allotted/);
    assert.match(html, /Peruntukan keseluruhan tranche dan OS awam belum disahkan/);
    assert.match(html, /MITI Applicants \(rekod belum disahkan\)/);
});

test('issuer review metadata renders the right historical earnings year without Big Caring assumptions', t => {
    const ipo = listed({ id: 'review-fixture', companyName: 'Review Fixture', stage: 3,
        price: 0.425, totalShares: 100000000, financialProfileStatus: 'incomplete',
        historicalYears: [22, 23, 24], pat24: 3000000, rev24: 30000000, eps24: 3,
        patF: 9000000, sifuTargetPrice: 0.6, targetPe: 20,
        financialReview: { title: 'Unjuran belum tersedia', summary: 'PATAMI FY24 disahkan; unjuran belum disahkan.',
            profitLabel: 'PATAMI sejarah', historicalPe: { year: 24, patami: 3000000 } }
    });
    const html = generate(t, [ipo])('review-fixture');
    assert.match(html, /Offer Price: RM 0\.425/);
    assert.match(html, /P\/E IPO FY24 \(PATAMI\)[\s\S]*?14\.17x/);
    assert.match(html, /PATAMI sejarah/);
    assert.match(html, /Unjuran belum tersedia/);
    assert.match(html, /PATAMI FY24 disahkan; unjuran belum disahkan/);
    assert.match(html, /Unjuran — belum disahkan/);
    assert.doesNotMatch(html, /P\/E IPO FY25|group PAT|Group PAT|PATAMI FY26|231\.80 M|RM 0\.60|20x/);
});

function renderMitiRecord(ipo) {
    const html = fs.readFileSync(path.join(project, 'miti-journal.html'), 'utf8');
    const script = html.slice(html.indexOf('function getMitiValuation('), html.indexOf('function renderFuture('));
    const table = { innerHTML: '' };
    const sandbox = {
        ipoData: [ipo], document: { querySelector: () => table },
        buildSectorLookup: () => ({}), getNormalizedSectorGroup: () => 'Healthcare',
        calculateSifuHype: () => 2, parseFlexDate: () => new Date(2026, 7, 24)
    };
    vm.runInNewContext(script + '\nrenderStage2();', sandbox);
    return { html: table.innerHTML, valuation: sandbox.getMitiValuation(ipo) };
}

test('MITI journal does not substitute IPO price or a trading verdict for incomplete valuation', () => {
    const ipo = listed({ id: 'big-caring-group-bhd', companyName: 'Big Caring Group Bhd',
        stage: 6, price: 1.08, predictedGrade: 'B', sector: 'Healthcare (Pharmacy)',
        financialProfileStatus: 'incomplete', sifuTargetPrice: null,
        calibratedSifuTargetPrice: null, mitiOpenDate: '14-Aug-2026', mitiCloseDate: '24-Aug-2026',
        mitiAllocationScope: 'individual-reported', mitiAllocationRate: 100, mitiApplicants: 2563 });
    const result = renderMitiRecord(ipo);
    assert.equal(result.valuation.tp, null);
    assert.equal(result.valuation.upsidePercent, null);
    assert.match(result.html, /TBA/);
    assert.match(result.html, /PERLU SEMAK PATAMI/);
    assert.match(result.html, /Laporan individu: 100% ALLOTTED/);
    assert.match(result.html, /Peruntukan keseluruhan tranche dan OS awam belum disahkan/);
    assert.doesNotMatch(result.html, /\+0\.0%|SWING|SCALP|WORTH IT|no ballot|RESULTS OUT/);
});

test('MITI journal retains a known target and upside for a complete profile', () => {
    const result = renderMitiRecord(listed({ stage: 2, price: 1, sector: 'Technology',
        predictedGrade: 'A', sifuTargetPrice: 1.5, mitiOpenDate: '14-Aug-2026', mitiCloseDate: '24-Aug-2026' }));
    assert.equal(result.valuation.tp, 1.5);
    assert.equal(result.valuation.upsidePercent, 50);
    assert.match(result.html, /RM 1\.500[\s\S]*?\+50\.0%/);
    assert.match(result.html, /WORTH IT \(A\)/);
});
