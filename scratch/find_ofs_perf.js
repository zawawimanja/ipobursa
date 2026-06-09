const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter listed IPOs (stage 5 or status Listed)
const listedIpos = data.filter(ipo => (ipo.stage === 5 || ipo.status === 'Listed') && ipo.price > 0 && ipo.currentPrice > 0);

console.log(`Total listed IPOs analyzed: ${listedIpos.length}`);

const ofsList = listedIpos.filter(ipo => ipo.ofs === true);
const pureList = listedIpos.filter(ipo => ipo.ofs === false || !ipo.ofs);

console.log(`\n=== IPOs WITH OFS (Total: ${ofsList.length}) ===`);
ofsList.forEach(ipo => {
    const perf = ((ipo.currentPrice - ipo.price) / ipo.price * 100).toFixed(1);
    console.log(`- ${ipo.companyName} (${ipo.symbol || 'N/A'}): IPO: RM ${ipo.price.toFixed(3)}, Current: RM ${ipo.currentPrice.toFixed(3)} | Perf: ${perf}% | Grade: ${ipo.predictedGrade || 'N/A'}`);
});

console.log(`\n=== TOP PURE ISSUE IPOs (No OFS or OFS=false) (First 15 shown) ===`);
pureList.slice(0, 15).forEach(ipo => {
    const perf = ((ipo.currentPrice - ipo.price) / ipo.price * 100).toFixed(1);
    console.log(`- ${ipo.companyName} (${ipo.symbol || 'N/A'}): IPO: RM ${ipo.price.toFixed(3)}, Current: RM ${ipo.currentPrice.toFixed(3)} | Perf: ${perf}% | Grade: ${ipo.predictedGrade || 'N/A'}`);
});

// Calculate averages
const ofsAvgPerf = ofsList.reduce((sum, ipo) => sum + ((ipo.currentPrice - ipo.price) / ipo.price * 100), 0) / ofsList.length;
const pureAvgPerf = pureList.reduce((sum, ipo) => sum + ((ipo.currentPrice - ipo.price) / ipo.price * 100), 0) / pureList.length;

console.log(`\nAverage Performance for OFS IPOs: ${ofsAvgPerf.toFixed(2)}%`);
console.log(`Average Performance for Pure Issue IPOs: ${pureAvgPerf.toFixed(2)}%`);
