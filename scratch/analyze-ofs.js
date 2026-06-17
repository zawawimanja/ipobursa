const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data.json');
const raw = fs.readFileSync(jsonPath, 'utf8');
const ipos = JSON.parse(raw);

console.log('=== OFS VS PERFORMANCE ANALYSIS (STAGE 5 LISTED IPOs) ===\n');

let ofsIpos = [];
let nonOfsIpos = [];

ipos.forEach(ipo => {
    if (ipo.stage === 5) {
        // We calculate performance on debut or current performance
        const openPrice = ipo.openPrice || 0;
        const price = ipo.price || 0;
        const openPerf = price > 0 && openPrice > 0 ? ((openPrice - price) / price) * 100 : null;
        
        const currentPrice = ipo.currentPrice || 0;
        const currentPerf = price > 0 && currentPrice > 0 ? ((currentPrice - price) / price) * 100 : null;

        const info = {
            id: ipo.id,
            name: ipo.companyName,
            market: ipo.market,
            os: ipo.os || 0,
            ofs: ipo.ofs === true,
            openPerf: openPerf,
            currentPerf: currentPerf
        };

        if (ipo.ofs === true) {
            ofsIpos.push(info);
        } else {
            nonOfsIpos.push(info);
        }
    }
});

console.log(`Total Listed IPOs with OFS: ${ofsIpos.length}`);
const ofsNegativeOpen = ofsIpos.filter(i => i.openPerf !== null && i.openPerf < 0).length;
const ofsPositiveOpen = ofsIpos.filter(i => i.openPerf !== null && i.openPerf > 0).length;
const ofsFlatOpen = ofsIpos.filter(i => i.openPerf !== null && i.openPerf === 0).length;
console.log(`- Opened Down (Negative): ${ofsNegativeOpen} (${((ofsNegativeOpen/ofsIpos.length)*100).toFixed(1)}%)`);
console.log(`- Opened Up (Positive): ${ofsPositiveOpen} (${((ofsPositiveOpen/ofsIpos.length)*100).toFixed(1)}%)`);
console.log(`- Opened Flat: ${ofsFlatOpen} (${((ofsFlatOpen/ofsIpos.length)*100).toFixed(1)}%)\n`);

console.log(`Total Listed IPOs WITHOUT OFS (Public Issue Only): ${nonOfsIpos.length}`);
const nonOfsNegativeOpen = nonOfsIpos.filter(i => i.openPerf !== null && i.openPerf < 0).length;
const nonOfsPositiveOpen = nonOfsIpos.filter(i => i.openPerf !== null && i.openPerf > 0).length;
const nonOfsFlatOpen = nonOfsIpos.filter(i => i.openPerf !== null && i.openPerf === 0).length;
console.log(`- Opened Down (Negative): ${nonOfsNegativeOpen} (${((nonOfsNegativeOpen/nonOfsIpos.length)*100).toFixed(1)}%)`);
console.log(`- Opened Up (Positive): ${nonOfsPositiveOpen} (${((nonOfsPositiveOpen/nonOfsIpos.length)*100).toFixed(1)}%)`);
console.log(`- Opened Flat: ${nonOfsFlatOpen} (${((nonOfsFlatOpen/nonOfsIpos.length)*100).toFixed(1)}%)\n`);

console.log('=== LIST OF IPOs WITH OFS AND THEIR DEBUT PERFORMANCE ===');
console.table(ofsIpos.slice(0, 15).map(i => ({
    Name: i.name,
    'Oversubscribed (OS)': i.os + 'x',
    'Opening Perf %': i.openPerf !== null ? i.openPerf.toFixed(2) + '%' : 'TBA',
    'Current Perf %': i.currentPerf !== null ? i.currentPerf.toFixed(2) + '%' : 'TBA'
})));
