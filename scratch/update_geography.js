const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const geos = {
        'ecosys--malaysia--berhad': 'Penang',
        'sum-technology': 'Penang',
        'skyechip': 'Penang',
        'pentech': 'Penang',
        'srkk-ai': 'Kuala Lumpur',
        'elsa': 'Johor'
    };

    let updated = 0;
    data.forEach(ipo => {
        if (geos[ipo.id]) {
            ipo.geography = geos[ipo.id];
            updated++;
        }
    });

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
    console.log(`Successfully injected geography for ${updated} IPOs in data.json.`);
} catch (e) {
    console.error('Error:', e.message);
}
