const fs = require('fs');

// Read data.js content and extract the JSON
const dataJs = fs.readFileSync('data.js', 'utf8');
// Evaluate the data.js content to get IPO_DATA
const sandbox = {};
const code = dataJs + '\nmodule.exports = IPO_DATA;';
const IPO_DATA = eval(code);

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 
    'iab', 'lwsabah', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 
    'solarvest', 'ctos', 'lgms', 'oppstar', 'agmo'
];

const results = [];

sifuPortfolio.forEach(id => {
    const entry = IPO_DATA.find(x => x.id === id);
    if (!entry) {
        results.push({ id, status: 'Not found in DB' });
        return;
    }
    const targetPrice = entry.sifuTargetPrice || entry.avgTP || 0;
    const upside = targetPrice > 0 ? ((targetPrice - entry.currentPrice) / entry.currentPrice) * 100 : null;
    const belowIPO = entry.currentPrice < entry.price;
    const dropFromHigh = entry.highPrice ? ((entry.currentPrice - entry.highPrice) / entry.highPrice * 100) : null;

    results.push({
        id,
        name: entry.companyName,
        ipoPrice: entry.price,
        currentPrice: entry.currentPrice,
        highPrice: entry.highPrice,
        sifuTargetPrice: targetPrice,
        upside: upside ? upside.toFixed(1) + '%' : 'N/A',
        belowIPO,
        dropFromHigh: dropFromHigh ? dropFromHigh.toFixed(1) + '%' : 'N/A',
        predictedGrade: entry.predictedGrade,
        shariah: entry.shariah,
        dailyChange: entry.dailyChange
    });
});

console.log(JSON.stringify(results, null, 2));
