#!/usr/bin/env node
/**
 * scrape-isaham.js
 *
 * Auto-scrape isaham.my (https://www.isaham.my/ipo) menggunakan Puppeteer
 * dengan SESSION PERSISTENCE untuk tembus Cloudflare (punca 403 yang
 * membuatkan sync-isaham.js gagal senyap):
 *
 * ALIRAN:
 *   0) SAMBUNG KE BROWSER KEEPER (scratch/isaham-browser-keeper.js, port
 *      9222) jika hidup — sesi Cloudflare yang sudah sah, TIADA challenge.
 *   1) HEADLESS dahulu (guna sesi tersimpan di scratch/.isaham-profile):
 *      poll sehingga 45s setiap halaman — JS challenge selalunya auto-solve.
 *      Jika berjaya → cache dikemas kini, selesai.
 *   2) Jika gagal & TIDAK --quiet → browser DIBUKA (headed). Anda selesaikan
 *      challenge Cloudflare SEKALI secara manual. Sebaik sesi sah, SEMUA
 *      halaman yang gagal terus dimuat turun dalam sesi yang sama.
 *      (Cadangan kuat: gunakan keeper agar tak perlu solve lagi selepas ini.)
 *   3) VERIFIKASI headless selepas sesi disimpan — pastikan run seterusnya
 *      (auto_runner / sync-isaham) akan terus headless.
 *   4) Mod --quiet (digunakan auto_runner.js & sync-isaham.js): headless
 *      sahaja; jika sesi tiada/expired, keluar senyap TANPA buka browser
 *      (perlu run manual sekali: node scratch/scrape-isaham.js).
 *
 * CARA GUNA:
 *   node scratch/isaham-browser-keeper.js              (BEST: browser kekal, solve sekali)
 *   node scratch/scrape-isaham.js                      (run biasa / solve challenge jika perlu)
 *   node scratch/scrape-isaham.js --quiet              (untuk jadual auto)
 *   node scratch/scrape-isaham.js --headed             (paksa browser nampak terus)
 *   node scratch/scrape-isaham.js --fresh              (paksa muat turun walaupun cache baru)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PROFILE = path.join(__dirname, '.isaham-profile');
const CACHE_DIR = path.join(__dirname, 'isaham-cache');
const NAV_TIMEOUT = 20000;
const HEADLESS_POLL_MS = 45000;    // headless: tempoh tunggu auto-solve (JS challenge)
const CHALLENGE_WAIT_MS = 300000;  // headed: 5 minit untuk selesaikan challenge manual
const FAST_WAIT_MS = 90000;        // headed: selepas sesi sudah sah, tunggu singkat
const STUCK_RELOAD_MS = 30000;     // re-goto hanya jika tersekat TANPA frame Turnstile
const FRESH_MS = 24 * 60 * 60 * 1000; // cache dianggap segar dalam 24 jam

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

function saveCache(key, html) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(key), html, 'utf8');
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

// Padankan UA dengan versi Chrome sebenar — Cloudflare detect ketidakpadanan
// antara navigator.userAgent dan versi sebenar sebagai tanda bot.
async function matchingUA(browser) {
    try {
        const m = (await browser.version()).match(/(\d+\.\d+\.\d+\.\d+)/);
        if (m) {
            return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${m[1]} Safari/537.36`;
        }
    } catch (e) { /* fallback di bawah */ }
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
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
    } catch (e) {
        // Timeout biasa pada halaman challenge — poll isOk akan tentukan hasil.
    }
}

