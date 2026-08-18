#!/usr/bin/env node
/**
 * scrape-isaham.js
 *
 * Auto-scrape isaham.my (https://www.isaham.my/ipo) menggunakan Puppeteer
 * dengan SESSION PERSISTENCE untuk tembus Cloudflare (punca 403 yang
 * membuatkan sync-isaham.js gagal senyap):
 *
 *   - Kali pertama (tanpa --quiet): browser BUKA (headed), anda selesaikan
 *     challenge Cloudflare SEKALI. Sesi disimpan dalam scratch/.isaham-profile.
 *   - Kali seterusnya: run headless, muat turun HTML halaman IPO/MITI/Stats,
 *     dan simpan ke scratch/isaham-cache/ untuk dibaca sync-isaham.js.
 *   - Mod --quiet (digunakan auto_runner.js): headless; jika sesi tiada/expired,
 *     keluar senyap tanpa buka browser (perlu run manual sekali).
 *
 * CARA GUNA:
 *   node scratch/scrape-isaham.js               (run biasa / login jika perlu)
 *   node scratch/scrape-isaham.js --quiet       (untuk jadual auto)
 *   node scratch/scrape-isaham.js --headed      (paksa browser nampak)
 *   node scratch/scrape-isaham.js --fresh       (paksa muat turun walaupun cache baru)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PROFILE = path.join(__dirname, '.isaham-profile');
const CACHE_DIR = path.join(__dirname, 'isaham-cache');
const NAV_TIMEOUT = 20000;
const CHALLENGE_WAIT_MS = 300000; // 5 minit untuk selesaikan challenge manual
const FRESH_MS = 24 * 60 * 60 * 1000; // cache dianggap segar dalam 24 jam

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const PAGES = [
    {
        key: 'ipo',
        url: 'https://www.isaham.my/ipo',
        label: 'Senarai IPO (Public/Upcoming)',
        async isOk(page) {
            return (await page.$$('.f-ipo-card')).length > 0;
        }
    },
    {
        key: 'miti',
        url: 'https://www.isaham.my/ipo/miti',
        label: 'Senarai IPO (MITI + Draft)',
        async isOk(page) {
            const t = await pageText(page);
            return /MITI IPO|Future IPO/i.test(t) || /saham bumiputera|tranche/i.test(t);
        }
    },
    {
        key: 'stats',
        url: 'https://www.isaham.my/ipo/statistics',
        label: 'Statistik IPO Tersenarai',
        async isOk(page) {
            return (await page.$('#statsTable')) !== null;
        }
    }
];

function cachePath(key) {
    return path.join(CACHE_DIR, `isaham_${key}.html`);
}

function isFresh(key) {
    try {
        const mtime = fs.statSync(cachePath(key)).mtimeMs;
        return (Date.now() - mtime) < FRESH_MS;
    } catch (e) {
        return false;
    }
}

// Stealth: sembunyi tanda automasi supaya Cloudflare Turnstile boleh selesai.
// Guna Chrome SEBENAR (channel: 'chrome') — fingerprint jauh lebih "manusia"
// berbanding Chromium bundled, dan challenge selalunya auto-pass selepas itu.
async function launch(headlessMode) {
    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1280,900'
    ];
    const opts = {
        headless: headlessMode,
        userDataDir: PROFILE,
        args,
        defaultViewport: { width: 1280, height: 900 },
    };
    try {
        return await puppeteer.launch({ ...opts, channel: 'chrome' });
    } catch (e) {
        console.log('⚠️  Chrome sebenar tidak dijumpai — guna Chromium bundled.');
        return puppeteer.launch(opts);
    }
}

// Patch navigator.webdriver & ciri automasi lain pada setiap halaman baru
async function stealthInit(page) {
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = window.chrome || { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        const origQuery = window.navigator.permissions && window.navigator.permissions.query;
        if (origQuery) {
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : origQuery(parameters)
            );
        }
    });
}

async function pageText(page) {
    return page.evaluate(() => document.body ? document.body.innerText : '');
}

async function gotoPage(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    } catch (e) {
        // Timeout biasa pada halaman challenge — biarkan, poll isOk akan tentukan.
    }
}

// Muat turun satu halaman dan simpan HTML jika kandungan sah.
async function fetchAndSave(page, spec) {
    await gotoPage(page, spec.url);
    let ok = false;
    try {
        ok = await spec.isOk(page);
    } catch (e) {
        // Detached frame biasa berlaku bila Cloudflare redirect — cuba semula selepas jeda
        await new Promise(r => setTimeout(r, 4000));
        try { ok = await spec.isOk(page); } catch (e2) { ok = false; }
    }
    if (ok) {
        const html = await page.content();
        fs.writeFileSync(cachePath(spec.key), html, 'utf8');
        console.log(`  ✓ ${spec.label} — disimpan (${(html.length / 1024).toFixed(0)} KB)`);
    } else {
        const t = (await pageText(page)).slice(0, 120).replace(/\s+/g, ' ');
        console.log(`  ✗ ${spec.label} — kandungan tidak sah (challenge Cloudflare?)`);
        console.log(`    → halaman: ${t || '(kosong)'}`);
    }
    return ok;
}

// Tunggu sehingga challenge diselesaikan (guna untuk run headed manual).
async function waitForChallenge(page, spec) {
    const start = Date.now();
    while (Date.now() - start < CHALLENGE_WAIT_MS) {
        await new Promise(r => setTimeout(r, 2000));
        try {
            if (await spec.isOk(page)) return true;
        } catch (e) {
            // Detached frame — halaman sedang redirect selepas challenge diselesaikan
        }
        // Halaman challenge kadang auto-redirect selepas beberapa saat
        if (Date.now() - start > 8000) {
            await gotoPage(page, spec.url);
        }
    }
    return false;
}

async function main() {
    const headed = process.argv.includes('--headed');
    const quiet = process.argv.includes('--quiet');
    const force = process.argv.includes('--fresh');

    fs.mkdirSync(CACHE_DIR, { recursive: true });

    // Mod --fresh: muat turun semua walaupun cache segar.
    const targets = PAGES.filter(p => force || !isFresh(p.key));
    if (targets.length === 0) {
        console.log('ℹ️  Cache isaham masih segar (< 24 jam) — tiada muat turun diperlukan.');
        console.log('   (Guna --fresh untuk paksa muat turun semula.)');
        return;
    }

    console.log('🌐 Membuka isaham.my (Puppeteer)...');

    // --- Percubaan headless dahulu (guna sesi tersimpan) ---
    let browser = await launch(true);
    let page = await browser.newPage();
    await stealthInit(page);
    await page.setUserAgent(UA);

    const failed = [];
    for (const spec of targets) {
        console.log(`\n📄 ${spec.label} — ${spec.url}`);
        const ok = await fetchAndSave(page, spec);
        if (!ok) failed.push(spec);
    }

    await browser.close();

    if (failed.length === 0) {
        console.log('\n✅ Semua halaman dimuat turun (headless, sesi sah).');
        return;
    }

    // --- Sesi tidak sah / belum ada ---
    if (quiet) {
        console.log('\n⏭️  Sesi isaham tiada/expired — skip (run manual sekali untuk selesaikan Cloudflare).');
        console.log('   Guna: node scratch/scrape-isaham.js');
        return;
    }

    console.log('\n🔐 Sesi Cloudflare tiada/expired — browser DIBUKA.');
    console.log('   Sila selesaikan challenge Cloudflare secara manual dalam browser.');
    console.log(`   (Masa menunggu maksimum: ${CHALLENGE_WAIT_MS / 60000} minit)`);

    browser = await launch(headed ? true : false);
    page = await browser.newPage();
    await stealthInit(page);
    await page.setUserAgent(UA);

    for (const spec of failed) {
        console.log(`\n📄 ${spec.label} — ${spec.url}`);
        await gotoPage(page, spec.url);
        const solved = await waitForChallenge(page, spec);
        if (solved) {
            const html = await page.content();
            fs.writeFileSync(cachePath(spec.key), html, 'utf8');
            console.log(`  ✓ ${spec.label} — disimpan (${(html.length / 1024).toFixed(0)} KB)`);
        } else {
            console.error(`  ❌ ${spec.label} — challenge belum diselesaikan.`);
        }
    }

    await browser.close();
    console.log('\n✅ Selesai. Sesi disimpan — run seterusnya akan headless & auto.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
