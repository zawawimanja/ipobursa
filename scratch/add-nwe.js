/**
 * add-nwe.js
 * Adds NWE Resources Group Berhad (NWEBHD) entry to data.json
 * so sync-public-ipos.js can map KLSE Screener data to it.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const existing = data.find(i => i.id === 'nwe-resources-group-berhad' || i.symbol === 'NWEBHD' || (i.companyName && i.companyName.toLowerCase().includes('nwe')));

if (existing) {
    console.log('NWE Resources Group Berhad already exists:', existing.companyName);
} else {
    const newEntry = {
        id: "nwe-resources-group-berhad",
        companyName: "NWE Resources Group Berhad",
        symbol: "NWEBHD",
        market: "ACE Market",
        price: 0.20,
        openingDate: "29-Sep-2026",
        closingDate: "09-Oct-2026",
        listingDate: "21-Oct-2026",
        stage: 3,
        status: "Public Subscription Phase",
        hasMitiTranche: false,
        shariah: true,
        year: 2026,
        sector: "Industrial Products & Services",
        predictedGrade: "B",
        analystInsight: "✅ <b>NWE RESOURCES GROUP BERHAD (NWEBHD)</b><br>• <b>Public IPO:</b> Dibuka 29 Sep 2026, Tutup 09 Oct 2026, Listing 21 Oct 2026.<br>• <b>Harga IPO:</b> RM0.20 per saham.<br>• <b>Pasaran:</b> Pasaran ACE."
    };

    data.unshift(newEntry);
    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');

    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 4)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = { IPO_DATA };\n}\n`;
    fs.writeFileSync(DATA_JS, jsContent, 'utf8');

    const exportJsContent = `// Auto-generated export wrapper for ES Module environments (e.g. Vercel / Next.js / Vite)\nconst IPO_DATA = ${JSON.stringify(data, null, 4)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = { IPO_DATA };\n}\nif (typeof window !== 'undefined') {\n    window.IPO_DATA = IPO_DATA;\n}\nexport default IPO_DATA;\nexport { IPO_DATA };\n`;
    fs.writeFileSync(DATA_EXPORT_JS, exportJsContent, 'utf8');

    console.log('Successfully added NWE Resources Group Berhad to data.json, data.js, and data_export.js');
}
