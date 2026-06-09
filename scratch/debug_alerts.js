const IPO_DATA = require('../data.js');

const sifuPortfolio = ['cbhb', 'keeming', 'hkb', 'ams-material', 'mnhldg', 'ambest', 'isf', 'iab', 'cnergenz', 'destini', 'sunmed', 'hss-holdings-berhad', 'solarvest', 'ctos', 'lgms', 'oppstar', 'agmo'];

function debugFilter(id) {
    const ipo = IPO_DATA.find(x => x.id === id);
    if (!ipo) {
        console.log(`[${id}] Not found in IPO_DATA`);
        return;
    }
    console.log(`\n--- Debugging: ${ipo.companyName} (${id}) ---`);
    console.log(`stage: ${ipo.stage} (${ipo.stage === 5 ? 'Listed' : 'Not Listed'})`);
    console.log(`shariah: ${ipo.shariah}`);
    
    let targetPrice = 0;
    let targetTypeLabel = '';
    if (typeof ipo.sifuTargetPrice === 'number' && ipo.sifuTargetPrice > 0) {
        targetPrice = ipo.sifuTargetPrice;
        targetTypeLabel = 'Sifu';
    } else if (typeof ipo.avgTP === 'number' && ipo.avgTP > 0) {
        targetPrice = ipo.avgTP;
        targetTypeLabel = 'Analyst';
    } else if (typeof ipo.price === 'number' && ipo.price > 0) {
        targetPrice = ipo.price;
        targetTypeLabel = 'IPO';
    }
    console.log(`targetPrice: ${targetPrice} (type: ${targetTypeLabel})`);
    
    const isShariah = ipo.shariah === true;
    const hasTarget = targetPrice > 0;
    const isListed = ipo.stage === 5;
    
    if (!isShariah || !hasTarget || !isListed) {
        console.log(`Filtered out by general checks: isShariah=${isShariah}, hasTarget=${hasTarget}, isListed=${isListed}`);
        return;
    }
    
    const curPrice = ipo.currentPrice || ipo.price || 0;
    const isTriggered = curPrice > 0 && curPrice <= targetPrice;
    console.log(`currentPrice: ${curPrice}, isTriggered: ${isTriggered} (curPrice <= targetPrice)`);
    
    const isGradeAB = ipo.predictedGrade === 'A' || ipo.predictedGrade === 'B';
    const isUnderOne = curPrice <= 1.0;
    console.log(`predictedGrade: ${ipo.predictedGrade} (isGradeAB: ${isGradeAB})`);
    console.log(`isUnderOne: ${isUnderOne} (curPrice <= 1.0)`);
    
    // Test long_term filter logic
    const inPortfolio = sifuPortfolio.includes(ipo.id);
    if (!isTriggered) {
        console.log(`Filtered out: !isTriggered`);
    } else if (!inPortfolio) {
        console.log(`Filtered out: !inPortfolio`);
    } else if (!isGradeAB) {
        console.log(`Filtered out: !isGradeAB`);
    } else if (!isUnderOne) {
        console.log(`Filtered out: !isUnderOne`);
    } else {
        console.log(`SUCCESS: Passed all filters for long_term!`);
    }
}

debugFilter('ctos');
debugFilter('lgms');
debugFilter('oppstar');
debugFilter('agmo');
debugFilter('cnergenz');
debugFilter('destini');
debugFilter('cekd');
