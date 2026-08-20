#!/usr/bin/env node
/**
 * sync-shariah.js
 *
 * Auto-sync status SHARIAH untuk SEMUA IPO dari SENARAI RASMI Securities
 * Commission Malaysia (SC) — "Shariah Status for Companies Seeking Listing":
 *
 *   https://www.sc.com.my/development/icm/shariah-compliant-securities/
 *       shariah-status-for-companies-seeking-listing-on-bursa-malaysia-securities-berhad
 *
 * Jadual mengandungi ~159 rekod: Market | Nama | Principal Adviser | Tarikh | Status
 * (Compliant / Non-Compliant). Setiap IPO dalam data.json dipadankan ikut nama
 * syarikat (normalisasi, dua hala) dan field `shariah` dikemas:
 *   true  = Compliant
 *   false = Non-Compliant
 *   undefined kekal (belum dinilai SC / tiada dalam senarai) → badge "SYARIAH?"
 *
 * Overrides.json (manual) MENANG atas auto-sync — kalau ada `shariah` dalam
 * override untuk sesebuah IPO, ia tidak diubah. Contoh: IOIPG REIT di-override
 * `false` walaupun belum dinilai SC.
 *
 * CARA GUNA:
 *   node sync-shariah.js            (update data + git push)
 *   node sync-shariah.js --no-push  (update data sahaja — untuk GitHub Actions)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const SC_URL = 'https://www.sc.com.my/development/icm/shariah-compliant-securities/shariah-status-for-companies-seeking-listing-on-bursa-malaysia-securities-berhad';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Normalisasi nama untuk padanan (buang berhad/bhd/group dll)
// ---------------------------------------------------------------------------
function normalizeName(name) {
    return (name || '')
        .toLowerCase()
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/berhad|bhd|group|holdings|corp|corporation|limited|sdn\s*bhd/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// ---------------------------------------------------------------------------
// Scrape senarai SC
// ---------------------------------------------------------------------------
async function fetchShariahList() {
    const resp = await axios.get(SC_URL, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8' },
        timeout: 30000,
    });
    const $ = cheerio.load(resp.data);
    const rows = [];

    $('table tr').each((i, tr) => {
        const cells = $(tr).find('td').map((j, td) => $(td).text().trim()).get();
        if (cells.length < 6) return;
        const statusText = cells[5].toLowerCase();
        if (!statusText.includes('compliant') && !statusText.includes('non-compliant')) return;
        const name = cells[2].replace(/\s+/g, ' ').trim();
        if (!name || /^name of securities$/i.test(name)) return;
        const status = statusText.includes('non-compliant') ? false : true;
        rows.push({ name, status });
    });

    return rows;
}

// ---------------------------------------------------------------------------
// UTAMA
// ---------------------------------------------------------------------------
async function main() {
    const doPush = !process.argv.includes('--no-push');

    let list;
    try {
        list = await fetchShariahList();
    } catch (e) {
        console.error('❌ Gagal fetch senarai SC:', e.response ? e.response.status + ' ' + e.message : e.message);
        process.exit(1);
    }
    if (list.length < 50) {
        console.error(`❌ Senarai SC mencurigakan (hanya ${list.length} rekod) — abort untuk elak data rosak.`);
        process.exit(1);
    }
    console.log(`📋 Senarai SC: ${list.length} rekod shariah (Compliant / Non-Compliant).`);

    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));

    // Index senarai SC ikut nama ternormalisasi
    const scIndex = new Map();
    for (const r of list) {
        const key = normalizeName(r.name);
        if (!scIndex.has(key)) scIndex.set(key, r);
    }

    let updated = 0;
    let notFound = [];

    // Marker "[NS]" dalam symbol/companyName = isaham/i3investor dah sahkan NON-shariah
    const nsMarkerCount = [];

    for (const ipo of data) {
        if (overrides[ipo.id] && overrides[ipo.id].shariah !== undefined) {
            continue; // manual override menang
        }

        // (a) Marker [NS] — panggil nama dari i3investor: symbol akhir "[NS]" = non-shariah
        const symNS = /\[NS\]/i.test(ipo.symbol || '') || /\[NS\]/i.test(ipo.companyName || '');
        if (symNS && ipo.shariah !== false) {
            if (ipo.shariah !== undefined) {
                console.log(`   [NS marker] ${ipo.companyName}: ${ipo.shariah} → false`);
            }
            ipo.shariah = false;
            updated++;
            nsMarkerCount.push(ipo.companyName);
            continue;
        }

        // (b) Padanan nama dengan senarai SC
        const key = normalizeName(ipo.companyName);
        const match = scIndex.get(key);
        if (!match) {
            // Cuba padanan satu hala (SC nama lebih panjang)
            for (const [k, r] of scIndex) {
                if (k.includes(key) && key.length >= 8) { notFound.push(ipo.companyName); break; }
            }
            continue;
        }
        if (ipo.shariah !== match.status) {
            console.log(`   ${ipo.companyName}: ${ipo.shariah === undefined ? '(tiada)' : ipo.shariah} → ${match.status}`);
            ipo.shariah = match.status;
            updated++;
        }
    }

    if (updated === 0) {
        console.log('ℹ️  Tiada perubahan status shariah.');
    } else {
        fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
        const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
        fs.writeFileSync(DATA_JS, js, 'utf8');
        fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');
        console.log(`✅ ${updated} IPO dikemas kini → data.json, data.js, data_export.js`);
    }

    const withS = data.filter(x => x.shariah === true).length;
    const without = data.filter(x => x.shariah === undefined).length;
    console.log(`📊 Ringkasan: ${withS} shariah | ${data.length - withS - without} tak shariah | ${without} belum dinilai (SYARIAH?)`);

    if (doPush && process.env.GITHUB_ACTIONS !== 'true') {
        await gitPush();
    }
}

async function gitPush() {
    const { execSync } = require('child_process');
    try {
        const status = execSync('git status --porcelain data.json data.js data_export.js', { cwd: ROOT }).toString().trim();
        if (!status) return;
        const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        execSync('git add data.json data.js data_export.js', { cwd: ROOT });
        execSync(`git commit -m "Auto sync shariah SC: ${stamp}"`, { cwd: ROOT });
        execSync('git push', { cwd: ROOT });
        console.log('\n[Git] ✅ Pushed ke GitHub.');
    } catch (e) {
        console.error('\n[Git] ❌ Push gagal:', e.message);
    }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });