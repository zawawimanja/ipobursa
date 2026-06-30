const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../sifu-sheets.html');
const jsonPath = path.join(__dirname, '../data.json');
const jsPath = path.join(__dirname, '../data.js');

if (!fs.existsSync(htmlPath)) {
    console.error('sifu-sheets.html not found!');
    process.exit(1);
}
if (!fs.existsSync(jsonPath)) {
    console.error('data.json not found!');
    process.exit(1);
}

// 1. Read sifu-sheets.html and extract stockProfiles
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const match = htmlContent.match(/const\s+stockProfiles\s*=\s*\{([\s\S]*?)\n\s*\};/);

if (!match) {
    console.error('Could not find stockProfiles definition in sifu-sheets.html!');
    process.exit(1);
}

// Safely evaluate stockProfiles
let stockProfiles;
try {
    eval('stockProfiles = {' + match[1] + '};');
    console.log(`Successfully parsed stockProfiles with ${Object.keys(stockProfiles).length} keys.`);
} catch (e) {
    console.error('Failed to parse stockProfiles:', e);
    process.exit(1);
}

// 2. Read data.json
const ipoData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
console.log(`Loaded ${ipoData.length} records from data.json.`);

// 3. Merge stockProfiles into data.json
let mergeCount = 0;
Object.keys(stockProfiles).forEach(id => {
    const profile = stockProfiles[id];
    const ipo = ipoData.find(x => x.id === id);
    if (ipo) {
        // Merge all fields from profile except id and companyName to avoid duplicates/conflicts
        Object.keys(profile).forEach(key => {
            if (key !== 'id' && key !== 'companyName') {
                ipo[key] = profile[key];
            }
        });
        mergeCount++;
    } else {
        console.warn(`Warning: Profile key '${id}' not found in data.json!`);
    }
});

console.log(`Merged ${mergeCount} profiles into data.json records.`);

// 4. Save data.json
fs.writeFileSync(jsonPath, JSON.stringify(ipoData, null, 4), 'utf8');
console.log('Saved data.json successfully.');

// 5. Generate data.js
const jsContent = `const IPO_DATA = ${JSON.stringify(ipoData, null, 4)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('Saved data.js successfully.');
