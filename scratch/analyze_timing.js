const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// We want to check the exact setups of MMCS, Pentech, SNS, OHM, and Coraza
const targets = ['mm-computer', 'pentech', 'sns', 'ohm', 'coraza'];

console.log('========================================================================');
console.log('🔍 ANALYZING DETAILED CHART SETUPS FOR ENTRY TIMING');
console.log('========================================================================');

targets.forEach(id => {
    const ipo = db.find(x => x.id === id);
    if (!ipo) return;

    const high = ipo.highPrice || 0;
    const current = ipo.currentPrice || 0;
    const ipoPrice = ipo.price || 0;
    const dailyChange = ipo.dailyChange || 0;

    const distToAth = high > 0 ? ((high - current) / current) * 100 : 0;
    
    console.log(`Company: ${ipo.companyName} (${ipo.symbol || 'N/A'})`);
    console.log(`  • IPO Price: RM ${ipoPrice.toFixed(3)}`);
    console.log(`  • Current Price: RM ${current.toFixed(3)}`);
    console.log(`  • All-Time High (ATH): RM ${high.toFixed(3)}`);
    console.log(`  • Distance to Breakout (ATH): ${distToAth.toFixed(2)}%`);
    console.log(`  • Daily Change: ${dailyChange > 0 ? '+' : ''}${dailyChange}%`);
    
    // Evaluation
    let timingVerdict = '';
    if (distToAth === 0) {
        timingVerdict = '🚀 EXACT BREAKOUT POINT (Hari Pertama Breakout - High Conviction entry like Monday)';
    } else if (distToAth <= 1.5) {
        timingVerdict = '🔥 TESTING RESISTANCE (Sangat hampir breakout - Boleh masuk/antri)';
    } else if (distToAth <= 5.0) {
        timingVerdict = '📈 CONSOLIDATION ZONE (Sebelum breakout - Sama seperti DNeX pada hari Jumaat lepas sebelum Isnin terbang)';
    } else {
        timingVerdict = '⏳ PULLBACK ZONE (Menunggu pengukuhan)';
    }
    
    console.log(`  • VERDICT: ${timingVerdict}`);
    console.log('------------------------------------------------------------------------');
});
