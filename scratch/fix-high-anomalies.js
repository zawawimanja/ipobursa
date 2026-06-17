const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const DATA_JS_FILE = path.join(__dirname, '../data.js');

if (!fs.existsSync(DATA_JSON_FILE)) {
    console.error('data.json not found!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

let count = 0;
console.log('Aligning highPrice to true maximum observed value (IPO Price, Open, Close, Current, or High):');

data.forEach(d => {
    if (d.stage !== 5 && d.status !== 'Listed') return;

    const oldHigh = d.highPrice || 0;
    const ipo = d.price || 0;
    const open = d.openPrice || 0;
    const close = d.closePrice || 0;
    const current = d.currentPrice || 0;

    const trueMax = Math.max(oldHigh, ipo, open, close, current);

    if (trueMax > oldHigh) {
        console.log(`- ${d.symbol || d.id.toUpperCase()} (${d.companyName}):`);
        console.log(`  Old highPrice: RM ${oldHigh.toFixed(4)}`);
        console.log(`  New highPrice: RM ${trueMax.toFixed(4)} (based on Max of IPO: RM ${ipo}, Open: RM ${open}, Close: RM ${close}, Current: RM ${current})`);
        d.highPrice = parseFloat(trueMax.toFixed(4));
        count++;
    }
});

if (count > 0) {
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 2), 'utf8');
    
    // Also update data.js to sync with frontend
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(DATA_JS_FILE, jsContent, 'utf8');
    
    console.log(`\nSuccessfully fixed ${count} anomalies in data.json and data.js.`);
} else {
    console.log('\nNo anomalies found. All highPrices are consistent.');
}
