const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

console.log('IPOs in Stage 3, 4, 5 missing OS:');
data.forEach(ipo => {
    if (ipo.stage >= 3 && (!ipo.os || ipo.os === 0)) {
        console.log(`- [Stage ${ipo.stage}] ID: ${ipo.id}, Name: ${ipo.companyName}, OS: ${ipo.os}`);
    }
});
