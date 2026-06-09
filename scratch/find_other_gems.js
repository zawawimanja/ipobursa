const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 
    'ambest', 'isf', 'iab', 'cnergenz', 'destini', 
    'sunmed', 'hss-holdings-berhad', 'solarvest'
];

console.log("=== SHARIAH GRADE A/B STOCKS NOT IN SIFU PORTFOLIO ===");

const candidates = data.filter(ipo => {
    const isShariah = ipo.shariah === true;
    const isGradeAB = ipo.predictedGrade === 'A' || ipo.predictedGrade === 'B';
    const notInPortfolio = !sifuPortfolio.includes(ipo.id);
    const is2026 = ipo.year === 2026;
    return isShariah && isGradeAB && notInPortfolio && is2026;
});

// Calculate discount and sort
candidates.forEach(ipo => {
    const curPrice = ipo.currentPrice || ipo.price || 0;
    const targetPrice = ipo.sifuTargetPrice || 0;
    ipo.isTriggered = curPrice > 0 && targetPrice > 0 && curPrice <= targetPrice;
    ipo.discountPercent = targetPrice > 0 ? ((targetPrice - curPrice) / targetPrice * 100) : -999;
});

// Sort triggered first, then by discount percentage descending
candidates.sort((a, b) => {
    if (a.isTriggered && !b.isTriggered) return -1;
    if (!a.isTriggered && b.isTriggered) return 1;
    return b.discountPercent - a.discountPercent;
});

candidates.forEach(ipo => {
    const curPrice = ipo.currentPrice || ipo.price || 0;
    const targetPrice = ipo.sifuTargetPrice || 0;
    const diff = ipo.discountPercent.toFixed(1) + "%";
    const discountText = ipo.isTriggered ? `Zon Beli 🟢 (Diskaun ${diff})` : (targetPrice > 0 ? `Atas Target 🔴 (+${((curPrice - targetPrice)/targetPrice*100).toFixed(1)}%)` : "No Target Price Set");
    
    console.log(`\n- ${ipo.companyName} (${ipo.id})`);
    console.log(`  Sektor: ${ipo.sector} | Status: ${ipo.status} | Tahun: ${ipo.year}`);
    console.log(`  Gred: ${ipo.predictedGrade} | Harga Semasa: RM ${curPrice.toFixed(3)} | Target: RM ${targetPrice.toFixed(3)} | ${discountText}`);
    console.log(`  Insight: ${ipo.analystInsight ? ipo.analystInsight.replace(/<br>/g, '\n  ').replace(/<[^>]*>/g, '') : 'Tiada'}`);
});
