#!/usr/bin/env node
/**
 * scrape-miti-applicants.js
 *
 * Auto-scrape "Jumlah Pelabur Mohon Saham" dari portal SahamOnline MITI
 * menggunakan Puppeteer dengan SESSION PERSISTENCE:
 *   - Kali pertama (tanpa --quiet): browser BUKA (headed), anda log masuk +
 *     selesaikan CAPTCHA SEKALI. Sesi disimpan dalam scratch/.miti-profile.
 *   - Kali seterusnya: run headless, auto-scrape, dan data dikemas kini sendiri
 *     (HANYA jika nombor berubah).
 *   - Mod --quiet (digunakan auto_runner.js): headless; jika sesi tiada/expired,
 *     keluar senyap tanpa buka browser (perlu run manual sekali untuk login).
 *
 * CARA GUNA:
 *   1) (Pilihan) Isi fail .env di root projek:
 *        MITI_USERNAME=no.kp@email
 *        MITI_PASSWORD=rahsia
 *      (.env dalam .gitignore — tidak akan di-commit)
 *
 *   2) node scratch/scrape-miti-applicants.js          (run biasa / login jika perlu)
 *      node scratch/scrape-miti-applicants.js --quiet  (untuk jadual auto)
 *
 * Pilihan lain:
 *   --headed   paksa browser nampak walaupun sesi sudah ada (debug)
 *   --dump     simpan teks mentah halaman ke scratch/miti_portal_dump.txt
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

const TARGETS = [
    { id: 'big-caring-group-bhd', names: ['big caring'] },
    { id: 'ioipg-malaysia-reit',   names: ['ioipg'] },
    { id: 'mydcd-berhad',          names: ['mydcd'] },
];

function loadEnv() {
    try {
        const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
        raw.split(/\r?\n/).forEach(line => {
            const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        });
    } catch (e) { /* tiada fail .env — ok, login manual */ }
}

function findApplicants(text) {
    const out = {};
    TARGETS.forEach(t => { out[t.id] = null; });
    if (!text) return out;

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        const t = TARGETS.find(x => x.names.some(n => lower.includes(n)));
        if (!t) continue;
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
            const m = lines[j].match(/jumlah\s*pelabur\s*mohon\s*saham\s*[:=]?\s*([\d,]+)/i);
            if (m) {
                out[t.id] = parseInt(m[1].replace(/,/g, ''), 10);
                break;
            }
            if (TARGETS.some(x => x !== t && x.names.some(n => lines[j].toLowerCase().includes(n)))) break;
        }
    }
    return out;
}

// Kemas kini data files + overrides HANYA jika ada nilai yang berubah
function applyApplicants(applicants) {
    const DATA_JSON = path.join(ROOT, 'data.json');
    const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');
    const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));

    const data = read(DATA_JSON);
    const changes = [];
    TARGETS.forEach(t => {
        const v = applicants[t.id];
        if (v == null) return;
        const ipo = data.find(x => x.id === t.id);
        if (!ipo) return;
        if (ipo.mitiApplicants !== v) {
            ipo.mitiApplicants = v;
            changes.push({ id: t.id, label: t.id, value: v });
        }
    });

    if (changes.length === 0) {
        console.log('ℹ️  Jumlah pemohon masih sama — tiada perubahan.');
        return;
    }

    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(path.join(ROOT, 'data.js'), js, 'utf8');
    fs.writeFileSync(path.join(ROOT, 'data_export.js'), js, 'utf8');

    const overrides = read(OVERRIDES_JSON);
    changes.forEach(c => {
        if (!overrides[c.id]) overrides[c.id] = {};
        overrides[c.id].mitiApplicants = c.value;
    });
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`✅ Jumlah pemohon dikemas kini (${changes.length} IPO) → data.json, data.js, data_export.js, overrides.json`);
}

async function launch(headlessMode) {
    return puppeteer.launch({
        headless: headlessMode,
        userDataDir: PROFILE,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 900 },
    });
}

async function gotoPortal(page) {
    try {
        await page.goto(PORTAL, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
    } catch (e) {
        console.log('⚠️  goto warning:', e.message);
    }
}

async function pageText(page) {
    return page.evaluate(() => document.body ? document.body.innerText : '');
}

async function main() {
    loadEnv();
    const headed = process.argv.includes('--headed');
    const quiet = process.argv.includes('--quiet');
    const dumpOnly = process.argv.includes('--dump');

    if (dumpOnly) {
        console.log('🌐 Membuka portal (headed) untuk dump...');
        const browser = await launch(false);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await gotoPortal(page);
        const text = await pageText(page);
        fs.writeFileSync(DUMP, text, 'utf8');
        console.log(`📄 Teks halaman disimpan ke ${DUMP}`);
        await browser.close();
        return;
    }

    // Percubaan headless dahulu
    console.log('🌐 Membuka portal SahamOnline MITI (headless)...');
    let browser = await launch(true);
    let page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await gotoPortal(page);

    let text = await pageText(page);
    let applicants = findApplicants(text);
    const needLogin = Object.values(applicants).every(v => v === null);

    if (needLogin) {
        await browser.close();
        if (quiet) {
            console.log('⏭️  Sesi MITI tiada/expired — skip (run manual sekali untuk login + CAPTCHA).');
            return;
        }
        console.log('🔐 Sesi tiada/expired — browser DIBUKA untuk log masuk.');
        console.log('   Sila log masuk + selesaikan CAPTCHA secara manual dalam browser.');
        console.log(`   (Masa menunggu maksimum: ${LOGIN_WAIT_MS / 60000} minit)`);

        browser = await launch(headed ? true : false);
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await gotoPortal(page);

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

        const start = Date.now();
        while (Date.now() - start < LOGIN_WAIT_MS) {
            await new Promise(r => setTimeout(r, 3000));
            try {
                text = await pageText(page);
                applicants = findApplicants(text);
                if (Object.values(applicants).some(v => v !== null)) break;

                if (/log\s*keluar|logout|mysaham/i.test(text)) {
                    const clicked = await page.evaluate(() => {
                        const els = [...document.querySelectorAll('a, button, li, span')];
                        const el = els.find(e => /maklumat\s*saham|saham\s*terkini|senarai\s*saham/i.test(e.textContent || ''));
                        if (el) { el.click(); return true; }
                        return false;
                    });
                    if (clicked) {
                        await new Promise(r => setTimeout(r, 3000));
                        text = await pageText(page);
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

    fs.writeFileSync(DUMP, text, 'utf8');

    await browser.close();
    console.log('\n✅ Selesai. Sesi disimpan — run seterusnya akan headless & auto.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
