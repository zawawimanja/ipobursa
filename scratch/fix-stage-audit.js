/**
 * fix-stage-audit.js
 * Comprehensive fix for all Stage 2 IPO data integrity issues found in audit
 * Run: node scratch/fix-stage-audit.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const today = new Date(); today.setHours(0, 0, 0, 0);

function parseFlexDate(str) {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const mIdx = months[parts[1].toLowerCase()];
    if (mIdx === undefined) return null;
    return new Date(parseInt(parts[2]), mIdx, parseInt(parts[0]));
}

let fixes = 0;

data.forEach(ipo => {
    // ─── 1. IAB: listed 27-Oct-2025 → Stage 5. closingDate 13-Oct-2026 = FAKE ───
    if (ipo.id === 'iab') {
        console.log(`FIX iab: stage ${ipo.stage} → 5, remove fake closingDate`);
        ipo.stage = 5;
        ipo.status = 'Listed';
        delete ipo.closingDate;
        delete ipo.openingDate;
        fixes++;
    }

    // ─── 2. VERDANT: listed 22-Oct-2025 → Stage 5. closingDate 07-Oct-2026 = FAKE ───
    if (ipo.id === 'verdant') {
        console.log(`FIX verdant: stage ${ipo.stage} → 5, remove fake closingDate`);
        ipo.stage = 5;
        ipo.status = 'Listed';
        delete ipo.closingDate;
        delete ipo.openingDate;
        fixes++;
    }

    // ─── 3. SLGC: closingDate 22-Sep-2026 sudah lepas, listingDate 06-Oct-2026 → Stage 4 ───
    if (ipo.id === 'slgc-berhad') {
        const cd = parseFlexDate(ipo.closingDate);
        const ld = parseFlexDate(ipo.listingDate);
        if (cd && cd < today && ld && ld > today && ipo.stage < 4) {
            console.log(`FIX slgc-berhad: stage ${ipo.stage} → 4 Pre-Listing (close ${ipo.closingDate} sudah lepas, listing ${ipo.listingDate} belum lagi)`);
            ipo.stage = 4;
            ipo.status = 'Pre-Listing';
            fixes++;
        }
    }

    // ─── 4. GB Bond: closingDate 18-Sep-2026 sudah lepas, listingDate 01-Oct-2026 → check ───
    if (ipo.id === 'gb-bond-holdings-berhad') {
        const cd = parseFlexDate(ipo.closingDate);
        const ld = parseFlexDate(ipo.listingDate);
        if (cd && cd < today && ipo.stage < 4) {
            if (ld && ld <= today) {
                console.log(`FIX gb-bond: stage ${ipo.stage} → 5 Listed (listing ${ipo.listingDate} sudah berlalu)`);
                ipo.stage = 5;
                ipo.status = 'Listed';
            } else {
                console.log(`FIX gb-bond: stage ${ipo.stage} → 4 Pre-Listing (close ${ipo.closingDate} sudah lepas)`);
                ipo.stage = 4;
                ipo.status = 'Pre-Listing';
            }
            fixes++;
        }
    }

    // ─── 5. EGH International (eghi): closingDate 05-Oct-2026 → Stage 3 (open for public) ───
    if (ipo.id === 'eghi') {
        const cd = parseFlexDate(ipo.closingDate);
        if (cd && cd > today && ipo.stage < 3) {
            console.log(`FIX eghi: stage ${ipo.stage} → 3 Application Open (close ${ipo.closingDate} belum lagi)`);
            ipo.stage = 3;
            ipo.status = 'Application Open';
            fixes++;
        }
    }

    // ─── 6. RedPlanet: closingDate 08-Oct-2026, listingDate 22-Oct-2026 → Stage 3 ───
    if (ipo.id === 'redplanet-berhad') {
        const cd = parseFlexDate(ipo.closingDate);
        if (cd && cd > today && ipo.stage < 3) {
            console.log(`FIX redplanet-berhad: stage ${ipo.stage} → 3 Application Open (close ${ipo.closingDate})`);
            ipo.stage = 3;
            ipo.status = 'Application Open';
            fixes++;
        }
    }
});

if (fixes === 0) {
    console.log('✅ Tiada masalah dijumpai!');
    process.exit(0);
}

console.log(`\n✅ ${fixes} rekod dibaiki. Menyimpan...`);

const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
fs.writeFileSync(DATA_JS, js, 'utf8');
fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');

console.log('💾 data.json, data.js, data_export.js telah dikemas kini!');
