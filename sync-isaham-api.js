#!/usr/bin/env node
/**
 * sync-isaham-api.js
 *
 * Penyegerakan tarikh/data IPO dari API RASMI iSaham (api.isaham.my) —
 * Tidak menggunakan laman web Cloudflare atau Puppeteer. API masih boleh
 * menolak token, pelan tanpa akses IPO, atau kuota yang telah habis.
 *
 *   GET /v1/ipo/upcoming   — senarai IPO akan datang (5 kredit)
 *   GET /v1/ipo/live       — IPO yang sedang diniagakan (5 kredit)
 *   GET /v1/account/usage  — semak baki kredit (0 kredit)
 *
 * Endpoint IPO memerlukan pelan Max mengikut https://api.isaham.my/docs.
 * Token Free sahaja tidak memberi akses IPO walaupun masih berbaki kredit.
 * 1 sync penuh menggunakan 10 kredit; guard harian mengelak permintaan berulang.
 *
 * SETUP SATU KALI:
 *   1) Buka https://api.isaham.my/portal/dashboard
 *   2) Log masuk dengan akaun iSaham (Facebook/Telegram)
 *   3) Pastikan pelan akaun mempunyai akses endpoint IPO (Max).
 *      Klik "Generate" untuk API token (ditunjuk SEKALI sahaja)
 *   4) Simpan dalam fail .env di root projek:
 *        ISAHAM_API_TOKEN=xxxxx
 *      Untuk sync berjadual, tetapkan GitHub Actions secret dengan nama sama.
 *
 * CARA GUNA:
 *   node sync-isaham-api.js            (sync penuh: upcoming + live + usage)
 *   node sync-isaham-api.js --usage    (semak baki kredit sahaja)
 *   node sync-isaham-api.js --force    (sync walaupun dah sync hari ini)
 *   node sync-isaham-api.js --no-push  (jangan git commit/push — untuk GitHub Actions)
 *
 * GUARD KREDIT: setiap endpoint yang berjaya HARI INI (MYT) dilangkau.
 * Endpoint gagal dicuba maksimum dua kali sehari, sekurang-kurangnya sejam
 * antara cubaan. --force memintas guard ini secara eksplisit.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const { normalizeName, isSafeFuzzyMatch, isJunkCompanyName, toDisplayDate, toIsoDate } = require('./lib/ipo-utils');
const { resolveLifecycle } = require('./lib/ipo-rules');
const { updateSourceStatus, readSyncStatus, safeMessage } = require('./lib/sync-health');

// Load .env manual (sama seperti sync-isaham.js)
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            if (!(key in process.env)) process.env[key] = val;
        }
    });
}

const API_BASE = 'https://api.isaham.my/v1';
const ENDPOINTS = ['upcoming', 'live'];
const MAX_DAILY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 60 * 60 * 1000;

// Tarikh hari ini (MYT) dalam format YYYY-MM-DD
function todayMyt(now = Date.now()) {
    return new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function persistedTime(value, date) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))) {
        return new Date(value).toISOString();
    }
    // Older API markers stored en-MY day/month and a 12-hour local clock.
    const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?$/i);
    if (match) {
        let hour = +match[4];
        if (match[7]) hour = hour % 12 + (match[7].toLowerCase() === 'pm' ? 12 : 0);
        const time = Date.UTC(+match[3], +match[2] - 1, +match[1], hour, +match[5], +(match[6] || 0)) - 8 * 60 * 60 * 1000;
        return Number.isFinite(time) ? new Date(time).toISOString() : null;
    }
    const fallback = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00+08:00`) : NaN;
    return Number.isFinite(fallback) ? new Date(fallback).toISOString() : null;
}

function restoreCompletedHealth(marker, root, health, now) {
    const sources = readSyncStatus(root).sources || {};
    ENDPOINTS.forEach(name => {
        const source = `isaham-${name}`;
        if (sources[source]) return;
        const state = marker.endpoints[name];
        health(source, {
            status: state.status === 'failed' ? 'failed' : 'success',
            lastSuccess: persistedTime(state.lastSuccess, state.lastSyncDate),
            lastAttempt: persistedTime(state.lastAttempt || state.lastSuccess, state.lastSyncDate),
            message: 'Penanda sync harian digunakan; tiada permintaan API baharu.',
            now: new Date(now)
        }, root);
    });
    if (!sources['isaham-api']) {
        health('isaham-api', {
            status: marker.status === 'partial' ? 'partial' : 'success',
            lastSuccess: persistedTime(marker.lastSync, marker.lastSyncDate),
            lastAttempt: persistedTime(marker.lastSync, marker.lastSyncDate),
            message: 'Sync harian sudah lengkap; timestamp dipulihkan daripada penanda.',
            now: new Date(now)
        }, root);
    }
}

function readApiMarker(root, now) {
    try {
        const marker = JSON.parse(fs.readFileSync(path.join(root, 'isaham-api-status.json'), 'utf8'));
        if (!marker.endpoints) {
            marker.endpoints = {};
            if (marker.lastSyncDate === todayMyt(now)) {
                ENDPOINTS.forEach(name => {
                    marker.endpoints[name] = { lastSyncDate: marker.lastSyncDate, lastSuccess: marker.lastSync };
                });
            }
        }
        return marker;
    } catch (e) {
        return { endpoints: {} };
    }
}

function pendingEndpoints(marker, now, force = false) {
    const today = todayMyt(now);
    return ENDPOINTS.filter(name => {
        if (force) return true;
        const state = marker.endpoints[name] || {};
        if (state.lastSyncDate === today) return false;
        if (state.attemptDate !== today) return true;
        return (state.attempts || 0) < MAX_DAILY_ATTEMPTS &&
            now - Date.parse(state.lastAttempt || 0) >= RETRY_DELAY_MS;
    });
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
async function apiGet(endpoint, token) {
    const axios = require('axios');
    const response = await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 30000
    });
    return response.data;
}

function apiErrorMessage(error) {
    const detail = error.response?.data?.error;
    const code = detail?.code;
    const known = {
        UNAUTHORIZED: 'Token iSaham tidak sah atau telah tamat; kemas kini ISAHAM_API_TOKEN.',
        TIER_UPGRADE_REQUIRED: 'Pelan iSaham tiada akses endpoint IPO; dokumentasi rasmi menetapkan pelan Max.',
        QUOTA_EXCEEDED: 'Kuota kredit iSaham telah habis.',
        RATE_LIMITED: 'Had permintaan iSaham dicapai; cuba semula kemudian.'
    };
    if (known[code]) return `${code}: ${known[code]}`;
    if (error.response?.status === 401) return known.UNAUTHORIZED;
    return safeMessage([error.response?.status, code, detail?.message || error.message]
        .filter(Boolean).join(': ') || 'Permintaan API gagal.');
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
function applyUpcoming(upcoming, data, now = Date.now()) {
    let updated = 0;
    (upcoming || []).forEach(entry => {
        const name = entry.name || entry.company_name || entry.companyName;
        if (!name) return;

        const existing = findExistingIPO(name, data);
        const listingDate = toDisplayDate(entry.listing_date || entry.listingDate || entry.listing);
        const closingDate = toDisplayDate(entry.closing_date || entry.closingDate || entry.application_closing_date);
        const openingDate = toDisplayDate(entry.opening_date || entry.openingDate || entry.application_opening_date);
        const price = parseFloat(entry.ipo_price || entry.price || entry.ipoPrice);
        const score = parseFloat(entry.score || entry.isaham_score);
        const sector = entry.sector;

        if (existing) {
            let changed = false;
            if (price && price > 0 && existing.price !== price) { existing.price = price; changed = true; }
            if (listingDate && !sameDate(existing.listingDate, listingDate)) { existing.listingDate = listingDate; changed = true; }
            if (closingDate && !sameDate(existing.closingDate, closingDate)) { existing.closingDate = closingDate; changed = true; }
            if (openingDate && !sameDate(existing.openingDate, openingDate)) { existing.openingDate = openingDate; changed = true; }
            if (sector && !existing.sector) { existing.sector = sector; changed = true; }
            if (score && !existing.isahamScore) { existing.isahamScore = score; changed = true; }
            if (!existing.symbol && entry.symbol) { existing.symbol = entry.symbol; changed = true; }
            if (changed) {
                updated++;
                console.log(`  ✓ ${existing.companyName}: tarikh/harga dikemas kini dari API.`);
            }
            const lifecycle = resolveLifecycle(existing, now);
            if (existing.stage !== lifecycle.stage || existing.status !== lifecycle.status) {
                Object.assign(existing, lifecycle);
                updated++;
            }
        } else {
            if (isJunkCompanyName(name)) {
                console.log(`  ⚠️  Abaikan nama tak sah dari API: "${name}"`);
                return;
            }
            const newEntry = {
                id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                companyName: name,
                stage: 1,
                status: 'Draft / Exposure Phase',
                year: new Date(now).getFullYear()
            };
            if (price) newEntry.price = price;
            if (listingDate) newEntry.listingDate = listingDate;
            if (closingDate) newEntry.closingDate = closingDate;
            if (openingDate) newEntry.openingDate = openingDate;
            if (sector) newEntry.sector = sector;
            if (score) newEntry.isahamScore = score;
            if (entry.symbol) newEntry.symbol = entry.symbol;
            Object.assign(newEntry, resolveLifecycle(newEntry, now));
            data.push(newEntry);
            updated++;
            console.log(`  + ${name}: IPO baharu ditambah dari API (Stage ${newEntry.stage}).`);
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
function saveDatabase(data, root) {
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(data, null, 4));
    fs.writeFileSync(path.join(root, 'data.js'), js);
    fs.writeFileSync(path.join(root, 'data_export.js'), js);
}

function recalculateTargets(root) {
    execFileSync(process.execPath, [path.join(root, 'scratch', 'calc_sifu_targets.js')], {
        stdio: 'inherit', cwd: root
    });
}

async function syncApi(options = {}) {
    const root = options.root || __dirname;
    const now = Number(options.now ?? Date.now());
    const today = todayMyt(now);
    const stamp = new Date(now).toISOString();
    const markerFile = path.join(root, 'isaham-api-status.json');
    const marker = readApiMarker(root, now);
    const pending = pendingEndpoints(marker, now, options.force);
    const health = options.updateSourceStatus || updateSourceStatus;
    const record = (name, status, message, extra = {}) => health(name, {
        status, lastAttempt: stamp, message, now: new Date(now), ...extra
    }, root);
    const complete = () => ENDPOINTS.every(name => marker.endpoints[name]?.lastSyncDate === today);
    const partialStatus = () => ENDPOINTS.some(name => marker.endpoints[name]?.lastSyncDate === today) ? 'partial' : 'failed';

    if (!options.usageOnly && complete() && !options.force) {
        if (marker.targetStatus === 'failed') {
            try {
                (options.recalculateTargets || recalculateTargets)(root);
                const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
                data.forEach(ipo => Object.assign(ipo, resolveLifecycle(ipo, now)));
                saveDatabase(data, root);
                marker.targetStatus = 'success';
                marker.status = 'success';
                fs.writeFileSync(markerFile, JSON.stringify(marker, null, 2) + '\n');
                record('isaham-api', 'success', 'Pengiraan target dipulihkan; endpoint sudah berjaya hari ini.', {
                    lastSuccess: marker.lastSync || stamp
                });
            } catch (error) {
                record('isaham-api', 'partial', `Pengiraan target gagal: ${error.message}`);
                return { status: 'partial', skipped: true };
            }
        }
        restoreCompletedHealth(marker, root, health, now);
        console.log(`✅ Kedua-dua endpoint iSaham sudah berjaya hari ini (${today}) — langkau.`);
        return { status: marker.status === 'partial' ? 'partial' : 'success', skipped: true };
    }
    if (!options.usageOnly && pending.length === 0) {
        const status = partialStatus();
        const message = 'Cubaan endpoint gagal ditangguh: tunggu satu jam atau had dua cubaan sehari tercapai.';
        // A guard skip does not change the timestamps of the actual attempts.
        const previous = readSyncStatus(root).sources?.['isaham-api'];
        health('isaham-api', { status, message, lastAttempt: previous?.lastAttempt || null, now: new Date(now) }, root);
        console.warn(`⚠️ ${message}`);
        return { status, skipped: true };
    }
    const token = String(options.token || process.env.ISAHAM_API_TOKEN || '').trim();
    if (!token && !options.request) {
        const message = 'ISAHAM_API_TOKEN tidak ditetapkan. Tambah token akaun dengan akses IPO ke .env atau GitHub Actions secret.';
        record('isaham-api', 'failed', message);
        console.error(`❌ ${message}`);
        return { status: 'failed', message };
    }
    const request = options.request || (endpoint => apiGet(endpoint, token));
    const delay = options.delay || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    const requestPaced = async endpoint => {
        await delay(550); // Free tier: maksimum dua permintaan sesaat.
        return request(endpoint);
    };
    let usage;
    try {
        const response = await requestPaced('/account/usage');
        usage = response.data;
        if (!usage || !Number.isFinite(Number(usage.credits_remaining))) {
            throw new Error('Respons usage tidak sah.');
        }
        console.log(`💳 Baki kredit iSaham: ${usage.credits_remaining}`);
        if (options.usageOnly) return { status: 'success', usage };
        const required = pending.length * 5;
        if (Number(usage.credits_remaining) < required) {
            throw new Error(`Baki kredit tidak cukup (perlu ${required}).`);
        }
    } catch (error) {
        const status = partialStatus();
        const message = safeMessage(`Gagal semak kredit: ${apiErrorMessage(error)}`);
        record('isaham-api', status, message);
        console.error(`❌ ${message}`);
        return { status, message };
    }

    const dataFile = path.join(root, 'data.json');
    let data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const initialCount = data.length;
    let successes = 0;
    for (const name of pending) {
        const previous = marker.endpoints[name] || {};
        const state = {
            ...previous,
            attemptDate: today,
            attempts: previous.attemptDate === today ? (previous.attempts || 0) + 1 : 1,
            lastAttempt: stamp
        };
        marker.endpoints[name] = state;
        // Persist before a charged request, including failed runs.
        fs.writeFileSync(markerFile, JSON.stringify(marker, null, 2) + '\n');
        try {
            const response = await requestPaced(`/ipo/${name}`);
            const list = Array.isArray(response.data) ? response.data : response.data?.[name];
            if (!Array.isArray(list)) throw new Error(`Respons /ipo/${name} tidak sah.`);
            const count = name === 'upcoming' ? applyUpcoming(list, data, now) : applyLive(list, data);
            // Do not mark charged data complete until its fields are persisted.
            saveDatabase(data, root);
            state.lastSyncDate = today;
            state.lastSuccess = stamp;
            state.status = 'success';
            state.message = `${list.length} rekod, ${count} kemas kini.`;
            successes++;
            record(`isaham-${name}`, 'success', state.message);
            console.log(`✅ /ipo/${name}: ${state.message}`);
        } catch (error) {
            state.status = 'failed';
            state.message = safeMessage(`Endpoint gagal: ${apiErrorMessage(error)}`);
            record(`isaham-${name}`, 'failed', state.message);
            console.error(`❌ /ipo/${name}: ${state.message}`);
        }
        fs.writeFileSync(markerFile, JSON.stringify(marker, null, 2) + '\n');
    }

    let targetError = null;
    if (successes > 0) {
        const overridesFile = path.join(root, 'overrides.json');
        const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
        data.forEach(ipo => {
            Object.assign(ipo, overrides[ipo.id] || {});
            Object.assign(ipo, resolveLifecycle(ipo, now));
        });
        // Calculator must see fresh API fields, then exports must see its results.
        saveDatabase(data, root);
        try {
            (options.recalculateTargets || recalculateTargets)(root);
            data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            // Calculator applies overrides too; resolve dated states afterwards.
            data.forEach(ipo => Object.assign(ipo, resolveLifecycle(ipo, now)));
        } catch (error) {
            targetError = error.message;
            console.error('❌ Pengiraan target gagal:', targetError);
        }
        saveDatabase(data, root);
    }
    const endpointFailure = pending.some(name => marker.endpoints[name].status === 'failed');
    const status = complete() && !targetError && !endpointFailure ? 'success' :
        (successes > 0 || complete() ? 'partial' : partialStatus());
    if (successes > 0) marker.targetStatus = targetError ? 'failed' : 'success';
    marker.status = status;
    if (complete() && successes > 0 && !endpointFailure) {
        marker.lastSyncDate = today;
        marker.lastSync = stamp;
    }
    fs.writeFileSync(markerFile, JSON.stringify(marker, null, 2) + '\n');
    const failedEndpoint = pending.find(name => marker.endpoints[name].status === 'failed');
    const message = targetError ? 'Data API disimpan, tetapi pengiraan target gagal.' :
        safeMessage(`${ENDPOINTS.filter(name => marker.endpoints[name]?.lastSyncDate === today).length}/2 endpoint berjaya hari ini; ${data.length} IPO (+${data.length - initialCount}).` +
            (failedEndpoint ? ` ${marker.endpoints[failedEndpoint].message}` : ''));
    record('isaham-api', status, message, { legacy: { totalIpos: data.length } });
    console.log(`--- Sync API: ${status.toUpperCase()} — ${message}`);
    return { status, successes, message };
}

async function main() {
    loadEnv();
    const result = await syncApi({
        usageOnly: process.argv.includes('--usage'),
        force: process.argv.includes('--force')
    });
    if (!process.argv.includes('--no-push') && !process.argv.includes('--usage')) await gitPush();
    if (result.status !== 'success') process.exitCode = 1;
    return result;
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
        const files = ['data.json', 'data.js', 'data_export.js', 'sync-status.js', 'isaham-api-status.json']
            .filter(file => fs.existsSync(path.join(__dirname, file)));
        execFileSync('git', ['add', ...files], { cwd: __dirname });
        execSync(`git commit -m "Auto sync (API): ${stamp}"`, { cwd: __dirname });
        execSync('git pull --rebase origin main && git push', { cwd: __dirname });
        console.log(`\n[Git] ✅ Pushed to GitHub successfully.`);
    } catch (e) {
        console.error('\n[Git] ❌ Push failed:', e.message);
    }
}

module.exports = { syncApi, pendingEndpoints, readApiMarker, todayMyt, applyUpcoming, applyLive, main };
if (require.main === module) {
    main().catch(e => {
        updateSourceStatus('isaham-api', { status: 'failed', message: e.message });
        console.error(e.message);
        process.exitCode = 1;
    });
}
