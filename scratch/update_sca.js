const fs = require('fs');
const path = require('path');
const d = require(path.join(__dirname, '../data.json'));
const ipo = d.find(x => x.companyName === 'SCA Solutions Berhad');
if(ipo){
    ipo.sector = 'Industrial Products & Services (M&E)';
    ipo.geography = '';
    fs.writeFileSync(path.join(__dirname, '../data.json'), JSON.stringify(d, null, 4));
    const js = 'const IPO_DATA = ' + JSON.stringify(d, null, 2) + ';\n\nif (typeof module !== "undefined" && module.exports) {\n    module.exports = IPO_DATA;\n}\n';
    fs.writeFileSync(path.join(__dirname, '../data.js'), js);
    fs.writeFileSync(path.join(__dirname, '../data_export.js'), js);
    console.log('Updated');
}
