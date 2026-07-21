const fs = require('fs');

// Mock browser objects
global.window = {};
global.document = {
    getElementById: (id) => ({
        innerHTML: '',
        value: '',
        appendChild: () => {},
        parentNode: { insertBefore: () => {} }
    }),
    querySelectorAll: (sel) => [],
    createElement: () => ({
        className: '',
        style: {},
        appendChild: () => {},
        querySelector: () => ({ appendChild: () => {} })
    })
};
global.navigator = { userAgent: 'node' };

// Load data.js
eval(fs.readFileSync('./data.js', 'utf8'));
global.ipoData = ipoData;

// Load main.js
try {
    eval(fs.readFileSync('./main.js', 'utf8'));
    console.log('main.js loaded successfully!');
} catch (e) {
    console.error('Error loading main.js:', e);
}

// Test createIPOCard on every single IPO in ipoData
console.log(`Testing createIPOCard on all ${ipoData.length} items in ipoData...`);
let errCount = 0;
ipoData.forEach((ipo, idx) => {
    try {
        if (typeof createIPOCard === 'function') {
            createIPOCard(ipo, idx);
        }
    } catch (e) {
        errCount++;
        console.error(`ERROR rendering IPO index ${idx} (${ipo.companyName}):`, e.message);
    }
});

if (errCount === 0) {
    console.log('ALL IPOs rendered cleanly with 0 errors!');
} else {
    console.log(`Found ${errCount} rendering errors.`);
}
