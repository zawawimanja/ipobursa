const { exec } = require('child_process');
const path = require('path');

console.log('========================================================================');
console.log('Background Auto-Runner started successfully.');
console.log('Daily IPO sync times: 08:45, 13:00, 17:30 (Monday - Friday).');
console.log('MITI auto-sync: every 30 min (08:30 - 18:30, Monday - Friday).');
console.log('iSaham 403 bypass: guna cookies sesi Chrome (diekstrak automatik oleh');
console.log('sync-isaham.js dari scratch/isaham-cookies.json — refresh 12 jam).');
console.log('Keep this process running in the background.');
console.log('========================================================================');

// ---------------------------------------------------------------------------
// iSaham 403 bypass via Chrome session cookies (TIDAK perlu browser keeper —
// Cloudflare challenge tak boleh auto-solve; cookies sesi Chrome yang sah
// adalah cara yang terbukti berfungsi — lihat sync-isaham.js loadIsahamCookies)
// ---------------------------------------------------------------------------

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
checkAndRun();
checkAndRunMiti();
