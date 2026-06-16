const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

const hegroup = data.find(d => d.id === 'hegroup' || d.symbol === 'HEGROUP');
console.log('HEGROUP:', JSON.stringify(hegroup, null, 2));

const eco = data.find(d => d.id === 'ecoshop' || d.symbol === 'ECOSHOP');
console.log('ECOSHOP:', JSON.stringify(eco, null, 2));
