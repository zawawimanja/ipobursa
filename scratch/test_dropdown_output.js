const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'sifu-sheets.html');
const jsPath = path.join(__dirname, '..', 'data.js');

try {
    // 1. Read files
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    // 2. Extract stockProfiles
    const stockProfilesMatch = htmlContent.match(/const stockProfiles = \{([\s\S]*?)\n        \};/);
    if (!stockProfilesMatch) {
        console.error('FAIL: Could not locate stockProfiles in HTML.');
        process.exit(1);
    }
    
    // Evaluate stockProfiles and IPO_DATA
    eval('var stockProfiles = {' + stockProfilesMatch[1] + '};');
    eval(jsContent.replace('const IPO_DATA =', 'var ipoData =') + ';');
    
    // 3. Replicate dropdown population
    const selectOptions = [];
    const select = {
        innerHTML: '',
        // mock setting innerHTML
        set innerHTML_val(val) { this.innerHTML = val; },
        appendOption(htmlString) {
            const m = htmlString.match(/value="([^"]+)">([^<]+)/);
            if (m) {
                selectOptions.push({ id: m[1], name: m[2] });
            }
        }
    };
    
    // Mock the logic from sifu-sheets.html
    const profiles = Object.values(stockProfiles).map(p => ({
        id: p.id,
        companyName: p.companyName
    }));
    
    if (typeof ipoData !== 'undefined') {
        ipoData.forEach(ipo => {
            if (ipo.year === 2026 && ipo.status === 'Listed' && ipo.shariah === true) {
                const exists = profiles.some(p => p.id === ipo.id);
                if (!exists) {
                    profiles.push({
                        id: ipo.id,
                        companyName: ipo.companyName
                    });
                }
            }
        });
    }
    
    profiles.sort((a, b) => a.companyName.localeCompare(b.companyName));
    
    profiles.forEach(profile => {
        select.appendOption(`<option value="${profile.id}">${profile.companyName}</option>`);
    });
    
    // 4. Print & Verify options list
    console.log('=== Dynamically Initialized Dropdown Options ===');
    console.log(`Total Option Count: ${selectOptions.length}`);
    
    const targets = ['gdgroup', 'isf', 'ogm', 'sbs', 'teamstr', 'adnex', 'keeming', 'semico', 'skyechip', 'gold-li'];
    let targetsFound = 0;
    
    selectOptions.forEach((opt, idx) => {
        const isTarget = targets.includes(opt.id) ? ' [DYNAMIC]' : '';
        console.log(`${idx + 1}. ${opt.name} (${opt.id})${isTarget}`);
        if (targets.includes(opt.id)) targetsFound++;
    });
    
    console.log('\nDynamic IPOs matched:', targetsFound, '/', targets.length);
    if (targetsFound !== targets.length) {
        console.error('FAIL: Not all expected dynamic IPOs were found in the dropdown list.');
        process.exit(1);
    }
    
    console.log('SUCCESS: Dropdown options simulation passed perfectly!');
} catch (err) {
    console.error('ERROR during simulation:', err);
    process.exit(1);
}
