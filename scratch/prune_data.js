const fs = require('fs');
const path = require('path');

const dataJsonPath = '/home/awi/Desktop/ipohunterv2/data.json';
const dataJsPath = '/home/awi/Desktop/ipohunterv2/data.js';
const archivePath = '/home/awi/Desktop/ipohunterv2/archive/archive_pre_2025.json';

// Read existing data.json
let ipos = [];
if (fs.existsSync(dataJsonPath)) {
    ipos = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
} else {
    console.error("data.json not found!");
    process.exit(1);
}

// Locate restngo and update/fill its fields
let restngoIndex = ipos.findIndex(ipo => ipo.id === 'restngo' || ipo.symbol === 'RESTNGO');
const restngoUpdated = {
    "id": "restngo",
    "companyName": "RNG Tech Berhad",
    "symbol": "RESTNGO",
    "market": "ACE Market",
    "price": 0.13,
    "listingDate": "07-Jul-2026",
    "shariah": true,
    "stage": 5,
    "status": "Listed",
    "year": 2026,
    "sector": "Consumer Products & Services",
    "os": 7.8,
    "ib": "M & A Securities",
    "predictedGrade": "B",
    "openPrice": 0.13,
    "closePrice": 0.13,
    "currentPrice": 0.135,
    "highPrice": 0.135,
    "performance": "+3.85%",
    "strategy": "Scalp",
    "sifuTargetPrice": 0.17, // default or V6 target
    "calibratedSifuTargetPrice": 0.15
};

if (restngoIndex !== -1) {
    // Overwrite with fully enriched object
    ipos[restngoIndex] = { ...ipos[restngoIndex], ...restngoUpdated };
    console.log("Updated RESTNGO in ipos array.");
} else {
    ipos.push(restngoUpdated);
    console.log("Added RESTNGO to ipos array.");
}

// Split into active (year >= 2025) and archived (year < 2025)
const activeIpos = ipos.filter(ipo => {
    const year = parseInt(ipo.year);
    return !isNaN(year) && year >= 2025;
});

const archivedIpos = ipos.filter(ipo => {
    const year = parseInt(ipo.year);
    return isNaN(year) || year < 2025;
});

console.log(`Total IPOs: ${ipos.length}`);
console.log(`Active IPOs (2025+): ${activeIpos.length}`);
console.log(`Archived IPOs (<2025): ${archivedIpos.length}`);

// Write archived IPOs to archive/archive_pre_2025.json
fs.writeFileSync(archivePath, JSON.stringify(archivedIpos, null, 4), 'utf8');
console.log(`Archived data written to: ${archivePath}`);

// Write active IPOs back to data.json
fs.writeFileSync(dataJsonPath, JSON.stringify(activeIpos, null, 4), 'utf8');
console.log(`Active data written to: ${dataJsonPath}`);

// Update data.js with active IPOs
const jsContent = `const IPO_DATA = ${JSON.stringify(activeIpos, null, 2)};\n`;
fs.writeFileSync(dataJsPath, jsContent, 'utf8');
console.log(`Active data wrapper written to: ${dataJsPath}`);
