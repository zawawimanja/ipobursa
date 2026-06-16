const fs = require('fs');

function cleanSumtechData() {
    const filePath = 'data.json';
    const raw = fs.readFileSync(filePath, 'utf8');
    const ipos = JSON.parse(raw);
    
    let updated = false;
    ipos.forEach(ipo => {
        if (ipo.id === 'sum-technology') {
            ipo.symbol = 'SUM';
            delete ipo.openPrice;
            delete ipo.closePrice;
            delete ipo.currentPrice;
            delete ipo.performance;
            delete ipo.dailyChange;
            updated = true;
            console.log('Cleaned Sum Technology Berhad database entry.');
        }
    });
    
    if (updated) {
        fs.writeFileSync(filePath, JSON.stringify(ipos, null, 2), 'utf8');
        console.log('Saved data.json.');
        
        const jsContent = `const ipoData = ${JSON.stringify(ipos, null, 2)};\n\nif (typeof module !== 'undefined') {\n    module.exports = ipoData;\n}`;
        fs.writeFileSync('data.js', jsContent, 'utf8');
        console.log('Saved data.js.');
    }
}

cleanSumtechData();
