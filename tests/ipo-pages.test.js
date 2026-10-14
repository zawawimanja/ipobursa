const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
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
    assert.match(html, /Decision Engine: Sub or Skip\?/);
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
