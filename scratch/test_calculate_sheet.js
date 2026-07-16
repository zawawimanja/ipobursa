/**
 * test_calculate_sheet.js
 * Mock the DOM and execute calculateSheet() with Stratus Global data to see what it calculates.
 */
const fs = require('fs');
const path = require('path');

// 1. Load data
const dataJs = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
// Evaluate data.js to get ipoData variable
const dataJsCleaned = dataJs.replace(/^var\s+ipoData\s*=\s*/, '').replace(/;\s*$/, '');
const ipoData = JSON.parse(dataJsCleaned);

const stratus = ipoData.find(x => x.id === 'stratus-global');

// 2. Load sifu-sheets.html script
const html = fs.readFileSync(path.join(__dirname, '..', 'sifu-sheets.html'), 'utf8');
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let scriptContent = '';
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (content.includes('function calculateSheet')) {
        scriptContent = content;
        break;
    }
}

// 3. Mock DOM
const domValues = {
    'sheet-stock-select': 'stratus-global',
    'sheet-mos-slider': '20',
    'sheet-target-pe': '20.0',
    
    // Default placeholder or loaded values:
    'inp-price': '0.80',
    'inp-total-shares': '1,250,000,000', // with commas!
    
    'inp-rev-23': '145,920,000',
    'inp-rev-24': '158,877,000',
    'inp-rev-25': '220,275,000',
    'inp-rev-fye-f': '224,681,000',
    'inp-rev-fye-f1': '253,890,000',
    
    'inp-gp-23': '75,158,000',
    'inp-gp-24': '81,480,000',
    'inp-gp-25': '113,517,000',
    'inp-gp-fye-f': '115,788,000',
    'inp-gp-fye-f1': '130,840,000',
    
    'inp-pat-23': '42,866,000',
    'inp-pat-24': '28,945,000',
    'inp-pat-25': '66,162,000',
    'inp-pat-fye-f': '65,000,000',
    'inp-pat-fye-f1': '73,450,000',
    
    'inp-eps-growth-f': '0.0', // read-only inputs
    'inp-eps-growth-f1': '0.0',
    
    'inp-assets-23': '20,000,000',
    'inp-assets-24': '25,000,000',
    'inp-assets-25': '35,000,000',
    'inp-assets-fye-f': '40,000,000',
    'inp-assets-fye-f1': '45,000,000',
    
    'inp-liab-23': '5,000,000',
    'inp-liab-24': '6,000,000',
    'inp-liab-25': '7,000,000',
    'inp-liab-fye-f': '8,000,000',
    'inp-liab-fye-f1': '9,000,000',
};

const domText = {};

global.localIpoData = ipoData;
global.window = {};
global.document = {
    getElementById(id) {
        if (!(id in domValues)) {
            // Create a mock element
            return {
                value: '',
                style: {},
                set textContent(v) { domText[id] = v; },
                get textContent() { return domText[id] || ''; },
                set innerHTML(v) { domText[id] = v; },
                get innerHTML() { return domText[id] || ''; },
                set innerText(v) { domText[id] = v; },
                get innerText() { return domText[id] || ''; }
            };
        }
        return {
            id: id,
            get value() { return domValues[id]; },
            set value(v) { domValues[id] = v.toString(); },
            style: {},
            set textContent(v) { domText[id] = v; },
            get textContent() { return domText[id] || ''; },
            set innerHTML(v) { domText[id] = v; },
            get innerHTML() { return domText[id] || ''; },
            set innerText(v) { domText[id] = v; },
            get innerText() { return domText[id] || ''; }
        };
    }
};

// Evaluate the script code in global scope
eval(scriptContent);

console.log('=== BEFORE CALCULATION ===');
console.log('inp-total-shares:', domValues['inp-total-shares']);
console.log('inp-pat-fye-f:', domValues['inp-pat-fye-f']);

try {
    calculateSheet();
    console.log('\n=== AFTER CALCULATION ===');
    console.log('td-market-cap:', domText['td-market-cap']);
    console.log('td-eps-fye-f:', domText['td-eps-fye-f']);
    console.log('inp-eps-growth-f:', domValues['inp-eps-growth-f']);
    console.log('td-val1-fye-f (Base Valuation):', domText['td-val1-fye-f']);
    console.log('td-v3-db (Zone 1 Target):', domText['td-v3-db']);
    console.log('td-v5-db (Zone 2 Target):', domText['td-v5-db']);
    console.log('td-buy1-fye-f (Buy limit):', domText['td-buy1-fye-f']);
} catch (e) {
    console.error('CRASH inside calculateSheet():', e.stack);
}
