const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Updates map: ID -> Suggested New TP
const updates = {
    'adnex': 1.30,
    'ambest': 1.14,
    'empire-premium': 1.40,
    'isf': 0.72,
    'keeming': 1.68,
    'cbhb': 0.86,
    'hkb': 0.71
};

console.log('Applying target price and peak high updates in data.json:');

let modifiedCount = 0;

data.forEach(d => {
    const targetTP = updates[d.id];
    if (targetTP) {
        const curPrice = d.currentPrice || d.price || 0;
        const oldHigh = d.highPrice || 0;
        const newHigh = Math.max(curPrice, oldHigh);
        
        console.log(`- Updating ${d.symbol || d.id.toUpperCase()}:`);
        console.log(`  High: RM ${oldHigh.toFixed(3)} -> RM ${newHigh.toFixed(3)}`);
        console.log(`  TP:   RM ${(d.sifuTargetPrice || 0).toFixed(3)} -> RM ${targetTP.toFixed(3)}`);
        
        d.highPrice = newHigh;
        d.sifuTargetPrice = targetTP;
        modifiedCount++;
    }
});

if (modifiedCount > 0) {
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\nSuccessfully updated ${modifiedCount} stocks in data.json.`);
} else {
    console.log('\nNo matching stocks found for updates.');
}
