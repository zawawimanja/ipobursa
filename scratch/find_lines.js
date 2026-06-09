const fs = require('fs');
const path = require('path');

const fileJson = path.join(__dirname, '..', 'data.json');
const fileJs = path.join(__dirname, '..', 'data.js');

function findInFile(filePath) {
    console.log('=== FILE:', filePath, '===');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const ids = ['gdgroup', 'golden-destinations', 'isf', 'ogm', 'sbs', 'teamstr'];
    
    ids.forEach(id => {
        const idx = lines.findIndex(l => l.includes(`"id": "${id}"`) || l.includes(`"id":'${id}'`) || l.includes(`id: '${id}'`));
        if (idx !== -1) {
            console.log(`${id}: Line ${idx + 1}`);
            // print 3 lines before and 20 lines after
            const start = Math.max(0, idx - 2);
            const end = Math.min(lines.length - 1, idx + 20);
            for (let i = start; i <= end; i++) {
                console.log(`  ${i + 1}: ${lines[i]}`);
            }
        } else {
            console.log(`${id}: NOT FOUND`);
        }
    });
}

findInFile(fileJson);
findInFile(fileJs);
