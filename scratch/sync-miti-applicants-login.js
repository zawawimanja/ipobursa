#!/usr/bin/env node
/**
 * sync-miti-applicants-login.js
 *
 * Auto-sync "Jumlah Pelabur Mohon Saham" + "Jumlah Tawaran Saham" dari portal
 * SahamOnline MITI menggunakan LOGIN TERUS (TIADA cookies Chrome, TIADA CAPTCHA):
 *
 *   GET  /portal/login          → ambil CSRF token
 *   POST /portal/login          → LoginFormPublic[username/password] + rememberMe
 *   GET  /portal/maklumat-saham → parse kad saham (nama + Jumlah Pelabur/Tawaran)
 *
 * Kredential dibaca dari persekitaran (.env atau env vars):
 *   MITI_USERNAME, MITI_PASSWORD
 *
 * CARA GUNA:
 *   node scratch/sync-miti-applicants-login.js            (update data + git push)
 *   node scratch/sync-miti-applicants-login.js --no-push  (update data sahaja)
 *   node scratch/sync-miti-applicants-login.js --quiet    (senyap, untuk jadual auto)
 *
 * Sesuai untuk GitHub Actions (secrets MITI_USERNAME/MITI_PASSWORD) — laptop
 * tidak perlu on, tiada cookies expire.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');
const LOGIN_URL = 'https://sahamonline.miti.gov.my/portal/login';
const MAKLUMAT_URL = 'https://sahamonline.miti.gov.my/portal/maklumat-saham';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const AGENT = new (require('https').Agent)({ rejectUnauthorized: false });

// ---------------------------------------------------------------------------
// Load .env manual (sama seperti sync-isaham-api.js)
// ---------------------------------------------------------------------------
function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        lines.forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                if (!(key in process.env)) process.env[key] = val;
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Login + scrape
// ---------------------------------------------------------------------------
function parseCookies(setCookieArr) {
    return (setCookieArr || []).map(c => c.split(';')[0]).filter(Boolean).join('; ');
}

// Ambil CSRF + simpan cookies sesi dari halaman login (Yii2: CSRF terikat cookie)
async function getCsrf() {
    const resp = await axios.get(LOGIN_URL, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8' },
        httpsAgent: AGENT,
        timeout: 30000,
    });
    const m = resp.data.match(/name="csrf-token" content="([^"]+)"/);
    if (!m) throw new Error('CSRF token tidak dijumpai pada halaman login');
    const sessionCookies = parseCookies(resp.headers['set-cookie']);
    return { csrf: m[1], sessionCookies };
}

async function login(username, password) {
    const { csrf, sessionCookies } = await getCsrf();
    const body = new URLSearchParams({
        '_csrf': csrf,
        'LoginFormPublic[username]': username,
        'LoginFormPublic[password]': password,
        'LoginFormPublic[rememberMe]': '1',
    }).toString();

    const resp = await axios.post(LOGIN_URL, body, {
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8',
            'Referer': LOGIN_URL,
            'Cookie': sessionCookies,
        },
        httpsAgent: AGENT,
        maxRedirects: 5,
        timeout: 30000,
    });

    const hasSession = (resp.headers['set-cookie'] || []).some(c => /_panelUserpublic=/.test(c));
    const cookies = [sessionCookies, parseCookies(resp.headers['set-cookie'])].filter(Boolean).join('; ');
    return { cookieHeader: cookies, hasSession: hasSession === 'true' };
}

async function fetchMaklumat(cookieHeader) {
    const resp = await axios.get(MAKLUMAT_URL, {
        headers: { 'User-Agent': UA, 'Cookie': cookieHeader, 'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8' },
        httpsAgent: AGENT,
        timeout: 30000,
    });
    return resp.data;
}

// Parse setiap kad saham pada halaman maklumat-saham (nama + pelabur + tawaran)
function parseMaklumatSaham(html) {
    const $ = cheerio.load(html);
    const out = [];
    $('.card').each((i, card) => {
        const header = $(card).find('.card-header').first().text().trim();
        if (!header) return;
        const row = { company: header, applicants: null, offerShares: null };
        $(card).find('tr').each((j, tr) => {
            const label = $(tr).find('td').first().text().trim();
            const val = $(tr).find('td').eq(1).text().replace(/[^\d]/g, '');
            if (/jumlah\s*pelabur\s*mohon\s*saham/i.test(label) && val) {
                row.applicants = parseInt(val, 10);
            }
            if (/jumlah\s*tawaran\s*saham/i.test(label) && val) {
                row.offerShares = parseInt(val, 10);
            }
        });
        if (row.applicants != null || row.offerShares != null) out.push(row);
    });
    return out;
}

// ---------------------------------------------------------------------------
// Kemas kini data files + overrides HANYA jika ada nilai yang berubah
// ---------------------------------------------------------------------------
function applyResults(found) {
    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const changes = [];

    for (const f of found) {
        const ipo = matchEntry(data, f.company);
        if (!ipo) {
            console.log(`   ⚠️  ${f.company} ada di portal tapi TIADA dalam data — skip.`);
            continue;
        }
        let changed = false;
        if (f.applicants != null && ipo.mitiApplicants !== f.applicants) {
            console.log(`   ${ipo.companyName}: pelabur ${ipo.mitiApplicants != null ? ipo.mitiApplicants.toLocaleString() : '-'} → ${f.applicants.toLocaleString()}`);
            ipo.mitiApplicants = f.applicants;
            changes.push({ id: ipo.id, key: 'mitiApplicants', value: f.applicants });
            changed = true;
        }
        if (f.offerShares != null && ipo.mitiOfferShares !== f.offerShares) {
            console.log(`   ${ipo.companyName}: tawaran ${ipo.mitiOfferShares != null ? ipo.mitiOfferShares.toLocaleString() : '-'} → ${f.offerShares.toLocaleString()}`);
            ipo.mitiOfferShares = f.offerShares;
            changes.push({ id: ipo.id, key: 'mitiOfferShares', value: f.offerShares });
            changed = true;
        }
    }

    if (changes.length === 0) {
        console.log('ℹ️  Tiada perubahan jumlah pelabur/tawaran.');
        return false;
    }

    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS, js, 'utf8');
    fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');

    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));
    changes.forEach(c => {
        if (!overrides[c.id]) overrides[c.id] = {};
        overrides[c.id][c.key] = c.value;
    });
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`✅ Dikemas kini (${changes.length} perubahan) → data.json, data.js, data_export.js, overrides.json`);
    return true;
}

function matchEntry(data, companyName) {
    const name = companyName.toLowerCase().trim();
    return data.find(x => {
        const cn = (x.companyName || '').toLowerCase().trim();
        return cn.includes(name) || name.includes(cn);
    });
}

// ---------------------------------------------------------------------------
// UTAMA
// ---------------------------------------------------------------------------
async function main() {
    loadEnv();
    const quiet = process.argv.includes('--quiet');
    const doPush = !process.argv.includes('--no-push');

    const username = process.env.MITI_USERNAME;
    const password = process.env.MITI_PASSWORD;
    if (!username || !password) {
        console.error('❌ MITI_USERNAME/MITI_PASSWORD tiada dalam .env / env vars.');
        process.exit(1);
    }

    if (!quiet) console.log('--- Sync MITI applicants (login terus) ---');

    // 1) Login
    let session;
    try {
        session = await login(username, password);
    } catch (e) {
        console.error('❌ Login portal MITI gagal:', e.response ? e.response.status + ' ' + (e.response.data || '').slice(0, 200) : e.message);
        if (quiet) return;
        process.exit(1);
    }
    if (!session.cookieHeader.includes('_panelUserpublic')) {
        console.error('❌ Login tidak menghasilkan sesi pengguna (mungkin kredential salah / CAPTCHA dikehendaki).');
        if (quiet) return;
        process.exit(1);
    }
    if (!quiet) console.log('✓ Login berjaya (sesi _panelUserpublic diperolehi).');

    // 2) Scrape maklumat-saham
    let html;
    try {
        html = await fetchMaklumat(session.cookieHeader);
    } catch (e) {
        console.error('⚠️  Gagal fetch maklumat-saham:', e.message);
        if (quiet) return;
        process.exit(1);
    }

    const found = parseMaklumatSaham(html);
    if (found.length === 0) {
        console.log('⚠️  Tiada kad saham dijumpai pada halaman — sesi mungkin expired.');
        if (quiet) return;
        process.exit(1);
    }

    if (!quiet) {
        console.log('\n📊 Jumlah Pelabur Mohon Saham (portal SahamOnline):');
        found.forEach(f => console.log(`   ${f.company.padEnd(32)} ${f.applicants != null ? f.applicants.toLocaleString() : '-'} pelabur | tawaran ${f.offerShares != null ? f.offerShares.toLocaleString() : '-'}`));
    }

    // 3) Update data files
    const changed = applyResults(found);
    if (!changed) {
        if (!quiet) console.log('\n✅ Selesai — tiada perubahan.');
        return;
    }

    // 4) Git push (skip bila --no-push atau dalam GitHub Actions yang commit sendiri)
    if (doPush && process.env.GITHUB_ACTIONS !== 'true') {
        await gitPush();
    }
}

async function gitPush() {
    const { execSync } = require('child_process');
    try {
        const status = execSync('git status --porcelain data.json data.js data_export.js overrides.json', { cwd: ROOT }).toString().trim();
        if (!status) return;
        const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        execSync('git add data.json data.js data_export.js overrides.json', { cwd: ROOT });
        execSync(`git commit -m "Auto sync MITI applicants: ${stamp}"`, { cwd: ROOT });
        execSync('git push', { cwd: ROOT });
        console.log('\n[Git] ✅ Pushed ke GitHub.');
    } catch (e) {
        console.error('\n[Git] ❌ Push gagal:', e.message);
    }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });