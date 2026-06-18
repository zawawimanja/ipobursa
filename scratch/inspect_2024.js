const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const ipos2024 = data.filter(ipo => ipo.year === 2024);
console.log(`Found ${ipos2024.length} IPOs for Year 2024:`);
ipos2024.forEach((ipo, index) => {
    console.log(`${index + 1}. ${ipo.companyName} (${ipo.symbol || 'N/A'}) - Stage: ${ipo.stage}`);
});
