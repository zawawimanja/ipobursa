const { exec, spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('========================================================================');
console.log('Background Auto-Runner started successfully.');
console.log('Daily IPO sync times: 08:45, 13:00, 17:30 (Monday - Friday).');
console.log('MITI auto-sync: every 30 min (08:30 - 18:30, Monday - Friday).');
console.log('iSaham browser keeper: dipastikan hidup secara automatik (selesai');
console.log('challenge Cloudflare SEKALI → auto-sync setiap hari terus berfungsi).');
console.log('Keep this process running in the background.');
console.log('========================================================================');

// ---------------------------------------------------------------------------
// iSaham Browser Keeper — satu browser Chrome kekal untuk sesi Cloudflare yang
// sah. Cloudflare cabar sekali per sesi browser; dengan keeper, sync harian
// hanya SAMBUNG ke sesi sedia ada (port 9222) — tiada lagi 403 berulang.
// ---------------------------------------------------------------------------
let keeperChild = null;

function keeperAlive() {
    return new Promise(resolve => {
        const req = http.get('http://127.0.0.1:9222/json/version', r => {
            r.resume();
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => { req.destroy(); resolve(false); });
    });
}

async function ensureIsahamKeeper() {
    if (keeperChild && keeperChild.exitCode === null) return; // proses kita sudah hidup
    try {
        if (await keeperAlive()) { keeperChild = null; return; } // keeper lain sudah ada
    } catch (e) { /* teruskan spawn */ }

    console.log(`[${new Date().toLocaleString()}] 💻 Spawning iSaham browser keeper (sesi Cloudflare)...`);
    keeperChild = spawn('node', ['scratch/isaham-browser-keeper.js'], { cwd: __dirname, stdio: 'inherit' });
    keeperChild.on('exit', (code) => {
        console.log(`[${new Date().toLocaleString()}] ⚠️  iSaham keeper exited (code ${code}) — akan di-spawn semula pada pemeriksaan seterusnya.`);
        keeperChild = null;
    });
    keeperChild.on('error', (err) => {
        console.error(`[${new Date().toLocaleString()}] ❌ iSaham keeper spawn error: ${err.message}`);
        keeperChild = null;
    });
}

function checkAndRunKeeper() {
    ensureIsahamKeeper();
}

function checkAndRun() {
    const now = new Date();
    const day = now.getDay();
    
    // Only run on weekdays (Monday = 1 to Friday = 5)
    if (day >= 1 && day <= 5) {
        const toTimeString = now.toTimeString();
        const timeStr = toTimeString.substring(0, 5); // "HH:MM"
        const seconds = toTimeString.substring(6, 8); // "SS"
        
        // Match exact minute and run only once (when seconds is between 00 and 10)
        if ((timeStr === '08:45' || timeStr === '13:00' || timeStr === '17:30') && parseInt(seconds) < 15) {
            console.log(`[${now.toLocaleString()}] Time matches ${timeStr}. Launching automatic sync (node bursa.js)...`);
            
            exec('node bursa.js', { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[${new Date().toLocaleString()}] [Error] Failed to run bursa.js: ${error.message}`);
                    return;
                }
                console.log(`[${new Date().toLocaleString()}] Automatic sync completed:\n`, stdout);
            });
        }
    }
}

// ---------------------------------------------------------------------------
// MITI auto-sync: setiap 30 minit waktu bekerja (08:30 - 18:30, Isnin - Jumaat)
//   1) sync-miti-portal-dates.js   — tarikh buka/tutup dari halaman AWAM portal
//      (tiada login, sentiasa boleh jalan)
//   2) scrape-miti-applicants.js --quiet — jumlah pemohon; headless, dan skip
//      senyap jika sesi login tamat (perlu run manual sekali untuk login semula)
// ---------------------------------------------------------------------------
let lastMitiRun = null;

function checkAndRunMiti() {
    const now = new Date();
    const day = now.getDay();

    // Hujung minggu skip
    if (day < 1 || day > 5) return;

    const minutes = now.getHours() * 60 + now.getMinutes();
    const seconds = now.getSeconds();

    // Window 08:30 - 18:30, pada minit :00 dan :30 sahaja
    if (minutes < 510 || minutes > 1110) return;
    if (minutes % 30 !== 0) return;
    if (parseInt(seconds) > 15) return;

    // Elak run dua kali dalam tempoh 29 minit
    if (lastMitiRun && (now - lastMitiRun) < 29 * 60000) return;
    lastMitiRun = now;

    console.log(`[${now.toLocaleString()}] MITI auto-sync (portal dates + applicants)...`);

    exec('node scratch/sync-miti-portal-dates.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (error) console.error(`[${new Date().toLocaleString()}] [MITI dates] Error: ${error.message}`);
    });

    exec('node scratch/scrape-miti-applicants.js --quiet', { cwd: __dirname }, (error, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (error) console.error(`[${new Date().toLocaleString()}] [MITI apps] Error: ${error.message}`);
    });
}

// Check every 10 seconds for high precision
setInterval(checkAndRun, 10000);
setInterval(checkAndRunMiti, 10000);
// Keeper check: setiap 5 minit (murah; elak spawn berganda)
setInterval(checkAndRunKeeper, 300000);
checkAndRun();
checkAndRunMiti();
checkAndRunKeeper();
