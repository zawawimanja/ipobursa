/**
 * verify_miti_by_rules.js
 * 
 * Sets hasMitiTranche based on Bursa Malaysia listing rules:
 * 1. Main Market IPOs: Mandatory 12.5% Bumiputera allocation via MITI -> hasMitiTranche: true
 * 2. Stage 2 / Active MITI IPOs with mitiOpenDate -> hasMitiTranche: true
 * 3. Verified ACE Market IPOs with MITI (KEEMING, etc.) -> hasMitiTranche: true
 * 4. Verified NO MITI (SRKK AI, SkyeChip, REITs) -> hasMitiTranche: false
 * 
 * Run: node scratch/verify_miti_by_rules.js
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Confirmed ACE Market IPOs that HAVE MITI tranche
const CONFIRMED_ACE_MITI = [
    'keeming',
    'united-asiapac-energy-berhad',
    '1doc',
    'spb-development-berhad',
    'butterfield-fb-berhad',
    'evocom-berhad',
    'slgc-berhad',
    'keb-berhad',
    'gb-bond-holdings-berhad',
    'redplanet-berhad',
];

// Confirmed NO MITI
const CONFIRMED_NO_MITI = [
    'srkk-ai',
    'skyechip',
    'wct-reit',
    'prolintas-infra',
];

let mainMarketCount = 0;
let confirmedAceCount = 0;
let noMitiCount = 0;

data = data.map(x => {
    const market = (x.market || '').toLowerCase();
    const isMainMarket = market.includes('main');
    const isReitOrTrust = (x.companyName || '').toLowerCase().includes('reit') || (x.companyName || '').toLowerCase().includes('trust');

    // 1. Confirmed NO MITI
    if (CONFIRMED_NO_MITI.includes(x.id) || isReitOrTrust) {
        x.hasMitiTranche = false;
        delete x.mitiOpenDate;
        delete x.mitiCloseDate;
        noMitiCount++;
        return x;
    }

    // 2. Has explicit MITI dates
    if (x.mitiOpenDate || CONFIRMED_ACE_MITI.includes(x.id)) {
        x.hasMitiTranche = true;
        confirmedAceCount++;
        return x;
    }

    // 3. Main Market IPOs (Mandatory MITI Bumiputera allocation per Bursa SC guidelines)
    if (isMainMarket) {
        x.hasMitiTranche = true;
        mainMarketCount++;
        return x;
    }

    // ACE Market IPOs without confirmed dates remain unverified or false
    return x;
});

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');

const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('✅ Rule-based MITI update complete!');
console.log('  Main Market IPOs tagged (MITI Mandatory):', mainMarketCount);
console.log('  ACE Market confirmed MITI:', confirmedAceCount);
console.log('  Confirmed NO MITI:', noMitiCount);
console.log('  Total hasMitiTranche=true:', data.filter(x => x.hasMitiTranche === true).length);
console.log('  Total hasMitiTranche=false:', data.filter(x => x.hasMitiTranche === false).length);
