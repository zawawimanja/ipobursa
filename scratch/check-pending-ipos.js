const fs = require('fs');

function checkPendingIpos() {
    const raw = fs.readFileSync('data.json', 'utf8');
    const ipos = JSON.parse(raw);
    
    console.log('=== Pending / Upcoming IPOs (Stage 3 & 4) ===');
    ipos.forEach(ipo => {
        if (ipo.stage === 3 || ipo.stage === 4) {
            console.log(`Company: ${ipo.companyName} (${ipo.id})`);
            console.log(`  Stage: ${ipo.stage} | Status: ${ipo.status}`);
            console.log(`  Sector: ${ipo.sector} | IB: ${ipo.ib}`);
            console.log(`  OS: ${ipo.os} | Price: ${ipo.price}`);
            console.log(`  Predicted Grade: ${ipo.predictedGrade}`);
            console.log(`  Analyst Insight: ${ipo.analystInsight}`);
            console.log('-'.repeat(50));
        }
    });
}

checkPendingIpos();
