const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

let updatedCount = 0;

data.forEach(d => {
    // Only target 2024 and 2025 listed stocks
    if ((d.year === 2024 || d.year === 2025) && d.stage === 5) {
        let targetTP = null;
        
        // 1. If we have a research array with target prices, calculate the average or max TP
        if (d.research && d.research.length > 0) {
            const tps = d.research.map(r => r.tp).filter(tp => typeof tp === 'number' && tp > 0);
            if (tps.length > 0) {
                // Use the average of analyst TPs as target
                const sum = tps.reduce((a, b) => a + b, 0);
                targetTP = parseFloat((sum / tps.length).toFixed(2));
            }
        }
        
        // 2. If no analyst TP, but we have avgTP, use that
        if (!targetTP && typeof d.avgTP === 'number' && d.avgTP > 0) {
            targetTP = d.avgTP;
        }

        // If we found a target TP, and it is higher than the current price (or if we have no sifuTargetPrice at all)
        const curPrice = d.currentPrice || d.price || 0;
        
        if (targetTP && (!d.sifuTargetPrice || d.sifuTargetPrice < curPrice)) {
            // Only update if the targetTP is reasonable
            d.sifuTargetPrice = targetTP;
            updatedCount++;
            console.log(`Updated TP for ${d.symbol || d.id}: Old SifuTP=${d.sifuTargetPrice || 'none'}, New SifuTP=${targetTP}, CurrentPrice=${curPrice}`);
        }
    }
});

if (updatedCount > 0) {
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 2));
    console.log(`\nSuccessfully updated target prices for ${updatedCount} legacy stocks in data.json.`);
} else {
    console.log('\nNo updates needed.');
}
