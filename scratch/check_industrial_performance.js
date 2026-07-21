const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const listedIndustrial = data.filter(ipo => 
    ipo.status === 'Listed' && 
    ipo.sector && 
    (ipo.sector.toLowerCase().includes('industrial') || ipo.sector.toLowerCase().includes('chemical') || ipo.sector.toLowerCase().includes('metal') || ipo.sector.toLowerCase().includes('plastic'))
);

console.log(`Found ${listedIndustrial.length} listed industrial/chemical/materials IPOs:`);
console.log(JSON.stringify(listedIndustrial.map(ipo => ({
    id: ipo.id,
    companyName: ipo.companyName,
    sector: ipo.sector,
    price: ipo.price,
    openPrice: ipo.openPrice,
    closePrice: ipo.closePrice,
    performance: ipo.performance,
    os: ipo.os
})), null, 2));
