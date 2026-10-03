#!/usr/bin/env node
/**
 * sync-isaham-api.js
 *
 * Penyegerakan tarikh/data IPO dari API RASMI iSaham (api.isaham.my) —
 * TIADA Cloudflare, tiada Puppeteer, tiada 403.
 *
 *   GET /v1/ipo/upcoming   — senarai IPO akan datang (5 kredit)
 *   GET /v1/ipo/live       — IPO yang sedang diniagakan (5 kredit)
 *   GET /v1/account/usage  — semak baki kredit (0 kredit)
 *
 * Free tier: 500 kredit/bulan. 1 run sehari = 10 kredit (300/bulan) — muat.
 *
 * SETUP SATU KALI:
 *   1) Buka https://api.isaham.my/portal/dashboard
 *   2) Log masuk dengan akaun iSaham (Facebook/Telegram)
 *   3) Klik "Generate" untuk API token (ditunjuk SEKALI sahaja)
 *   4) Simpan dalam fail .env di root projek:
 *        ISAHAM_API_TOKEN=xxxxx
 *
 * CARA GUNA:
 *   node sync-isaham-api.js            (sync penuh: upcoming + live + usage)
 *   node sync-isaham-api.js --usage    (semak baki kredit sahaja)
 *   node sync-isaham-api.js --force    (sync walaupun dah sync hari ini)
 *   node sync-isaham-api.js --no-push  (jangan git commit/push — untuk GitHub Actions)
 *
 * GUARD KREDIT: jika sync-status.js menunjukkan sync API berjaya HARI INI (MYT),
 * skrip keluar awal (0 kredit). Ini membolehkan laptop (bursa.js) DAN GitHub
 * Actions kedua-duanya memanggil skrip ini tanpa membazir kredit.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { normalizeName, isSafeFuzzyMatch, isJunkCompanyName, toDisplayDate, toIsoDate, toLocalDate } = require('./lib/ipo-utils');

// Load .env manual (sama seperti sync-isaham.js)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = val;
        }
    });
}

const API_BASE = 'https://api.isaham.my/v1';
const TOKEN = process.env.ISAHAM_API_TOKEN;
const DATA_JSON_FILE = path.join(__dirname, 'data.json');
const DATA_JS_FILE = path.join(__dirname, 'data.js');
const DATA_EXPORT_JS_FILE = path.join(__dirname, 'data_export.js');
const SYNC_STATUS_FILE = path.join(__dirname, 'sync-status.js');
// Penanda sync API terakhir (fail berasingan — sync-status.js boleh ditimpa
// oleh sync-isaham.js/scrape, jadi tak boleh diharap untuk guard kredit).
const API_MARKER_FILE = path.join(__dirname, 'isaham-api-status.json');

// Tarikh hari ini (MYT) dalam format YYYY-MM-DD
function todayMyt() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function alreadySyncedToday() {
    try {
        if (!fs.existsSync(API_MARKER_FILE)) return false;
        const st = JSON.parse(fs.readFileSync(API_MARKER_FILE, 'utf8'));
        return st.lastSyncDate === todayMyt();
    } catch (e) {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Padanan IPO (sama logik dengan sync-isaham.js — elak duplikat)
// normalizeName / isSafeFuzzyMatch → lib/ipo-utils.js
// ---------------------------------------------------------------------------

function findExistingIPO(name, existingData) {
    const cleanName = (name || '').trim().toUpperCase();

    const idMap = {
        'EMPIRE': 'empire-premium',
        'MTTSL': 'mtt-shipping',
        'UUE': 'uue-holdings',
        'WENTEL': 'wentel-engineering',
        'SWIFT': 'swift-haulage',
        'GHS [NS]': 'ghs',
        'SEMICO [NS]': 'semico',
        'SALIRAN [NS]': 'saliran-group',
        'SUPREME': 'supreme-consolidated',
        'AZAMJAYA [NS]': 'azam-jaya',
        'KUCINGKO [NS]': 'kucingko',
        'MFGROUP': 'manforce-group',
        'ADNEX': 'adnex',
        '5ER': '5e-resources',
        'SRKK': 'srkk-ai',
        'SRKK AI BERHAD': 'srkk-ai',
        'BIG PHARMACY': 'big-caring-group-bhd',
        'CARING PHARMACY': 'big-caring-group-bhd',
        'BIG CARING': 'big-caring-group-bhd',
        'BIG CARING GROUP': 'big-caring-group-bhd'
    };

    if (idMap[cleanName]) {
        const found = existingData.find(d => d.id === idMap[cleanName]);
        if (found) return found;
    }

    const symbolMatch = existingData.find(d => d.symbol && d.symbol.toUpperCase() === cleanName);
    if (symbolMatch) return symbolMatch;

    const normName = normalizeName(name);
    const exactMatch = existingData.find(d => normalizeName(d.companyName) === normName);
    if (exactMatch) return exactMatch;

    return existingData.find(d => isSafeFuzzyMatch(normalizeName(d.companyName), normName));
}

// ---------------------------------------------------------------------------
// Panggilan API
// ---------------------------------------------------------------------------
async function apiGet(endpoint) {
    const response = await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
        timeout: 30000
    });
    return response.data;
}

// toIsoDate / toDisplayDate → lib/ipo-utils.js
// Format simpanan standard projek = DD-Mon-YYYY (sama dengan sync-public-ipos.js);
// perbandingan dibuat dalam ISO supaya format berbeza tak dikira "berubah".
function sameDate(a, b) {
    const ia = toIsoDate(a), ib = toIsoDate(b);
    return ia !== null && ia === ib;
}

// ---------------------------------------------------------------------------
// Kemas kini data dari /v1/ipo/upcoming
// ---------------------------------------------------------------------------
function applyUpcoming(upcoming, data) {
    let updated = 0;
    (upcoming || []).forEach(entry => {
        const name = entry.name || entry.company_name || entry.companyName;
        if (!name) return;

        const existing = findExistingIPO(name, data);
        const listingDate = toDisplayDate(entry.listing_date || entry.listingDate || entry.listing);
        const closingDate = toDisplayDate(entry.closing_date || entry.closingDate || entry.application_closing_date);
        const price = parseFloat(entry.ipo_price || entry.price || entry.ipoPrice);
        const score = parseFloat(entry.score || entry.isaham_score);
        const sector = entry.sector;

        if (existing) {
            let changed = false;
            if (price && price > 0 && existing.price !== price) { existing.price = price; changed = true; }
            if (listingDate && !sameDate(existing.listingDate, listingDate)) { existing.listingDate = listingDate; changed = true; }
            if (closingDate && !sameDate(existing.closingDate, closingDate)) { existing.closingDate = closingDate; changed = true; }
            if (sector && !existing.sector) { existing.sector = sector; changed = true; }
            if (score && !existing.isahamScore) { existing.isahamScore = score; changed = true; }
            if (!existing.symbol && entry.symbol) { existing.symbol = entry.symbol; changed = true; }
            if (changed) {
                updated++;
                console.log(`  ✓ ${existing.companyName}: tarikh/harga dikemas kini dari API.`);
            }
            // Auto-promote lifecycle
            const now = new Date();
            const today = new Date(); today.setHours(0, 0, 0, 0);

            if (listingDate) {
                const listDate = toLocalDate(listingDate);
                if (existing.stage !== 5 && listDate && listDate <= today) {
                    existing.stage = 5;
                    existing.status = 'Listed';
                    updated++;
                    console.log(`  → ${existing.companyName}: promoted ke Stage 5 (tarikh listing lepas).`);
                }
            }

            // Jika belum tersenarai (Stage 1, 2, atau 6) dan ada closingDate
            if (existing.stage !== 5 && closingDate) {
                const closeDate = toLocalDate(closingDate);
                if (closeDate) closeDate.setHours(23, 59, 59, 999);
                if (closeDate && closeDate >= now) {
                    if (existing.stage !== 3) {
                        existing.stage = 3;
                        existing.status = 'Application Open';
                        updated++;
                        console.log(`  → ${existing.companyName}: promoted ke Stage 3 (permohonan awam dibuka).`);
                    }
                } else if (closeDate && existing.stage < 4) {
                    existing.stage = 4;
                    existing.status = 'Pre-Listing';
                    updated++;
                    console.log(`  → ${existing.companyName}: promoted ke Stage 4 (permohonan awam ditutup).`);
                }
            }
        } else {
            if (isJunkCompanyName(name)) {
                console.log(`  ⚠️  Abaikan nama tak sah dari API: "${name}"`);
                return;
            }
            // IPO baharu — semak jika permohonan sudah ada tarikh tutup
            let initialStage = 1;
            let initialStatus = 'Draft / Exposure Phase';
            if (closingDate) {
                const closeDate = toLocalDate(closingDate);
                closeDate.setHours(23, 59, 59, 999);
                if (closeDate >= new Date()) {
                    initialStage = 3;
                    initialStatus = 'Application Open';
                } else {
                    initialStage = 4;
                    initialStatus = 'Pre-Listing';
                }
            }

            const newEntry = {
                id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                companyName: name,
                stage: initialStage,
                status: initialStatus,
                year: new Date().getFullYear()
            };
            if (price) newEntry.price = price;
            if (listingDate) newEntry.listingDate = listingDate;
            if (closingDate) newEntry.closingDate = closingDate;
            if (sector) newEntry.sector = sector;
            if (score) newEntry.isahamScore = score;
            if (entry.symbol) newEntry.symbol = entry.symbol;
            data.push(newEntry);
            updated++;
            console.log(`  + ${name}: IPO baharu ditambah dari API (Stage ${initialStage}).`);
        }
    });
    return updated;
}

// ---------------------------------------------------------------------------
// Kemas kini data dari /v1/ipo/live (harga semasa untuk yang tersenarai)
// ---------------------------------------------------------------------------
function applyLive(live, data) {
    let updated = 0;
    (live || []).forEach(entry => {
        const name = entry.name || entry.company_name || entry.companyName;
        if (!name) return;
        const existing = findExistingIPO(name, data);
        if (!existing) return;

        const currentPrice = parseFloat(entry.current_price || entry.last_price);
        const changePct = parseFloat(entry.change_percent || entry.daily_change_percent);
        const listingDate = toDisplayDate(entry.listing_date || entry.listingDate);

        existing.stage = 5;
        existing.status = 'Listed';

        if (currentPrice && currentPrice > 0) {
            existing.currentPrice = currentPrice;
            if (existing.price > 0) {
                const perf = ((currentPrice - existing.price) / existing.price) * 100;
                existing.performance = (perf >= 0 ? '+' : '') + perf.toFixed(2) + '%';
            } else if (changePct) {
                existing.performance = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
            }
        } else if (changePct) {
            existing.performance = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
        }
        if (listingDate && !existing.listingDate) existing.listingDate = listingDate;
        if (entry.symbol && !existing.symbol) existing.symbol = entry.symbol;
        updated++;
    });
    return updated;
}

// ---------------------------------------------------------------------------
// UTAMA
// ---------------------------------------------------------------------------
async function main() {
    const usageOnly = process.argv.includes('--usage');
    const force = process.argv.includes('--force');

    if (!usageOnly && !force && alreadySyncedToday()) {
        console.log(`✅ Sync API iSaham dah berjaya hari ini (${todayMyt()}) — langkau (jimat kredit). Guna --force untuk paksa.`);
        return;
    }

    if (!TOKEN) {
        console.error('❌ ISAHAM_API_TOKEN tidak dijumpai dalam .env');
        console.error('   Setup sekali sahaja:');
        console.error('   1) Buka https://api.isaham.my/portal/dashboard');
        console.error('   2) Log masuk dengan akaun iSaham, klik Generate untuk API token');
        console.error('   3) Simpan dalam fail .env:  ISAHAM_API_TOKEN=xxxxx');
        process.exit(1);
    }

    console.log('--- Sync iSaham (API RASMI) ---');

    // Semak baki kredit dahulu (percuma, 0 kredit)
    try {
        const usage = await apiGet('/account/usage');
        const u = usage.data;
        console.log(`💳 Tier: ${u.tier} | Kredit: ${u.credits_used}/${u.credits_limit} (baki ${u.credits_remaining}) | ${u.month}`);
        if (usageOnly) return;
        if (u.credits_remaining < 10) {
            console.error('❌ Baki kredit tidak cukup untuk sync (perlu ≥ 10). Upgrade tier atau tunggu bulan depan.');
            process.exit(1);
        }
    } catch (e) {
        console.error('❌ Gagal semak usage:', e.response ? e.response.status + ' ' + e.response.data?.error?.message : e.message);
        process.exit(1);
    }

    let existingData = [];
    if (fs.existsSync(DATA_JSON_FILE)) {
        existingData = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));
    } else {
        console.warn('data.json not found. Starting fresh.');
    }
    const initialCount = existingData.length;

    // 1) Upcoming
    let apiOk = 0;
    try {
        console.log('\n🕒 /v1/ipo/upcoming...');
        const res = await apiGet('/ipo/upcoming');
        const list = res.data && res.data.upcoming ? res.data.upcoming : (Array.isArray(res.data) ? res.data : []);
        const n = applyUpcoming(list, existingData);
        console.log(`  ${list.length} rekod diterima, ${n} kemas kini.`);
        apiOk++;
    } catch (e) {
        console.error('❌ /ipo/upcoming gagal:', e.response ? e.response.status + ' ' + (e.response.data?.error?.message || '') : e.message);
    }

    // 2) Live
    try {
        console.log('\n📊 /v1/ipo/live...');
        const res = await apiGet('/ipo/live');
        const list = res.data && res.data.live ? res.data.live : (Array.isArray(res.data) ? res.data : []);
        const n = applyLive(list, existingData);
        console.log(`  ${list.length} rekod diterima, ${n} kemas kini.`);
        apiOk++;
    } catch (e) {
        console.error('❌ /ipo/live gagal:', e.response ? e.response.status + ' ' + (e.response.data?.error?.message || '') : e.message);
    }

    if (apiOk === 0) {
        console.error('❌ Kedua-dua endpoint API gagal — data tidak disimpan.');
        process.exit(1);
    }

    // 3) Overrides (overrides.json menang atas data auto)
    const overridesPath = path.join(__dirname, 'overrides.json');
    if (fs.existsSync(overridesPath)) {
        try {
            const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
            let appliedCount = 0;
            existingData.forEach(ipo => {
                const override = overrides[ipo.id];
                if (override) {
                    Object.assign(ipo, override);
                    appliedCount++;
                }
            });
            console.log(`  [Overrides] Diterapkan pada ${appliedCount} IPO.`);
        } catch (e) {
            console.error('  [Overrides] Error:', e.message);
        }
    }

    // Recalculate Sifu V7 target prices automatically for all IPOs
    try {
        const { execSync } = require('child_process');
        console.log('🔄 Running automatic Sifu V7 target price calculator...');
        execSync('node scratch/calc_sifu_targets.js', { stdio: 'inherit', cwd: __dirname });
    } catch (e) {
        console.error('  [Target Calculation] Error:', e.message);
    }

    // 4) Simpan (data.json indent 4 — sama dengan skrip lain, elak diff besar)
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(existingData, null, 4));
    const jsContent = `const IPO_DATA = ${JSON.stringify(existingData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS_FILE, jsContent);
    fs.writeFileSync(DATA_EXPORT_JS_FILE, jsContent);

    const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const syncStatus = {
        lastSync: stamp,
        lastSyncDate: todayMyt(),
        status: "Success",
        source: "isaham-api",
        totalIpos: existingData.length
    };
    fs.writeFileSync(SYNC_STATUS_FILE,
        `const SYNC_STATUS = ${JSON.stringify(syncStatus, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = SYNC_STATUS;\n}\n`);
    fs.writeFileSync(API_MARKER_FILE, JSON.stringify({ lastSyncDate: todayMyt(), lastSync: stamp }, null, 2) + '\n');

    console.log(`\n--- Sync Complete (API) ---`);
    console.log(`Total IPOs: ${existingData.length} (Added ${existingData.length - initialCount} new)`);
    console.log(`Files updated: data.json, data.js, data_export.js, sync-status.js`);

    if (process.argv.includes('--no-push')) {
        console.log('[Git] --no-push: commit/push diuruskan oleh pemanggil (GitHub Actions).');
        return;
    }
    await gitPush();
}

async function gitPush() {
    const { execSync } = require('child_process');
    try {
        const status = execSync('git status --porcelain data.json data.js data_export.js sync-status.js isaham-api-status.json', { cwd: __dirname }).toString().trim();
        if (!status) {
            console.log('\n[Git] No changes to push.');
            return;
        }
        const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        execSync('git add data.json data.js data_export.js sync-status.js isaham-api-status.json', { cwd: __dirname });
        execSync(`git commit -m "Auto sync (API): ${stamp}"`, { cwd: __dirname });
        execSync('git pull --rebase origin main && git push', { cwd: __dirname });
        console.log(`\n[Git] ✅ Pushed to GitHub successfully.`);
    } catch (e) {
        console.error('\n[Git] ❌ Push failed:', e.message);
    }
}

main().catch(e => { console.error(e); process.exit(1); });