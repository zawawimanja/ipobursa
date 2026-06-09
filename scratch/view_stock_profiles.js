const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'sifu-sheets.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Match stockProfiles object
const match = htmlContent.match(/const stockProfiles = \{([\s\S]*?)\n        \};/);
if (match) {
    eval('var stockProfiles = {' + match[1] + '};');
    const ids = ['inspace-creation', '5e-resources', 'manforce-group', 'teamstr'];
    ids.forEach(id => {
        console.log(`\n=== PROFILE: ${id} ===`);
        console.log(stockProfiles[id]);
    });
}
