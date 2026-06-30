const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../sifu-sheets.html');

if (!fs.existsSync(filePath)) {
    console.error('sifu-sheets.html not found!');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Regex to match the stockProfiles object definition
const regex = /const\s+stockProfiles\s*=\s*\{[\s\S]*?\n\s*\};/;

if (regex.test(content)) {
    content = content.replace(regex, 'const stockProfiles = {};');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced stockProfiles with an empty object in sifu-sheets.html.');
} else {
    console.error('Could not match stockProfiles in sifu-sheets.html!');
}
