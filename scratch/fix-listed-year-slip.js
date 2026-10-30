#!/usr/bin/env node
// Repairs the "year slip" on already-listed records: KLSE past-IPO cards quote
// "21 Oct" without a year, so an open/close date can land a year after its own listing.
// Shifts any application date that falls after the listing day back to the listing's year,
// in both data.json and overrides.json (apply-overrides.js would otherwise restore the bad value).
const path = require('node:path');
const rules = require('../lib/ipo-rules');
const { readData, saveData } = require('../lib/miti-sync');

const ROOT = path.join(__dirname, '..');
const DATE_FIELDS = ['openingDate', 'closingDate', 'mitiOpenDate', 'mitiCloseDate'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');

function repair(data, overrides) {
    const changes = [];
    for (const ipo of data) {
        const listingDay = rules.dayKey(ipo.listingDate);
        if (!listingDay) continue;
        const override = overrides[ipo.id];
        for (const field of DATE_FIELDS) {
            const value = ipo[field];
            if (!rules.isAfterListing(ipo, value)) continue;
            const parts = rules.dateParts(value);
            const isoOf = year => `${year}-${pad(parts.month + 1)}-${pad(parts.day)}`;
            // Walk back whole years until the date sits on or before the listing day.
            let year = parts.year, walked = 0;
            while (year > 2000 && rules.dayKey(isoOf(year)) > listingDay && walked < 4) { year--; walked++; }
            if (!walked) continue;
            const corrected = `${pad(parts.day)}-${MONTHS[parts.month]}-${year}`;
            ipo[field] = corrected;
            if (override && override[field] !== undefined) override[field] = corrected;
            changes.push({ id: ipo.id, field, from: value, to: corrected, listing: ipo.listingDate });
        }
    }
    return changes;
}

if (require.main === module) {
    const { data, overrides } = readData(ROOT);
    const changes = repair(data, overrides);
    if (!changes.length) {
        console.log('Tiada tarikh selepas listing — data sudah sihat.');
        process.exit(0);
    }
    for (const c of changes) console.log(`🛠️ ${c.id}.${c.field}: ${c.from} → ${c.to} (listing ${c.listing})`);
    saveData(ROOT, data, overrides);
    console.log(`\n${changes.length} tarikh dibetulkan; data.json, data.js, data_export.js dan overrides.json ditulis semula.`);
    console.log('Seteruskan: node apply-overrides.js && node generate-ipo-pages.js && node --test tests/');
}

module.exports = { repair };
