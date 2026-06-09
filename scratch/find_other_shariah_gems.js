const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const sifuPortfolio = [
    'cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 
    'ambest', 'isf', 'iab', 'cnergenz', 'destini', 
    'sunmed', 'hss-holdings-berhad', 'solarvest', 'ei-power'
];

console.log("=== ALL SHARIAH GRADE A/B STOCKS NOT IN SIFU LIST ===");

const candidates = data.filter(ipo => {
    const isShariah = ipo.shariah === true;
    const isGradeAB = ipo.predictedGrade === 'A' || ipo.predictedGrade === 'B';
    const notInPortfolio = !sifuPortfolio.includes(ipo.id);
    const curPrice = ipo.currentPrice || ipo.price || 999;
    return isShariah && isGradeAB && notInPortfolio && curPrice <= 0.50;
});

// Sort by current price ascending
candidates.sort((a, b) => {
    const priceA = a.currentPrice || a.price || 999;
    const priceB = b.currentPrice || b.price || 999;
    return priceA - priceB;
});

candidates.forEach(ipo => {
    const curPrice = ipo.currentPrice || ipo.price || 0;
    const targetPrice = ipo.sifuTargetPrice || 0;
    const isTriggered = curPrice > 0 && targetPrice > 0 && curPrice <= targetPrice;
    const diff = targetPrice > 0 ? ((targetPrice - curPrice) / targetPrice * 100).toFixed(1) + "%" : "N/A";
    const discountText = isTriggered ? `Zon Beli 🟢 (Diskaun ${diff})` : (targetPrice > 0 ? `Atas Target 🔴 (+${((curPrice - targetPrice)/targetPrice*100).toFixed(1)}%)` : "Tiada Target Sifu Set");
    
    console.log(`\n- ${ipo.companyName} (${ipo.id}) [Tahun: ${ipo.year}]`);
    console.log(`  Gred: ${ipo.predictedGrade} | Harga Semasa: RM ${curPrice.toFixed(3)} | Target: RM ${targetPrice.toFixed(3)} | ${discountText}`);
    console.log(`  Sektor: ${ipo.sector} | Status: ${ipo.status}`);
});
