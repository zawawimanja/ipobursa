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
    // Find the last script block which contains the logic
    const mainScript = scriptMatches[scriptMatches.length - 1]
        .replace('<script>', '')
        .replace('</script>', '')
        .replace('const stockProfiles =', 'global.stockProfiles =')
        .replace('const ipoData =', 'global.ipoData =');
    
    // Evaluate mainScript in this context
    eval(mainScript);
    
    // 3. Test calculation for SLGC Berhad
    console.log('Testing calculation engine for SLGC Berhad...');
    const slgcData = global.stockProfiles['slgc-berhad'];
    
    // Convert inputs to text/readonly and load profile
    document.querySelectorAll('.excel-table input').forEach(input => {
        input.setAttribute('type', 'text');
        input.setAttribute('readonly', true);
    });
    
    fillFormValues(slgcData);
    
    // Set sidebar target PE
    document.getElementById('sheet-target-pe').value = slgcData.targetPe.toString();
    document.getElementById('sheet-mos-slider').value = '10'; // 10% MoS
    
    // Run calculateSheet
    calculateSheet();
    
    // 4. Verify outputs
    console.log('\n--- DOM Outputs after calculateSheet() ---');
    console.log(`Stock: ${document.getElementById('td-stock-name').innerText}`);
    console.log(`Shares (Formatted Input): ${document.getElementById('inp-total-shares').value}`);
    console.log(`Revenue FYE F (Formatted Input): ${document.getElementById('inp-rev-fye-f').value}`);
    console.log(`PAT FYE F (Formatted Input): ${document.getElementById('inp-pat-fye-f').value}`);
    console.log(`Market Cap: ${document.getElementById('td-market-cap').innerText}`);
    console.log(`EPS FYE F: ${document.getElementById('td-eps-fye-f').innerText} sen`);
    console.log(`PE FYE F: ${document.getElementById('td-per-fye-f').innerText}x`);
    console.log(`Sifu Target Price (Valuation): ${document.getElementById('td-val1-fye-f').innerText}`);
    console.log(`Had Beli (10% MoS): ${document.getElementById('td-buy1-fye-f').innerText}`);
    
    // Test if math matches
    if (document.getElementById('td-eps-fye-f').innerText === '2.98' && 
        document.getElementById('td-val1-fye-f').innerText === 'RM 0.36' && 
        document.getElementById('td-buy1-fye-f').innerText === 'RM 0.32') {
        console.log('\nSUCCESS: DOM calculation matches mathematically expected Sifu model perfectly!');
    } else {
        console.error('\nFAIL: Calculation results do not match expected Sifu model.');
        process.exit(1);
    }
} catch (err) {
    console.error('Error in DOM calculation test:', err);
    process.exit(1);
}
