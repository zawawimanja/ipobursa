const fs = require('fs');

// File paths
const dataJsonPath = './data.json';
const dataJsPath = './data.js';
const dataExportPath = './data_export.js';

// Stratus Update Data
const updateData = {
    stage: 5,
    status: 'Listed',
    price: 0.80,
    symbol: 'STRATUS',
    stockCode: '5356',
    openPrice: 1.96,
    currentPrice: 1.95,
    closePrice: 1.95,
    highPrice: 2.03,
    dailyChange: 143.75,
    performance: '+143.8%',
    listingDate: '21-Jul-2026',
    strategy: 'Swing'
};

// 1. Update data.json
if (fs.existsSync(dataJsonPath)) {
    let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    let stratus = data.find(x => x.id === 'stratus-global');
    if (stratus) {
        Object.assign(stratus, updateData);
        fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
        console.log('Successfully updated stratus-global in data.json');
    } else {
        console.log('stratus-global not found in data.json');
    }
}

// 2. Update data.js (which matches data.json but is exported as var ipoData)
if (fs.existsSync(dataJsPath)) {
    let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    const jsContent = `var ipoData = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(dataJsPath, jsContent, 'utf8');
    console.log('Successfully updated data.js');
}

// 3. Update data_export.js
if (fs.existsSync(dataExportPath)) {
    // We need to parse data_export.js. Since it's valid JS code setting a global array, we can extract the JSON part or parse it.
    let content = fs.readFileSync(dataExportPath, 'utf8');
    // Find const IPO_DATA = [...]
    const startIdx = content.indexOf('[');
    const endIdx = content.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        try {
            let exportData = JSON.parse(jsonStr);
            let stratus = exportData.find(x => x.id === 'stratus-global');
            if (stratus) {
                Object.assign(stratus, updateData);
                // Also update other fields in data_export that might not be in the updateData object
                stratus.price = 0.80; // Ensure it's correct
                const newContent = `const IPO_DATA = ${JSON.stringify(exportData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
                fs.writeFileSync(dataExportPath, newContent, 'utf8');
                console.log('Successfully updated stratus-global in data_export.js');
            } else {
                console.log('stratus-global not found in data_export.js');
            }
        } catch (e) {
            console.error('Failed to parse JSON from data_export.js:', e.message);
        }
    } else {
        console.log('Could not parse data_export.js boundaries');
    }
}
