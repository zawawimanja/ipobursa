const { exec } = require('child_process');
const path = require('path');

console.log('========================================================================');
console.log('Background Auto-Runner started successfully.');
console.log('Monitoring times: 08:45, 13:00, 17:30 (Monday - Friday).');
console.log('Keep this process running in the background.');
console.log('========================================================================');

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

// Check every 10 seconds for high precision
setInterval(checkAndRun, 10000);
checkAndRun();
