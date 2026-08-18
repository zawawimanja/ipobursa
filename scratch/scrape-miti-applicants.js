#!/usr/bin/env node
/**
 * scrape-miti-applicants.js
 *
 * Auto-scrape "Jumlah Pelabur Mohon Saham" dari portal SahamOnline MITI
 * menggunakan Puppeteer dengan SESSION PERSISTENCE:
 *   - Kali pertama: browser BUKA (headed), anda log masuk + selesaikan CAPTCHA
 *     SEKALI sahaja. Sesi/cookies disimpan dalam scratch/.miti-profile.
 *   - Kali seterusnya (selagi sesi belum tamat): run terus, headless, auto-scrape,
 *     dan data.js/data.json/data_export.js/overrides.json dikemas kini sendiri.
 *
 * CARA GUNA:
 *   1) (Pilihan) Buat/isi fail .env di root projek:
 *        MITI_USERNAME=no.kp@email
 *        MITI_PASSWORD=rahsia
 *      Kredential ini TIDAK akan di-commit (.env dalam .gitignore).
 *      Kalau kosong, anda log masuk manual dalam browser — sama sahaja.
 *
 *   2) node scratch/scrape-miti-applicants.js
 *
 * Pilihan:
 *   --headed   paksa browser nampak walaupun sesi sudah ada (debug)
 *   --dump     simpan teks mentah halaman ke scratch/miti_portal_dump.txt
 *              (guna jika struktur portal berubah — senang debug parser)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROFILE = path.join(__dirname, '.miti-profile');
const DUMP = path.join(__dirname, 'miti_portal_dump.txt');
const PORTAL = 'https://sahamonline.miti.gov.my/';
const NAV_TIMEOUT = 20000;
const LOGIN_WAIT_MS = 180000; // 3 minit untuk log masuk manual + CAPTCHA

// --- Susunan target (id dalam data kami -> nama yang muncul di portal) ---
const TARGETS = [
    { id: 'big-caring-group-bhd', names: ['big caring'] },
    { id: 'ioipg-malaysia-reit',   names: ['ioipg'] },
    { id: 'mydcd-berhad',          names: ['mydcd'] },
];

// --- Baca .env ringkas (tanpa dependency dotenv) ---
function loadEnv() {
    try {
        const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
        raw.split(/\r?\n/).forEach(line => {
            const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        });
    } catch (e) { /* tiada fail .env — ok, login manual */ }
}

// --- Ekstrak jumlah pemohon dari teks halaman ---
// Corak blok di portal (per syarikat):
//   BIG CARING GROUP BHD
//   Jumlah Tawaran Saham\t922,730,000
//   Jumlah Pelabur Mohon Saham\t653
//   SAHAM DITUTUP 6 HARI LAGI
function findApplicants(text) {
    const out = {};
    TARGETS.forEach(t => { out[t.id] = null; });
    if (!text) return out;

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        const t = TARGETS.find(x => x.names.some(n => lower.includes(n)));
        if (!t) continue;
        // Cari "Jumlah Pelabur Mohon Saham <nombor>" dalam 15 baris selepas nama syarikat
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
            const m = lines[j].match(/jumlah\s*pelabur\s*mohon\s*saham\s*[:=]?\s*([\d,]+)/i);
            if (m) {
                out[t.id] = parseInt(m[1].replace(/,/g, ''), 10);
                break;
            }
            // Berhenti scan jika terserempak nama syarikat lain
            if (TARGETS.some(x => x !== t && x.names.some(n => lines[j].toLowerCase().includes(n)))) break;
        }
    }
    return out;
}

// --- Kemas kini data files + overrides (sama corak seperti update-miti-applicants.js) ---
function applyApplicants(applicants) {
    const DATA_JSON = path.join(ROOT, 'data.json');
    const DATA_JS = path.join(ROOT, 'data.js');
    const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
    const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');
    const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));

    const data = read(DATA_JSON);
    let updated = 0;
    TARGETS.forEach(t => {
        const v = applicants[t.id];
        if (v == null) return;
        const ipo = data.find(x => x.id === t.id);
        if (ipo) { ipo.mitiApplicants = v; updated++; }
    });
    if (updated === 0) { console.log('⚠️  Tiada nilai baharu untuk dikemas kini.'); return; }

    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS, js, 'utf8');
    fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');

    const overrides = read(OVERRIDES_JSON);
    TARGETS.forEach(t => {
        if (applicants[t.id] == null) return;
        if (!overrides[t.id]) overrides[t.id] = {};
        overrides[t.id].mitiApplicants = applicants[t.id];
    });
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`✅ Data dikemas kini (${updated} IPO): data.json, data.js, data_export.js, overrides.json`);
}

