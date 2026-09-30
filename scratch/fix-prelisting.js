/**
 * fix-prelisting.js
 * Update IPOs to correct Stage 4 (Pre-Listing) based on confirmed listing dates
 * from broker app screenshot + KLSE Screener live data
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));

// Confirmed from broker app "Listing Soon" tab + KLSE Screener
const fixes = {
    'gb-bond-holdings-berhad': {
        stage: 4, status: 'Pre-Listing',
        openingDate: '09-Sep-2026', closingDate: '18-Sep-2026', listingDate: '01-Oct-2026',
        price: 0.25, symbol: 'GBBOND'
    },
    'slgc-berhad': {
        stage: 4, status: 'Pre-Listing',
        openingDate: '10-Sep-2026', closingDate: '22-Sep-2026', listingDate: '06-Oct-2026',
        price: 0.28, symbol: 'SLG'
    },
    'ecosys--malaysia--berhad': {
        stage: 4, status: 'Pre-Listing',
        openingDate: '23-Sep-2026', closingDate: '29-Sep-2026', listingDate: '14-Oct-2026',
        price: 0.27, symbol: 'ECOSYS'
    },
    'redplanet-berhad': {
        stage: 3, status: 'Application Open',
        openingDate: '28-Sep-2026', closingDate: '08-Oct-2026', listingDate: '22-Oct-2026',
        price: 0.19, symbol: 'RPLANET'
    },
    'eghi': {
        stage: 3, status: 'Application Open',
        openingDate: '24-Sep-2026', closingDate: '05-Oct-2026', listingDate: '16-Oct-2026',
        price: 0.16, symbol: 'ECOGRP'
    }
};

let count = 0;
data.forEach(ipo => {
    if (fixes[ipo.id]) {
        const f = fixes[ipo.id];
        Object.keys(f).forEach(k => { ipo[k] = f[k]; });
        console.log(`✅ ${ipo.companyName} → Stage ${f.stage} (${f.status}) | ${f.openingDate} → ${f.closingDate} | List: ${f.listingDate}`);
        // Sync to overrides too
        if (!overrides[ipo.id]) overrides[ipo.id] = {};
        Object.keys(f).forEach(k => { overrides[ipo.id][k] = f[k]; });
        count++;
    }
});

console.log(`\n💾 Menyimpan ${count} rekod dikemas kini...`);

const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
fs.writeFileSync(DATA_JS, js, 'utf8');
fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');
fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

console.log('✅ Selesai! data.json, data.js, data_export.js, overrides.json dikemas kini.');
