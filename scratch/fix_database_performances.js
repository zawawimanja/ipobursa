const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

try {
    // 1. Fix data.json
    console.log('Reading data.json...');
    let jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let jsonUpdated = 0;

    jsonData.forEach(ipo => {
        if (ipo.status === 'Listed') {
            const price = ipo.price;
            const currentPrice = ipo.currentPrice;

            if (price > 0 && currentPrice > 0) {
                const calculatedPerf = ((currentPrice - price) / price) * 100;
                const formattedPerf = (calculatedPerf >= 0 ? '+' : '') + calculatedPerf.toFixed(2) + '%';
                
                // Parse existing performance to compare
                const cleanPerfStr = ipo.performance ? ipo.performance.replace(/[+%]/g, '').trim() : '';
                const existingPerfNum = parseFloat(cleanPerfStr);
                
                if (isNaN(existingPerfNum) || Math.abs(calculatedPerf - existingPerfNum) > 0.05) {
                    const oldPerf = ipo.performance;
                    ipo.performance = formattedPerf;
                    jsonUpdated++;
                    console.log(`[JSON FIX] ${ipo.companyName}: Perf ${oldPerf} -> ${formattedPerf} (Price: RM ${price} -> RM ${currentPrice})`);
                }
            }
        }
    });

    if (jsonUpdated > 0) {
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 4));
        console.log(`Updated ${jsonUpdated} records in data.json.\n`);
    } else {
        console.log('No discrepancies found in data.json.\n');
    }

    // 2. Fix data.js
    console.log('Reading data.js...');
    let jsContent = fs.readFileSync(jsPath, 'utf8');
    
    // Since data.js exports an array directly (e.g. "const ipoData = [ ... ];"),
    // the cleanest way to update it is to replace the array content with the updated JSON array,
    // preserving the JS variable prefix/suffix.
    const arrayStartIdx = jsContent.indexOf('[');
    const arrayEndIdx = jsContent.lastIndexOf(']');
    
    if (arrayStartIdx !== -1 && arrayEndIdx !== -1) {
        const jsPrefix = jsContent.substring(0, arrayStartIdx);
        // We can just format the updated array as JS array content.
        // To be safe, we can read data.json back and format it.
        const updatedJsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const formattedArray = JSON.stringify(updatedJsonData, null, 2);
        
        const newJsContent = jsPrefix + formattedArray + ';\n\nif (typeof module !== \'undefined\' && module.exports) {\n    module.exports = IPO_DATA;\n}';
        fs.writeFileSync(jsPath, newJsContent, 'utf8');
        console.log('Successfully updated and synchronized data.js with clean performances.');
    } else {
        console.error('Could not find JS array markers in data.js to update.');
    }

} catch (err) {
    console.error('Error fixing database performances:', err);
}