async function main() {
    loadEnv();
    const headed = process.argv.includes('--headed');
    const dumpOnly = process.argv.includes('--dump');

    console.log('🌐 Membuka portal SahamOnline MITI...');
    const browser = await puppeteer.launch({
        headless: headed || dumpOnly ? false : true,
        userDataDir: PROFILE,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 900 },
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
        await page.goto(PORTAL, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
    } catch (e) {
        console.log('⚠️  goto warning:', e.message);
    }

    let text = await page.evaluate(() => document.body ? document.body.innerText : '');
    let applicants = findApplicants(text);

    if (dumpOnly) {
        fs.writeFileSync(DUMP, text, 'utf8');
        console.log(`📄 Teks halaman disimpan ke ${DUMP}`);
        await browser.close();
        return;
    }

    const needLogin = Object.values(applicants).every(v => v === null);

    if (needLogin) {
        console.log('🔐 Sesi tiada/expired — browser DIBUKA untuk log masuk.');
        console.log('   Sila log masuk + selesaikan CAPTCHA secara manual dalam browser.');
        console.log(`   (Masa menunggu maksimum: ${LOGIN_WAIT_MS / 60000} minit)`);

        // Auto-isi kredential jika ada dalam .env (CAPTCHA tetap manual)
        if (process.env.MITI_USERNAME && process.env.MITI_PASSWORD) {
            try {
                const userSel = 'input[type="text"], input[name*="user" i], input[name*="ic" i], input[name*="kp" i], input[id*="user" i], input[id*="ic" i], input[id*="username" i]';
                const user = await page.$(userSel);
                const pass = await page.$('input[type="password"]');
                if (user && pass) {
                    await user.click({ clickCount: 3 });
                    await user.type(process.env.MITI_USERNAME);
                    await pass.type(process.env.MITI_PASSWORD);
                    console.log('   ✔ Kredential dari .env diisi — sila selesaikan CAPTCHA & klik log masuk.');
                }
            } catch (e) { /* biarkan user isi manual */ }
        }

        // Tunggu sehingga berjaya (halaman papar jumlah pemohon atau menu dalaman)
        const start = Date.now();
        while (Date.now() - start < LOGIN_WAIT_MS) {
            await new Promise(r => setTimeout(r, 3000));
            try {
                text = await page.evaluate(() => document.body ? document.body.innerText : '');
                applicants = findApplicants(text);
                if (Object.values(applicants).some(v => v !== null)) break;

                // Dah log masuk (menu dalaman nampak) tapi tawaran belum dipaparkan —
                // cuba klik pautan "Maklumat Saham"
                if (/log\s*keluar|logout|mysaham/i.test(text)) {
                    const clicked = await page.evaluate(() => {
                        const els = [...document.querySelectorAll('a, button, li, span')];
                        const el = els.find(e => /maklumat\s*saham|saham\s*terkini|senarai\s*saham/i.test(e.textContent || ''));
                        if (el) { el.click(); return true; }
                        return false;
                    });
                    if (clicked) {
                        await new Promise(r => setTimeout(r, 3000));
                        text = await page.evaluate(() => document.body ? document.body.innerText : '');
                        applicants = findApplicants(text);
                    }
                }
            } catch (e) { /* halaman sedang tukar — teruskan */ }
        }

        if (Object.values(applicants).every(v => v === null)) {
            console.error('❌ Gagal mendapatkan jumlah pemohon selepas log masuk.');
            console.error('   Guna: node scratch/scrape-miti-applicants.js --dump  (untuk debug struktur halaman)');
            await browser.close();
            process.exit(1);
        }
    }

    console.log('\n📊 Jumlah Pelabur Mohon Saham (portal SahamOnline):');
    TARGETS.forEach(t => console.log(`   ${t.id.padEnd(24)} ${applicants[t.id] != null ? applicants[t.id].toLocaleString() : 'TIADA'}`));

    applyApplicants(applicants);

    // Simpan teks mentah untuk rujukan/debug
    fs.writeFileSync(DUMP, text, 'utf8');

    await browser.close();
    console.log('\n✅ Selesai. Sesi disimpan — run seterusnya akan headless & auto.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
