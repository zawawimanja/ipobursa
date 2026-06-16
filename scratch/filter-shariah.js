const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const dataJsPath = path.join(__dirname, '..', 'data.js');

try {
    let dataJson = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    
    const initialCount = dataJson.length;
    dataJson = dataJson.filter(ipo => ipo.shariah !== false);
    const finalCount = dataJson.length;
    
    fs.writeFileSync(dataJsonPath, JSON.stringify(dataJson, null, 4));
    
    const jsContent = 'const ipoData = ' + JSON.stringify(dataJson, null, 4) + ';\n';
    fs.writeFileSync(dataJsPath, jsContent);
    
    console.log(`Filtered out ${initialCount - finalCount} Non-Shariah stocks.`);
} catch (e) {
    console.error(e);
}
