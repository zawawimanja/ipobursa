#!/usr/bin/env node
/**
 * isaham-browser-keeper.js
 *
 * Browser PERSISTEN untuk isaham.my (tembus Cloudflare secara kekal).
 *
 * MASALAH ASAL:
 *   Setiap kali scrape-isaham.js lancarkan Chrome baru, Cloudflare bagi
 *   challenge Turnstile BARU walaupun cookie cf_clearance ada — dan challenge
 *   tu tak pernah auto-selesai dalam headless. Sebab tu sync-isaham.js gagal
 *   senyap setiap hari (403) dan tarikh jadi stale/hilang.
 *
 * PENYELESAIAN:
 *   Satu browser Chrome DIBUKA (headed) dan dibiarkan HIDUP selamanya.
 *   Cloudflare hanya cabar sekali per sesi browser. Selepas challenge
 *   selesai (auto-pass atau solve manual), sesi itu kekal sah untuk selama
 *   browser ini hidup. scrape-isaham.js / sync-isaham.js tidak lagi lancarkan
 *   browser baru — mereka SAMBUNG ke browser ini melalui port debugging
 *   (remote-debugging-port=9222) dan guna sesi yang sudah sah.
 *
 * CARA GUNA:
 *   1) Run sekali (browser kecil akan terbuka; jika Cloudflare challenge
 *      muncul, selesaikan SEKALI — selepas itu tak perlu lagi):
 *          node scratch/isaham-browser-keeper.js
 *      (boleh terus biarkan jalan — ia refresh cache setiap 6 jam)
 *   2) auto_runner.js akan pastikan keeper ini sentiasa hidup & auto-spawn
 *      jika tertutup.
 *   3) Untuk tutup keeper & dapatkan semula sesi: Ctrl+C, run semula.
 *
 * Opsyen:
 *   --headless  paksa browser tanpa kepala (bagi sesi yang sudah disahkan,
 *               headless pun ok — challenge tidak muncul lagi)
 *   --port N    guna port selain 9222
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PROFILE = path.join(__dirname, '.isaham-profile');
const CACHE_DIR = path.join(__dirname, 'isaham-cache');
const PORT = parseInt(process.argv[process.argv.indexOf('--port') + 1], 10) || 9222;
const HEADED = !process.argv.includes('--headless');
const NAV_TIMEOUT = 20000;
const CHALLENGE_WAIT_MS = 300000;
const STUCK_RELOAD_MS = 30000;
const REFRESH_MS = 6 * 60 * 60 * 1000; // refresh cache sendiri setiap 6 jam

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

function saveCache(key, html) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(key), html, 'utf8');
}

async function pageText(page) {
    return page.evaluate(() => document.body ? document.body.innerText : '');
}

function hasTurnstile(page) {
    try {
        return page.frames().some(f => f.url().includes('challenges.cloudflare.com'));
    } catch (e) {
        return false;
    }
}

async function gotoPage(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    } catch (e) { /* poll isOk akan tentukan hasil */ }
}

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

// Tunggu sehingga kandungan sah — jangan re-goto semasa frame Turnstile ada
// (re-goto restart challenge yang sedang diselesaikan).
async function waitForContent(page, spec, timeoutMs) {
    const start = Date.now();
    let lastReload = start;
    while (Date.now() - start < timeoutMs) {
        try {
            if (await spec.isOk(page)) return true;
        } catch (e) { /* detached frame — redirect selepas challenge */ }
        if (Date.now() - lastReload > STUCK_RELOAD_MS && !hasTurnstile(page)) {
            await gotoPage(page, spec.url);
            lastReload = Date.now();
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return false;
}

async function fetchAndSave(page, spec, timeoutMs) {
    await gotoPage(page, spec.url);
    const ok = await waitForContent(page, spec, timeoutMs);
    if (ok) {
        const html = await page.content();
        saveCache(spec.key, html);
        console.log(`  ✓ ${spec.label} — disimpan (${(html.length / 1024).toFixed(0)} KB)`);
    } else {
        const t = (await pageText(page)).slice(0, 100).replace(/\s+/g, ' ');
        console.log(`  ✗ ${spec.label} — masih challenge: ${t || '(kosong)'}`);
    }
    return ok;
}

async function refreshAll(browser, waitMs) {
    const page = await browser.newPage();
    await stealthInit(page);
    try {
        let allOk = true;
        for (const spec of PAGES) {
            const ok = await fetchAndSave(page, spec, waitMs);
            if (!ok) allOk = false;
        }
        return allOk;
    } finally {
        try { await page.close(); } catch (e) { /* browser tutup */ }
    }
}

async function main() {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`🍪 Isaham Browser Keeper — port ${PORT}, mode: ${HEADED ? 'HEADED (nampak)' : 'headless'}`);
    console.log(`   Profile: ${PROFILE}`);

    // --- Semak sama ada port sudah ada browser (elak dua keeper) ---
    try {
        const probe = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: null });
        console.log('⚠️  Sudah ada browser di port ini — keluar (biar keeper sedia ada teruskan).');
        await probe.disconnect();
        process.exit(0);
    } catch (e) { /* port kosong — teruskan */ }

    const browser = await puppeteer.launch({
        headless: !HEADED,
        channel: 'chrome',
        userDataDir: PROFILE,
        args: [
            `--remote-debugging-port=${PORT}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=640,420',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
        ],
        defaultViewport: null,
    });

    console.log(`\n🌐 Browser keeper hidup (pid ${browser.process() ? browser.process().pid : '?'}).`);
    console.log('   Sila solve challenge Cloudflare SEKALI jika ia muncul (biasanya auto-pass dalam 1-10s).');
    console.log('   Browser akan kekal terbuka — jangan tutup manual.\n');

    let solved = await refreshAll(browser, HEADED ? CHALLENGE_WAIT_MS : CHALLENGE_WAIT_MS);
    if (solved) {
        console.log('✅ Sesi Cloudflare SAH — semua halaman dimuat turun.');
    }

    // --- Gelung hidup: tunggu, refresh berkala, pemulihan jika challenge muncul ---
    let consecutiveFailures = 0;
    while (true) {
        await new Promise(r => setTimeout(r, REFRESH_MS));
        console.log(`\n🔄 [${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}] Refresh berkala (${REFRESH_MS / 3600000} jam)...`);
        try {
            solved = await refreshAll(browser, HEADED ? CHALLENGE_WAIT_MS : CHALLENGE_WAIT_MS);
            consecutiveFailures = solved ? 0 : consecutiveFailures + 1;
            if (solved) console.log('✅ Refresh selesai.');
            else if (!HEADED) {
                console.log('⚠️  Headless kena challenge — tukar ke mode headed secara automatik? Tidak…');
                console.log('   Tutup keeper ini & run semula TANPA --headless untuk solve manual.');
            } else if (consecutiveFailures >= 2) {
                console.log('⚠️  Challenge berulang walaupun headed — mungkin sesi browser perlu reset.');
                console.log('   Browser masih hidup; cuba solve challenge dalam tetingkap keeper secara manual.');
            }
        } catch (e) {
            console.error('❌ Refresh gagal:', e.message);
            try { await browser.close(); } catch (e2) { /* sudah tutup */ }
            console.log('   Keeper terhenti — auto_runner akan spawn semula dalam beberapa minit.');
            process.exit(1);
        }
    }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });