#!/usr/bin/env node
/**
 * update-miti-applicants.js
 *
 * Kemas kini "Jumlah Pelabur Mohon Saham" (mitiApplicants) untuk tranche MITI
 * aktif (Big Caring, IOIPG REIT, MyDCD) di SEMUA fail data sekaligus:
 *   - data.json, data.js, data_export.js
 *   - overrides.json (perlindungan auto-sync)
 *
 * Penggunaan:
 *   node scratch/update-miti-applicants.js 653 86 115
 *   (susunan: Big Caring, IOIPG Malaysia REIT, MyDCD)
 *
 * Tanpa argumen -> mod interaktif (tanya satu-satu).
 * Nombor diambil dari portal SahamOnline MITI (login view) ->
 * "Jumlah Pelabur Mohon Saham" untuk setiap syarikat.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

// Susunan mesti sepadan dengan argumen baris arahan
const TARGETS = [
    { id: 'big-caring-group-bhd', label: 'Big Caring Group Bhd' },
    { id: 'ioipg-malaysia-reit',   label: 'IOIPG Malaysia REIT' },
    { id: 'mydcd-berhad',          label: 'MyDCD Berhad' },
];

function readJSON(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeDataFiles(data) {
    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS, js, 'utf8');
    fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');
}

async function promptValues() {
    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(res => readline.question(q, a => res(a.trim())));
    const values = {};
    for (const t of TARGETS) {
        const raw = await ask(`Jumlah pemohon untuk ${t.label} (${t.id}): `);
        values[t.id] = parseInt(raw, 10);
    }
    readline.close();
    return values;
}

function validate(values) {
    for (const t of TARGETS) {
        const v = values[t.id];
        if (!Number.isInteger(v) || v <= 0) {
            console.error(`❌ Nilai tidak sah untuk ${t.label}: "${v}". Mesti integer positif.`);
            console.error('Contoh: node scratch/update-miti-applicants.js 653 86 115');
            process.exit(1);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    let values;
    if (args.length >= TARGETS.length) {
        values = {};
        TARGETS.forEach((t, i) => { values[t.id] = parseInt(args[i], 10); });
    } else {
        console.log('Tiada argumen lengkap — masuk mod interaktif.\n');
        values = await promptValues();
    }
    validate(values);

    // 1) Data files
    const data = readJSON(DATA_JSON);
    const before = {};
    for (const t of TARGETS) {
        const ipo = data.find(x => x.id === t.id);
        if (!ipo) { console.error(`⚠️  ${t.id} tidak ditemui dalam data.json — skip`); continue; }
        before[t.id] = ipo.mitiApplicants;
        ipo.mitiApplicants = values[t.id];
    }
    writeDataFiles(data);

    // 2) Overrides (perlindungan auto-sync)
    const overrides = readJSON(OVERRIDES_JSON);
    for (const t of TARGETS) {
        if (!overrides[t.id]) overrides[t.id] = {};
        overrides[t.id].mitiApplicants = values[t.id];
    }
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    // 3) Ringkasan
    console.log('\n✅ mitiApplicants dikemas kini:');
    for (const t of TARGETS) {
        console.log(`   ${t.label.padEnd(24)} ${before[t.id] ?? '-'} → ${values[t.id]}`);
    }
    console.log('\n   Fail dikemas kini: data.json, data.js, data_export.js, overrides.json');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
