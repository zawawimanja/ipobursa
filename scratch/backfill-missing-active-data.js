/**
 * scratch/backfill-missing-active-data.js
 *
 * Mengisi medan-medan yang lompong bagi kaunter tersenarai (Stage 5) dan aktif:
 * 1. Mengisi nilai PE bagi 23 syarikat tersenarai yang mempunyai EPS/PAT & Harga.
 * 2. Mengisi harga buka debut (openPrice) yang hilang:
 *    - United Asiapac Energy Berhad (UNIPAC): RM 0.35 (flat pada harga IPO)
 *    - GTA Holdings Berhad (GTA): RM 0.35 (flat)
 *    - RT Pastry Holdings Berhad (RT): RM 0.18 (flat)
 * 3. Mengisi kadar langganan awam (OS) yang hilang bagi syarikat tersenarai 2026:
 *    - GTA Holdings Berhad: 22.16x
 *    - Semico Capital Berhad (SEMICO): 28.09x
 *    - Guan Huat Seng Holdings Berhad (GHS): 4.78x
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));

let peCount = 0;

// 1. Backfill PE for Stage 5 IPOs with verified EPS/PAT
data.forEach(x => {
    if (x.stage === 5 && (x.pe === undefined || x.pe === null)) {
        let eps = x.eps25 || x.eps24;
        if (!eps && x.pat25 && x.totalShares) {
            eps = (x.pat25 / x.totalShares) * 100;
        }
        if (eps && eps > 0 && x.price && x.price > 0) {
            const pe = Number((x.price / (eps / 100)).toFixed(2));
            x.pe = pe;
            if (!overrides[x.id]) overrides[x.id] = {};
            overrides[x.id].pe = pe;
            peCount++;
        }
    }
});

console.log(`✅ Backfilled PE for ${peCount} listed companies.`);

// 2. Specific counter updates
const specificUpdates = {
    'united-asiapac-energy-berhad': {
        openPrice: 0.35
    },
    'gta-holdings-berhad': {
        openPrice: 0.35,
        os: 22.16
    },
    'rt-pastry-holdings-berhad': {
        openPrice: 0.18,
        closePrice: 0.175
    },
    'semico-ns-': {
        companyName: 'Semico Capital Berhad',
        os: 28.09,
        sector: 'Consumer Products & Services (Arcade Machine & Toy Distribution)'
    },
    'ghs-ns-': {
        companyName: 'Guan Huat Seng Holdings Berhad',
        os: 4.78,
        market: 'ACE Market',
        sector: 'Consumer Products & Services (Food Distribution)'
    }
};

for (const [id, update] of Object.entries(specificUpdates)) {
    const item = data.find(x => x.id === id);
    if (item) {
        Object.assign(item, update);
        if (!overrides[id]) overrides[id] = {};
        Object.assign(overrides[id], update);
        console.log(`✅ Updated ${id}:`, update);
    }
}

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');
console.log('Semua fail JSON berjaya dikemas kini.');

