const fs = require('fs');
const path = require('path');
const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const junkNames = [
    'Register', 'Access', 'Seminars', 'Recommended amount to subscribe:',
    'Financing Details:', 'Cost Breakdown:', 'Filtered Statistics',
    'Select stocks:', 'Features', 'Company'
];

const initialLength = data.length;
data = data.filter(d => !junkNames.includes(d.companyName));

if (data.length < initialLength) {
    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(DATA_JS, jsContent);
    console.log(`Cleaned up ${initialLength - data.length} junk entries from scraper.`);
} else {
    console.log('No junk entries found.');
}
