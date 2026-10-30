#!/usr/bin/env node
// One-off diagnostic: what does the LIVE dashboard actually see for Big Caring MITI,
// and which radar events fire today? Read-only; nothing here writes data files.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rules = require('../lib/ipo-rules');

const US = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };

async function loadLive() {
    const res = await fetch('https://www.ipobursa.my/data.js?v=live', { headers: US, cache: 'no-store' });
    const src = await res.text();
    console.log('live data.js HTTP', res.status, 'bytes', src.length);
    const sandbox = { window: {}, module: { exports: {} } };
    // eslint-disable-next-line no-eval
    const run = new Function(src + '; return typeof IPO_DATA !== "undefined" ? IPO_DATA : null;');
    return run();
}

function showIpo(list, needle, label) {
    const hit = list.filter(i => needle.test(String(i.companyName) + ' ' + String(i.id)));
    for (const ipo of hit) {
        console.log(`\n--- ${label}: ${ipo.companyName} (${ipo.symbol}) ---`);
        for (const k of ['id', 'stage', 'status', 'price', 'year', 'openingDate', 'closingDate', 'listingDate',
            'mitiOpenDate', 'mitiCloseDate', 'mitiOpenTime', 'mitiCloseTime', 'hasMitiTranche',
            'mitiApplicants', 'mitiAllocationRate', 'mitiResultDate', 'mitiWithdrawn']) {
            if (ipo[k] !== undefined) console.log(`  ${k}: ${JSON.stringify(ipo[k])}`);
        }
        console.log('  resolved lifecycle:', JSON.stringify(rules.resolveLifecycle(ipo)));
        const mitiDl = rules.getDeadline(ipo, 'miti'), pubDl = rules.getDeadline(ipo, 'public');
        console.log('  miti deadline:', mitiDl && mitiDl.toISOString(), '| public deadline:', pubDl && pubDl.toISOString());
        console.log('  miti open now:', rules.isApplicationOpen(ipo, 'miti'), '| public open now:', rules.isApplicationOpen(ipo, 'public'));
    }
    if (!hit.length) console.log(`\n--- ${label}: tiada padanan ---`);
}

function radarEvents(list, kind) {
    const mitiStrip = list.filter(i => i.mitiCloseDate && rules.isApplicationOpen(i, 'miti'))
        .map(i => `${i.companyName} tutup ${i.mitiCloseDate} ${rules.getDeadline(i, 'miti').toISOString()}`);
    const pubStrip = list.filter(i => i.stage === 3 && i.closingDate && rules.isApplicationOpen(i, 'public'))
        .map(i => `${i.companyName} tutup ${i.closingDate}`);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
    const fmt = d => d ? new Date(Number(d) + 8 * 3600e3).toISOString().slice(0, 10) : '';
    const radarToday = list.filter(i => fmt(rules.getDeadline(i, 'public')) === today && i.stage >= 3)
        .map(i => `${i.companyName} stage${i.stage} close ${i.closingDate}`);
    const mitiToday = list.filter(i => i.mitiCloseDate && fmt(rules.getDeadline(i, 'miti')) === today)
        .map(i => `${i.companyName} stage${i.stage} mitiClose ${i.mitiCloseDate}`);
    console.log(`\n### ${kind} (MYT hari ini ${today})`);
    console.log('MITI countdown strip   :', mitiStrip.length ? mitiStrip.join(' || ') : '(kosong)');
    console.log('Public countdown strip :', pubStrip.length ? pubStrip.join(' || ') : '(kosong)');
    console.log('Radar "awam tutup hari ini" (filter sedia ada, stage>=3):', radarToday.length ? radarToday.join(' || ') : '(tiada)');
    console.log('Radar MITI tutup hari ini (mitiCloseDate = hari ini, semua stage):', mitiToday.length ? mitiToday.join(' || ') : '(tiada)');
}

(async () => {
    const live = await loadLive();
    const local = require('../data.json');
    for (const [label, list] of [['LIVE', live], ['LOCAL', local]]) {
        console.log(`\n============ ${label} (${list.length} rekaman) ============`);
        showIpo(list, /caring/i, `${label} Big Caring`);
        showIpo(list, /rosado|wil-key/i, `${label} MITI aktif`);
        radarEvents(list, label);
    }
    simulate(local);
    // Same dashboard, but with the MITI payment deadline the user reports for Big Caring today.
    const todayKey = rules.dayKey(new Date());
    simulate(local.map(r => r.id === 'big-caring-group-bhd'
        ? { ...r, mitiPaymentDeadline: `${todayKey}T17:00:00+08:00` } : r),
        `senario BCG mitiPaymentDeadline=${todayKey}T17:00`);
})().catch(e => { console.error('PROBE GAGAL:', e.message); process.exitCode = 1; });

// Run the real browser radar and MITI strip against the current data and clock.
function simulate(records, label = 'data semasa') {
    const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
    // Everything from the date helpers through the MITI strip, in file order.
    const start = source.indexOf('function parseFlexDate(');
    const end = source.indexOf('function renderPublicCountdownStrip(');
    if (start < 0 || end <= start) throw new Error('helper markers were not found in main.js');
    const helpers = source.slice(start, end);
    const boxes = { 'today-action-radar': { style: {}, innerHTML: '' }, 'miti-countdown-strip': { style: {}, innerHTML: '' } };
    const sandbox = {
        ipoData: records, IpoRules: rules, lucide: undefined,
        window: {}, localStorage: { getItem: () => null, setItem: () => {} },
        document: { getElementById: id => boxes[id] || null, querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, appendChild: () => {} }) },
        navigateToIpo: () => {}, toggleCdStrip: () => {}, alert: () => {}, console
    };
    vm.runInNewContext(helpers + `
        renderTodayActionRadar();
        renderMitiCountdownStrip();`, sandbox);

    const strip = boxes['miti-countdown-strip'].innerHTML;
    console.log(`\n### Simulasi radar + strip MITI — ${label} (jam sebenar)`);
    console.log('MITI strip entries   :', [...strip.matchAll(/<strong style="color:white; font-size:0\.82rem;">([^<]+)<\/strong>/g)].map(m => m[1]).join(' | ') || '(kosong)');
    console.log('MITI strip deadlines :', [...strip.matchAll(/(bayaran MITI|closes) · ([^·]+) · ([0-9:]+ MYT)/g)].map(m => `${m[1]} ${m[2].trim()} ${m[3]}`).join(' | ') || '(tiada)');
    const radar = boxes['today-action-radar'].innerHTML;
    const badges = [...radar.matchAll(/text-transform: uppercase;">([^<]+)<\/span>/g)].map(m => m[1].trim());
    console.log('Radar hari ini       :', badges.length ? badges.join('\n                        ') : '(tiada peristiwa)');
}
