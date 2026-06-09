const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// The portfolio list from chat: MNHLDG, Keeming, HKB, IAB, CBHB, ISF, Ambest, Destini, Cnergenz, SUNMED
const portfolioIds = ['mnhldg', 'keeming', 'hkb', 'iab', 'cbhb', 'isf', 'ambest', 'destini', 'cnergenz', 'sunmed'];

console.log("=== SIFU PORTFOLIO / WATCHLIST STATUS ===");
portfolioIds.forEach(id => {
    const ipo = data.find(x => x.id === id);
    if (!ipo) {
        console.log(`- ${id}: Not found in database`);
        return;
    }
    const curPrice = ipo.currentPrice || ipo.price || 0;
    const targetPrice = ipo.sifuTargetPrice || 0;
    const isTriggered = curPrice > 0 && targetPrice > 0 && curPrice <= targetPrice;
    const diff = targetPrice > 0 ? ((targetPrice - curPrice) / targetPrice * 100).toFixed(1) + "%" : "N/A";
    
    console.log(`- ${ipo.companyName} (${ipo.id}): Grade ${ipo.predictedGrade || 'N/A'} | Price: RM ${curPrice.toFixed(3)} | Target: RM ${targetPrice.toFixed(3)} | Shariah: ${ipo.shariah} | Zon Beli? ${isTriggered ? 'YA 🟢 (' + diff + ' discount)' : 'TIDAK 🔴'}`);
});
