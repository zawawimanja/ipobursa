const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const ipo = data.find(x => x.id === 'thmy');

if (!ipo) {
    console.log('THMY not found!');
    process.exit(1);
}

console.log('Before:', JSON.stringify({
    stage: ipo.stage,
    status: ipo.status,
    openingDate: ipo.openingDate,
    closingDate: ipo.closingDate,
    listingDate: ipo.listingDate
}, null, 2));

// Fix: THMY is listed since 23-Oct-2025 — it's stage 5
ipo.stage = 5;
ipo.status = 'Listed';
delete ipo.openingDate;
delete ipo.closingDate;

console.log('After:', JSON.stringify({
    stage: ipo.stage,
    status: ipo.status,
    listingDate: ipo.listingDate
}, null, 2));

const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
fs.writeFileSync(DATA_JS, js, 'utf8');
fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');

console.log('Done! THMY fixed to Stage 5 Listed.');