// Poll sehingga kandungan sah atau timeout.
// PENTING: JANGAN re-goto semasa frame Turnstile kelihatan — restart challenge
// yang sedang diselesaikan (punca lama: re-goto setiap 8s membuatkan solve tidak
// pernah selesai). Re-goto hanya jika halaman tersekat TANPA frame tersebut.
async function waitForContent(page, spec, timeoutMs) {
    const start = Date.now();
    let lastReload = start;
    while (Date.now() - start < timeoutMs) {
        try {
            if (await spec.isOk(page)) return true;
        } catch (e) {
            // Detached frame — halaman sedang redirect selepas challenge diselesaikan
        }
        if (Date.now() - lastReload > STUCK_RELOAD_MS && !hasTurnstile(page)) {
            await gotoPage(page, spec.url);
            lastReload = Date.now();
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return false;
}

// Muat turun satu halaman dan simpan HTML jika kandungan sah.
async function fetchAndSave(page, spec, timeoutMs) {
    await gotoPage(page, spec.url);
    const ok = await waitForContent(page, spec, timeoutMs);
    if (ok) {
        try {
            const html = await page.content();
            saveCache(spec.key, html);
            console.log(`  ✓ ${spec.label} — disimpan (${(html.length / 1024).toFixed(0)} KB)`);
        } catch (e) {
            console.log(`  ✗ ${spec.label} — halaman sah tetapi HTML gagal dibaca: ${e.message}`);
            return false;
        }
    } else {
        const t = (await pageText(page)).slice(0, 120).replace(/\s+/g, ' ');
        console.log(`  ✗ ${spec.label} — kandungan tidak sah (challenge Cloudflare?)`);
        console.log(`    → halaman: ${t || '(kosong)'}`);
    }
    return ok;
}

// Status cookie cf_clearance — untuk maklumkankan berapa lama sesi bertahan.
async function cookieSummary(page) {
    try {
        const client = await page.createCDPSession();
        await client.send('Network.enable');
        const { cookies } = await client.send('Network.getAllCookies');
        const cf = cookies.filter(c => c.domain.includes('isaham.my') && c.name === 'cf_clearance');
        if (cf.length) {
            const exp = cf[0].expires
                ? new Date(cf[0].expires * 1000).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
                : '(sesi sahaja)';
            return `cf_clearance sah sehingga ${exp}`;
        }
        return 'cf_clearance belum wujud (sila solve challenge sekali)';
    } catch (e) {
        return '(pemeriksaan cookie gagal)';
    }
}

const KEEPER_PORT = 9222;

async function keeperUrl() {
    try {
        const resp = await fetch(`http://127.0.0.1:${KEEPER_PORT}/json/version`, { signal: AbortSignal.timeout(3000) });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

// Sambung ke browser keeper (sesi Cloudflare yang sudah sah) — elak
// lancarkan browser baru yang akan kena challenge semula.
async function tryKeeper(targets) {
    if (!(await keeperUrl())) return { used: false, failed: targets };
    let browser;
    try {
        browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${KEEPER_PORT}`, defaultViewport: null });
    } catch (e) {
        console.log(`ℹ️  Browser keeper wujud tetapi gagal disambung (${e.message}) — guna browser baharu.`);
        return { used: false, failed: targets };
    }
    console.log('🔌 Browser keeper dijumpai (sesi Cloudflare sah) — guna sesi sedia ada, tiada challenge baharu.');
    const failed = [];
    for (const spec of targets) {
        const page = await browser.newPage();
        try {
            await stealthInit(page);
            console.log(`\n📄 ${spec.label} — ${spec.url}`);
            const ok = await fetchAndSave(page, spec, 30000);
            if (!ok) failed.push(spec);
        } catch (e) {
            console.log(`  ✗ ${spec.label} — ralat: ${e.message}`);
            failed.push(spec);
        } finally {
            try { await page.close(); } catch (e2) { /* tab sudah tutup */ }
        }
    }
    await browser.disconnect();
    return { used: true, failed };
}

// ---------------------------------------------------------------------------
// ALIRAN UTAMA
// ---------------------------------------------------------------------------
async function main() {
    const headedForce = process.argv.includes('--headed');
    const quiet = process.argv.includes('--quiet');
    const force = process.argv.includes('--fresh');

    fs.mkdirSync(CACHE_DIR, { recursive: true });

    const targets = PAGES.filter(p => force || !isFresh(p.key));
    if (targets.length === 0 && !headedForce) {
        console.log('ℹ️  Cache isaham masih segar (< 24 jam) — tiada muat turun diperlukan.');
        console.log('   (Guna --fresh untuk paksa muat turun semula.)');
        return;
    }
    console.log('🌐 Membuka isaham.my (Puppeteer)...');

    let failed = [...targets];

    // --- 0) SAMBUNG KE BROWSER KEEPER (jika hidup) — SESI CLOUDFLARE SUDAH SAH ---
    if (!headedForce) {
        const keeper = await tryKeeper(targets);
        if (keeper.used) {
            if (keeper.failed.length === 0) {
                console.log('\n✅ Semua halaman dimuat turun melalui sesi keeper (tiada challenge).');
                return;
            }
            failed = keeper.failed;
            console.log(`\n⚠️ ${keeper.failed.length} halaman gagal melalui keeper — cuba browser baharu...`);
        }
    }

    // --- 1) PASS HEADLESS (guna sesi tersimpan) ---
    if (!headedForce) {
        console.log('\n🔍 Pass 1: headless (sesi tersimpan)...');
        const browser = await launch(true);
        const page = await browser.newPage();
        await stealthInit(page);
        await page.setUserAgent(await matchingUA(browser));

        failed = [];
        for (const spec of targets) {
            console.log(`\n📄 ${spec.label} — ${spec.url}`);
            const ok = await fetchAndSave(page, spec, HEADLESS_POLL_MS);
            if (!ok) failed.push(spec);
        }
        console.log(`\n🍪 ${await cookieSummary(page)}`);
        await browser.close();

        if (failed.length === 0) {
            console.log('\n✅ Semua halaman dimuat turun (headless, sesi sah).');
            return;
        }
    }

    // --- Sesi tidak sah / belum ada ---
    if (quiet) {
        console.log('\n⏭️  Sesi isaham tiada/expired — skip (run manual sekali untuk selesaikan Cloudflare).');
        console.log('   Guna: node scratch/scrape-isaham.js');
        return;
    }

    // --- 2) PASS HEADED: solve challenge SEKALI secara manual ---
    console.log(`\n🔐 Sesi Cloudflare tiada/expired — browser DIBUKA (headed).`);
    console.log('   Sila selesaikan challenge Cloudflare secara manual dalam browser.');
    console.log(`   (Masa menunggu maksimum: ${CHALLENGE_WAIT_MS / 60000} minit setiap halaman)`);

    const browser = await launch(false); // <-- SELALU headed di sini (headless: false)
    const page = await browser.newPage();
    await stealthInit(page);
    await page.setUserAgent(await matchingUA(browser));

    const stillFailed = [];
    let solvedOnce = false;
    for (const spec of failed) {
        console.log(`\n📄 ${spec.label} — ${spec.url}`);
        await gotoPage(page, spec.url);
        const waitMs = solvedOnce ? FAST_WAIT_MS : CHALLENGE_WAIT_MS;
        const ok = await waitForContent(page, spec, waitMs);
        if (ok) {
            try {
                const html = await page.content();
                saveCache(spec.key, html);
                console.log(`  ✓ ${spec.label} — disimpan (${(html.length / 1024).toFixed(0)} KB)`);
                solvedOnce = true;
                if (failed.length > 1) {
                    console.log('  ✔ Sesi kini sah — halaman lain akan muat turun lebih cepat.');
                }
            } catch (e) {
                console.log(`  ✗ ${spec.label} — HTML gagal dibaca: ${e.message}`);
                stillFailed.push(spec);
            }
        } else {
            console.error(`  ❌ ${spec.label} — challenge belum diselesaikan.`);
            stillFailed.push(spec);
        }
    }
    console.log(`\n🍪 ${await cookieSummary(page)}`);
    await browser.close();

    // --- 3) VERIFIKASI HEADLESS: sesi tersimpan berfungsi untuk run seterusnya? ---
    if (solvedOnce && stillFailed.length > 0) {
        console.log('\n🔍 Pass 3: verifikasi headless selepas solve (pastikan run auto berfungsi)...');
        const vb = await launch(true);
        const vp = await vb.newPage();
        await stealthInit(vp);
        await vp.setUserAgent(await matchingUA(vb));

        const vFailed = [];
        for (const spec of stillFailed) {
            console.log(`\n📄 ${spec.label} — ${spec.url}`);
            const ok = await fetchAndSave(vp, spec, HEADLESS_POLL_MS);
            if (!ok) vFailed.push(spec);
        }
        console.log(`\n🍪 ${await cookieSummary(vp)}`);
        await vb.close();
        if (vFailed.length === 0) {
            console.log('\n✅ Verifikasi headless lulus — run seterusnya akan auto (headless).');
        } else {
            console.log('\n⚠️  Verifikasi headless masih gagal — sesi mungkin berjangka pendek.');
            console.log('   Selagi cache segar, sync-isaham tetap guna data. Sila run manual semula esok jika perlu.');
        }
    }

    console.log('\n✅ Selesai. Sesi disimpan — run seterusnya akan headless & auto.');
    console.log('   (Jadual auto: auto_runner.js setiap hari 08:45, 13:00, 17:30)');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });