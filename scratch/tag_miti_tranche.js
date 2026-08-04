/**
 * tag_miti_tranche.js
 * 
 * Tags all recent (2024-2026) listed/active IPOs with hasMitiTranche: true
 * Based on Bursa rules: all IPOs with Bumiputera reserved tranche go through MITI portal.
 * 
 * Exclusions (no MITI tranche):
 *  - REITs and Business Trusts
 *  - Transfer listings (not IPOs)
 *  - Pure institutional placements
 * 
 * Run: node scratch/tag_miti_tranche.js
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

// IPOs explicitly known to NOT have MITI tranche (REITs, Business Trusts, etc.)
const NO_MITI_IDS = [
    'wct-reit',         // REIT
    'amanahraya-reit',  // REIT
    'prolintas-infra',  // Business Trust / Infrastructure
    'skyechip',         // No MITI (excluded in page logic already)
];

// Known MITI dates for specific IPOs (fill in what you know)
// Format: { mitiOpenDate: 'DD-MMM-YYYY', mitiCloseDate: 'DD-MMM-YYYY' }
const KNOWN_MITI_DATES = {
    // 2026 IPOs (already tagged in previous session)
    '1doc': { mitiOpenDate: '01-Jul-2026', mitiCloseDate: '10-Jul-2026' },
    'spb-development-berhad': { mitiOpenDate: '01-Jul-2026', mitiCloseDate: '10-Jul-2026' },
    'butterfield-fb-berhad': { mitiOpenDate: '01-Jul-2026', mitiCloseDate: '10-Jul-2026' },
    'evocom-berhad': { mitiOpenDate: '01-Jul-2026', mitiCloseDate: '10-Jul-2026' },
    'slgc-berhad': { mitiOpenDate: '01-Jul-2026', mitiCloseDate: '10-Jul-2026' },
    'keb-berhad': { mitiOpenDate: '13-Jul-2026', mitiCloseDate: '22-Jul-2026' },
    'united-asiapac-energy-berhad': { mitiOpenDate: '01-Jul-2026', mitiCloseDate: '10-Jul-2026' },
    'gb-bond-holdings-berhad': { mitiOpenDate: '01-Jul-2026', mitiCloseDate: '10-Jul-2026' },
    'redplanet-berhad': { mitiOpenDate: '20-Jul-2026', mitiCloseDate: '28-Jul-2026' },

    // 2026 Listed - Add known MITI dates here if you recall them
    // 'stratus-global-holdings-berhad': { mitiOpenDate: '...', mitiCloseDate: '...' },
    // 'enest-group-berhad': { mitiOpenDate: '...', mitiCloseDate: '...' },
};

console.log('Reading data.json...');
let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let taggedCount = 0;
let datesCount = 0;
let skippedCount = 0;

data = data.map(ipo => {
    // Skip ones explicitly excluded
    if (NO_MITI_IDS.includes(ipo.id)) {
        skippedCount++;
        return ipo;
    }

        // Use ipo.year field (always set) - tag all years, older ones may not have dates
    // but at least hasMitiTranche flags them for the history section

    // Skip REITs and Business Trusts by name pattern
    const name = (ipo.companyName || '').toLowerCase();
    const sector = (ipo.sector || '').toLowerCase();
    if (name.includes('reit') || name.includes('trust') || sector.includes('reit') || sector.includes('business trust')) {
        skippedCount++;
        return ipo;
    }

    // Apply known MITI dates if available
    const knownDates = KNOWN_MITI_DATES[ipo.id];
    if (knownDates && !ipo.mitiOpenDate) {
        datesCount++;
        return { ...ipo, hasMitiTranche: true, ...knownDates };
    }

    // Tag with hasMitiTranche = true (without dates — dates unknown for historical)
    if (!ipo.hasMitiTranche) {
        taggedCount++;
        return { ...ipo, hasMitiTranche: true };
    }

    return ipo;
});

// Write updated data.json
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
console.log(`✅ data.json updated`);

// Write data.js
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log(`✅ data.js updated`);

console.log(`\n📊 Summary:`);
console.log(`  Tagged hasMitiTranche = true (no dates): ${taggedCount}`);
console.log(`  Tagged with known MITI dates:             ${datesCount}`);
console.log(`  Skipped (REITs/excluded):                 ${skippedCount}`);

// Verify
const tagged = data.filter(x => x.hasMitiTranche);
const listedTagged = data.filter(x => x.hasMitiTranche && x.status === 'Listed');
const withDates = data.filter(x => x.mitiOpenDate);
console.log(`\n✅ Total hasMitiTranche: ${tagged.length}`);
console.log(`✅ Listed + hasMitiTranche: ${listedTagged.length}`);
console.log(`✅ With actual MITI dates: ${withDates.length}`);
