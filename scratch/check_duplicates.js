const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const seenIds = new Set();
const duplicateIds = [];

const seenNames = new Set();
const duplicateNames = [];

data.forEach(ipo => {
    if (seenIds.has(ipo.id)) {
        duplicateIds.push(ipo.id);
    }
    seenIds.add(ipo.id);

    const normName = ipo.companyName.toLowerCase().replace(/berhad|bhd|group|holdings/gi, '').replace(/[^a-z0-9]/g, '').trim();
    if (seenNames.has(normName)) {
        duplicateNames.push(ipo.companyName);
    }
    seenNames.add(normName);
});

console.log('Duplicate IDs:', duplicateIds);
console.log('Duplicate Names (normalized):', duplicateNames);
