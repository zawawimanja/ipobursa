const fs = require('fs');
const path = require('path');

// Load data.js (evaluating it to inject global variables)
const dataJsPath = path.join(__dirname, '..', 'data.js');
const dataJsContent = fs.readFileSync(dataJsPath, 'utf8');

// Mock a simple context to catch the global IPO_DATA
global.IPO_DATA = [];
const cleanedContent = dataJsContent.replace('const IPO_DATA =', 'global.IPO_DATA =');
eval(cleanedContent);

const list = global.IPO_DATA;
console.log(`Loaded ${list.length} stocks from data.js.`);

// Run categorization filter logic
const validPicks = list.filter(ipo => 
    ipo.shariah === true && 
    ['A', 'B'].includes(ipo.predictedGrade) && 
    typeof ipo.sifuTargetPrice === 'number' && 
    ipo.currentPrice > 0 && 
    ipo.currentPrice < ipo.sifuTargetPrice
).map(ipo => {
    const upside = ((ipo.sifuTargetPrice - ipo.currentPrice) / ipo.currentPrice) * 100;
    return { ...ipo, upside };
});

const group1 = [];
const group2 = [];
const group3 = [];

validPicks.forEach(ipo => {
    const hasHitBefore = ipo.highPrice && ipo.highPrice >= ipo.sifuTargetPrice;

    if (ipo.year === 2026 || ipo.status === 'MITI Allocation Phase' || ipo.stage < 5) {
        if (hasHitBefore) {
            group2.push(ipo);
        } else {
            group1.push(ipo);
        }
    } else {
        group3.push(ipo);
    }
});

console.log(`\nValid Picks count (Shariah, Grade A/B, Below TP): ${validPicks.length}`);
console.log(`Group 1 (Fresh 2026): ${group1.length}`);
console.log(`Group 2 (DCA/Swing 2026): ${group2.length}`);
console.log(`Group 3 (Older Turnaround): ${group3.length}`);

// 1. Verify that 'ei-power' is NOT in any of the groups
const inG1 = group1.some(ipo => ipo.id === 'ei-power');
const inG2 = group2.some(ipo => ipo.id === 'ei-power');
const inG3 = group3.some(ipo => ipo.id === 'ei-power');

console.log(`\nVerifying 'ei-power' exclusion...`);
if (inG1 || inG2 || inG3) {
    console.error(`FAIL: 'ei-power' should NOT be in any group because it has hit target price.`);
    process.exit(1);
} else {
    console.log(`SUCCESS: 'ei-power' is correctly excluded.`);
}

// 2. Verify key stocks are in their expected groups
const verifyGroup = (stockId, expectedGroupNum, groupList) => {
    const found = groupList.some(ipo => ipo.id === stockId);
    console.log(`Checking if '${stockId}' is in Group ${expectedGroupNum}...`);
    if (!found) {
        // Let's print out what happened to this stock ID
        const rawStock = list.find(ipo => ipo.id === stockId);
        if (!rawStock) {
            console.error(`FAIL: Stock '${stockId}' not found in database.`);
        } else {
            console.error(`FAIL: Stock '${stockId}' was excluded from pick categories. Properties:`, {
                shariah: rawStock.shariah,
                predictedGrade: rawStock.predictedGrade,
                sifuTargetPrice: rawStock.sifuTargetPrice,
                currentPrice: rawStock.currentPrice,
                highPrice: rawStock.highPrice,
                year: rawStock.year
            });
        }
        process.exit(1);
    }
    console.log(`SUCCESS: '${stockId}' is in Group ${expectedGroupNum}.`);
};

verifyGroup('ams-material', 1, group1);
verifyGroup('inspace-creation', 1, group1);
verifyGroup('sunmed', 2, group2);
verifyGroup('manforce-group', 2, group2);
verifyGroup('destini', 3, group3);
verifyGroup('oppstar', 3, group3);

console.log(`\nALL DYNAMIC GROUPING TESTS COMPLETED SUCCESSFULLY!`);
