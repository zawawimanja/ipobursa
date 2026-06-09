const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const grades = {
    "5e-resources": "B",
    "ams-material": "B",
    "inspace-creation": "B",
    "manforce-group": "B"
};

Object.keys(grades).forEach(id => {
    const ipo = data.find(x => x.id === id);
    if (ipo) {
        ipo.predictedGrade = grades[id];
        console.log(`Enriched predictedGrade for: ${id} -> ${grades[id]}`);
    }
});

// Write to data.json
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
console.log('Saved to data.json.');

// Write to data.js
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(jsPath, jsContent);
console.log('Saved to data.js.');
