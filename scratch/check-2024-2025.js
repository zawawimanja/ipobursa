const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
if (!fs.existsSync(DATA_JSON_FILE)) {
    console.error('data.json not found!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));

// Filter for 2024 and 2025 IPOs
const olderIpos = data.filter(d => d.year === 2024 || d.year === 2025);

console.log(`Total 2024/2025 IPOs in database: ${olderIpos.length}`);

// Group by stage
const stages = {};
olderIpos.forEach(d => {
    stages[d.stage] = (stages[d.stage] || 0) + 1;
});
console.log('Stages breakdown:', stages);

// Check for high-quality (Grade A/B) ones that are listed (Stage 5)
const activeOlder = olderIpos.filter(d => d.stage === 5 && (d.predictedGrade === 'A' || d.predictedGrade === 'B'));
console.log(`Active (Stage 5, Grade A/B) 2024/2025 IPOs: ${activeOlder.length}`);

console.log('\nSample active 2024/2025 IPOs and their pricing status:');
activeOlder.slice(0, 15).forEach(d => {
    console.log(`- ${d.symbol || d.id} (${d.companyName}): Grade=${d.predictedGrade}, Price=${d.price}, CurrentPrice=${d.currentPrice}, SifuTP=${d.sifuTargetPrice}, Shariah=${d.shariah}`);
});
