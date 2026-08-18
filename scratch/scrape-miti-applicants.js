#!/usr/bin/env node
/**
 * scrape-miti-applicants.js
 *
 * Auto-scrape "Jumlah Pelabur Mohon Saham" dari portal SahamOnline MITI
 * menggunakan cookies sesi Chrome (TIADA login manual + CAPTCHA):
 *   - Cookies diekstrak dari Chrome oleh scratch/dump-miti-cookies.py →
 *     scratch/miti-cookies.json (login portal MITI SEKALI dalam Chrome).
 *   - Auto-refresh dari Chrome jika fail cookies tua (> 12 jam).
 *   - Parse SEMUA tawaran saham pada halaman /portal/maklumat-saham (dinamik,
 *     bukan senarai hardcoded) dan padankan dengan data.json ikut nama.
 *
 * CARA GUNA:
 *   node scratch/scrape-miti-applicants.js          (run biasa)
 *   node scratch/scrape-miti-applicants.js --quiet  (untuk jadual auto;
 *                                                    skip senyap jika cookies tiada)
 *   node scratch/scrape-miti-applicants.js --dump   (simpan teks halaman ke scratch/miti_portal_dump.txt)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const COOKIES_FILE = path.join(__dirname, 'miti-cookies.json');
const DUMP = path.join(__dirname, 'miti_portal_dump.txt');
const MAKLUMAT_URL = 'https://sahamonline.miti.gov.my/portal/maklumat-saham';

// Portal MITI guna TLS cert yang tidak lengkap — sahkan permintaan seperti
// browser sebenar (Chrome terima cert ini; curl/node tak). Data hanya dibaca,
// tiada hantar maklumat sensitif.
const AGENT = new https.Agent({ rejectUnauthorized: false });

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

function refreshMitiCookies() {
    const { execSync } = require('child_process');
    try {
        execSync('python3 scratch/dump-miti-cookies.py', {
            cwd: ROOT,
            timeout: 30000,
            stdio: 'ignore'
        });
        return true;
    } catch (e) {
        console.log(`  [MITI] Cookie refresh gagal: ${e.message}`);
        return false;
    }
}

function loadMitiCookies() {
    try {
        const mtime = fs.statSync(COOKIES_FILE).mtimeMs;
        if ((Date.now() - mtime) > 12 * 60 * 60 * 1000) {
            console.log('  [MITI] Cookies lama (>12 jam) — refresh dari Chrome...');
            refreshMitiCookies();
        }
    } catch (e) { /* fail tiada — cuba refresh di bawah */ }

    try {
        if (fs.existsSync(COOKIES_FILE)) {
            const data = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
            if (data.cookieHeader && data.hasSession) return data.cookieHeader;
        }
    } catch (e) { /* fall through */ }

    if (refreshMitiCookies()) {
        try {
            const data = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
            if (data.cookieHeader && data.hasSession) return data.cookieHeader;
        } catch (e) { /* gagal juga */ }
    }
    return null;
}

// Padankan nama syarikat portal dengan entri data (kes-kecil, dua hala)
function matchEntry(data, companyName) {
    const name = companyName.toLowerCase().trim();
    return data.find(x => {
        const cn = (x.companyName || '').toLowerCase().trim();
        return cn.includes(name) || name.includes(cn);
    });
}

// Parse setiap kad saham pada halaman maklumat-saham
function parseMaklumatSaham(html) {
    const $ = cheerio.load(html);
    const out = [];
    $('.card').each((i, card) => {
        const header = $(card).find('.card-header').first().text().trim();
        if (!header) return;
        let applicants = null;
        $(card).find('tr').each((j, tr) => {
            const label = $(tr).find('td').first().text().trim();
            if (/jumlah\s*pelabur\s*mohon\s*saham/i.test(label)) {
                const val = $(tr).find('td').eq(1).text().replace(/[^\d]/g, '');
                if (val) applicants = parseInt(val, 10);
            }
        });
        if (applicants != null) out.push({ company: header, applicants });
    });
    return out;
}

// Kemas kini data files + overrides HANYA jika ada nilai yang berubah
function applyApplicants(found) {
    const DATA_JSON = path.join(ROOT, 'data.json');
    const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const changes = [];

    for (const f of found) {
        const ipo = matchEntry(data, f.company);
        if (!ipo) {
            console.log(`   ⚠️  ${f.company} ada di portal tapi TIADA dalam data — akan ditambah oleh sync isaham.`);
            continue;
        }
        if (ipo.mitiApplicants !== f.applicants) {
            console.log(`   ${f.company}: ${ipo.mitiApplicants != null ? ipo.mitiApplicants.toLocaleString() : '-'} → ${f.applicants.toLocaleString()} pelabur`);
            ipo.mitiApplicants = f.applicants;
            changes.push({ id: ipo.id, value: f.applicants });
        }
    }

    if (changes.length === 0) {
        console.log('ℹ️  Jumlah pemohon masih sama — tiada perubahan.');
        return;
    }

    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(path.join(ROOT, 'data.js'), js, 'utf8');
    fs.writeFileSync(path.join(ROOT, 'data_export.js'), js, 'utf8');

    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));
    changes.forEach(c => {
        if (!overrides[c.id]) overrides[c.id] = {};
        overrides[c.id].mitiApplicants = c.value;
    });
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`✅ Jumlah pemohon dikemas kini (${changes.length} IPO) → data.json, data.js, data_export.js, overrides.json`);
}

async function main() {
    const quiet = process.argv.includes('--quiet');

    const cookieHeader = loadMitiCookies();
    if (!cookieHeader) {
        if (quiet) {
            console.log('⏭️  [MITI] Cookies portal tiada/expired — skip (run manual sekali untuk dump cookies).');
            return;
        }
        console.error('❌ Cookies MITI tiada/expired.');
        console.error('   → Login https://sahamonline.miti.gov.my/portal/login dalam Chrome SEKALI.');
        console.error('   → Lepas tu run: python3 scratch/dump-miti-cookies.py');
        process.exit(1);
    }

    let resp;
    try {
        resp = await axios.get(MAKLUMAT_URL, {
            headers: { 'User-Agent': UA, 'Cookie': cookieHeader, 'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8' },
            httpsAgent: AGENT,
            timeout: 30000,
        });
    } catch (e) {
        console.log(`⚠️  [MITI] Gagal fetch maklumat-saham: ${e.message}`);
        if (quiet) return;
        process.exit(1);
    }

    if (process.argv.includes('--dump')) {
        fs.writeFileSync(DUMP, resp.data, 'utf8');
        console.log(`📄 Teks halaman disimpan ke ${DUMP}`);
    }

    const found = parseMaklumatSaham(resp.data);
    if (found.length === 0) {
        console.log(`⚠️  [MITI] Tiada kad saham dijumpai pada halaman — mungkin sesi expired (${resp.status}).`);
        if (quiet) return;
        process.exit(1);
    }

    console.log('\n📊 Jumlah Pelabur Mohon Saham (portal SahamOnline):');
    found.forEach(f => console.log(`   ${f.company.padEnd(32)} ${f.applicants.toLocaleString()} pelabur`));

    applyApplicants(found);
    console.log('\n✅ Selesai — guna cookies sesi Chrome (tiada CAPTCHA).');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });