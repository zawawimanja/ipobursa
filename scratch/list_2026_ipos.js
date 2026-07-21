const fs = require('fs');

const ipoData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const ipos2026 = ipoData.filter(ipo => ipo.year === 2026);

console.log("Total 2026 IPOs:", ipos2026.length);
console.log(JSON.stringify(ipos2026.map(ipo => ({
    id: ipo.id,
    companyName: ipo.companyName,
    sector: ipo.sector,
    market: ipo.market,
    ib: ipo.ib,
    price: ipo.price,
    geography: ipo.geography,
    status: ipo.status,
    stage: ipo.stage,
    predictedGrade: ipo.predictedGrade,
    performance: ipo.performance
})), null, 2));
