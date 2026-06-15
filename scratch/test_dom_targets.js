const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'sifu-sheets.html');

try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // 1. Mock DOM
    const domElements = {};
    global.document = {
        getElementById(id) {
            if (!domElements[id]) {
                domElements[id] = {
                    value: '',
                    innerText: '',
                    style: {},
                    setAttribute(attr, val) {
                        this[attr] = val;
                    }
                };
            }
            return domElements[id];
        },
        querySelectorAll(selector) {
            if (selector === '.excel-table input') {
                return Object.values(domElements);
            }
            return [];
        }
    };
    
    global.window = {};
    
    // 2. Extract script block from HTML
    const scriptMatches = htmlContent.match(/<script>([\s\S]*?)<\/script>/g);
    const mainScript = scriptMatches[scriptMatches.length - 1]
        .replace('<script>', '')
        .replace('</script>', '')
        .replace('const stockProfiles =', 'global.stockProfiles =')
        .replace('const ipoData =', 'global.ipoData =');
    
    // Evaluate mainScript
    eval(mainScript);
    
    // 3. Test calculation for Solarvest
    console.log('Testing calculation engine for Solarvest...');
    const solarvestData = global.stockProfiles['solarvest'];
    fillFormValues(solarvestData);
    document.getElementById('sheet-target-pe').value = solarvestData.targetPe.toString();
    document.getElementById('sheet-mos-slider').value = '20'; // 20% MoS
    calculateSheet();
    
    console.log(`Solarvest Val1 (FYE F) = ${document.getElementById('td-val1-fye-f').innerText}`);
    
    if (document.getElementById('td-val1-fye-f').innerText !== 'RM 3.10') {
        console.error(`FAIL: Solarvest Val1 should be RM 3.10 but got ${document.getElementById('td-val1-fye-f').innerText}`);
        process.exit(1);
    }
    
    // 4. Test calculation for AMBEST
    console.log('\nTesting calculation engine for AMBEST...');
    const ambestData = global.stockProfiles['ambest'];
    fillFormValues(ambestData);
    document.getElementById('sheet-target-pe').value = ambestData.targetPe.toString();
    document.getElementById('sheet-mos-slider').value = '20'; // 20% MoS
    calculateSheet();
    
    console.log(`AMBEST Val1 (FYE F) = ${document.getElementById('td-val1-fye-f').innerText}`);
    
    if (document.getElementById('td-val1-fye-f').innerText !== 'RM 0.45') {
        console.error(`FAIL: AMBEST Val1 should be RM 0.45 but got ${document.getElementById('td-val1-fye-f').innerText}`);
        process.exit(1);
    }
    
    console.log('\nSUCCESS: Both Solarvest (RM 3.10) and AMBEST (RM 0.45) DOM calculations are 100% CORRECT!');
    
} catch (err) {
    console.error('Error in DOM validation test:', err);
    process.exit(1);
}
