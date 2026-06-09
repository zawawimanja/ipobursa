const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'main.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

console.log('Searching for key terms in main.js...');
lines.forEach((line, idx) => {
    if (line.includes('function ') || line.includes('class=') || line.includes('render') || line.includes('card')) {
        if (line.includes('render') || line.includes('ipo-card') || line.includes('card-')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
