const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

try {
    // 1. Verify JSON
    console.log('Testing data.json...');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const filtered = data.filter(ipo => ipo.year === 2026 && ipo.status === 'Listed' && ipo.shariah === true);
    
    console.log(`Found ${filtered.length} Listed Shariah 2026 IPOs in data.json.`);
    if (filtered.length !== 21) {
        console.error('FAIL: Expected exactly 21 Listed Shariah 2026 IPOs, but found', filtered.length);
        process.exit(1);
    }
    
    // 2. Verify analyst insights
    let missingInsights = 0;
    filtered.forEach(ipo => {
        if (!ipo.analystInsight || ipo.analystInsight === 'NONE' || ipo.analystInsight.trim() === '') {
            console.error(`FAIL: IPO "${ipo.id}" (${ipo.companyName}) is missing analyst insights.`);
            missingInsights++;
        } else {
            console.log(`  - ${ipo.id}: Grade ${ipo.predictedGrade || 'N/A'}, Insight exists (${ipo.analystInsight.substring(0, 50)}...)`);
        }
    });
    
    if (missingInsights > 0) {
        console.error(`FAIL: ${missingInsights} IPOs are missing insights.`);
        process.exit(1);
    }
    
    // 3. Verify data.js
    console.log('\nTesting data.js syntax and export...');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    // We can evaluate it by replacing "const IPO_DATA =" with "module.exports ="
    const modContent = jsContent.replace('const IPO_DATA =', 'module.exports =');
    const tempFilePath = path.join(__dirname, 'temp_data.js');
    fs.writeFileSync(tempFilePath, modContent);
    
    const importedData = require(tempFilePath);
    fs.unlinkSync(tempFilePath);
    
    const filteredJs = importedData.filter(ipo => ipo.year === 2026 && ipo.status === 'Listed' && ipo.shariah === true);
    console.log(`Found ${filteredJs.length} Listed Shariah 2026 IPOs in data.js.`);
    if (filteredJs.length !== 21) {
        console.error('FAIL: data.js count mismatch:', filteredJs.length);
        process.exit(1);
    }
    
    // 4. Verify golden-destinations is gone
    const gdJson = data.find(x => x.id === 'golden-destinations');
    const gdJs = importedData.find(x => x.id === 'golden-destinations');
    if (gdJson || gdJs) {
        console.error('FAIL: golden-destinations duplicate still exists in database!');
        process.exit(1);
    }
    
    console.log('\nSUCCESS: All database verifications passed perfectly.');
} catch (err) {
    console.error('ERROR during verification:', err);
    process.exit(1);
}
