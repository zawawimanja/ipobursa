const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data.js');
let content = fs.readFileSync(filePath, 'utf8');

// IPOs to update (all stage 2 except KEB)
const updates = [
    { name: 'EcoSys (Malaysia) Berhad', open: '08-Jul-2026', close: '16-Jul-2026' },
    { name: '1 Doc International Berhad', open: '07-Jul-2026', close: '16-Jul-2026' },
    { name: 'SPB Development Berhad', open: '10-Jul-2026', close: '17-Jul-2026' },
    { name: 'Butterfield FB Berhad', open: '09-Jul-2026', close: '17-Jul-2026' },
    { name: 'Evocom Berhad', open: '08-Jul-2026', close: '17-Jul-2026' },
    { name: 'SLGC Berhad', open: '10-Jul-2026', close: '18-Jul-2026' },
    { name: 'GB Bond Holdings Berhad', open: '07-Jul-2026', close: '17-Jul-2026' },
];

for (const u of updates) {
    // Find the entry in data.js: look for "companyName": "XXX"
    const namePattern = new RegExp(`"companyName":\\s*"${escapeRegex(u.name)}"`);
    // Find the opening brace of the object containing this companyName
    // We'll find the object and check if mitiOpenDate/mitiCloseDate already exist
    
    if (content.includes(`"mitiOpenDate": "`)) {
        // Update existing mitiOpenDate value
        
    }
    
    // Simple approach: find position and replace
    const idx = content.indexOf(`"companyName": "${u.name}"`);
    if (idx === -1) {
        console.log(`Not found: ${u.name}`);
        continue;
    }
    
    // Find the object start ({ before companyName)
    let objStart = content.lastIndexOf('{', idx);
    // Find the object end (}) after companyName
    let objEnd = content.indexOf('}', idx);
    
    if (objStart === -1 || objEnd === -1) {
        console.log(`Could not find object bounds for: ${u.name}`);
        continue;
    }
    
    const objStr = content.substring(objStart, objEnd + 1);
    
    // Check if mitiOpenDate already exists
    const hasMitiOpen = objStr.includes('"mitiOpenDate"');
    const hasMitiClose = objStr.includes('"mitiCloseDate"');
    
    let newObjStr = objStr;
    
    if (hasMitiOpen) {
        newObjStr = newObjStr.replace(/"mitiOpenDate":\s*"[^"]*"/, `"mitiOpenDate": "${u.open}"`);
    } else {
        // Add mitiOpenDate before the closing }
        newObjStr = newObjStr.replace(/\}\s*$/, `,\n    "mitiOpenDate": "${u.open}"\n  }`);
    }
    
    if (hasMitiClose) {
        newObjStr = newObjStr.replace(/"mitiCloseDate":\s*"[^"]*"/, `"mitiCloseDate": "${u.close}"`);
    } else {
        // Add mitiCloseDate before the closing }
        newObjStr = newObjStr.replace(/\}\s*$/, `,\n    "mitiCloseDate": "${u.close}"\n  }`);
    }
    
    content = content.substring(0, objStart) + newObjStr + content.substring(objEnd + 1);
    console.log(`Updated: ${u.name}`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
