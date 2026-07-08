const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const before = data.length;

const junkIds = new Set([
    'register',
    'access',
    'seminars',
    'recommended-amount-to-subscribe-',
    'financing-details-',
    'cost-breakdown-',
    'filtered-statistics',
    'select-stocks-',
    'features',
    'others',
    'company'
]);

// Remove junk entries: id looks like a date, companyName == id, price == 0
const cleaned = data.filter(d => {
    if (junkIds.has(d.id)) return false;
    
    const isDateId = /^\d{4}-\d{2}-\d{2}$/.test(d.id);
    const nameEqualsId = d.companyName === d.id;
    const noPrice = !d.price || d.price === 0;
    const isTba = (d.sector || '').toLowerCase() === 'tba';
    return !(isDateId && nameEqualsId && noPrice && isTba);
});

const removed = before - cleaned.length;
console.log(`Before: ${before} entries`);
console.log(`Removed: ${removed} junk entries`);
console.log(`After: ${cleaned.length} entries`);

// Save both files
fs.writeFileSync('data.json', JSON.stringify(cleaned, null, 4));
const jsOutput = 'const IPO_DATA = ' + JSON.stringify(cleaned, null, 4) + ';\n\nif (typeof module !== \'undefined\' && module.exports) {\n    module.exports = IPO_DATA;\n}\n';
fs.writeFileSync('data.js', jsOutput);

console.log('\n✅ data.json and data.js cleaned!');
