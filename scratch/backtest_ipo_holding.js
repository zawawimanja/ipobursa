const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../IPO_Graded_Results.csv');
if (!fs.existsSync(csvPath)) {
    console.error("❌ IPO_Graded_Results.csv not found!");
    process.exit(1);
}

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split(',');

const data = lines.slice(1).map(line => {
    // Regex to split CSV lines, handling values in quotes with commas inside them
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const obj = {};
    headers.forEach((h, i) => {
        obj[h.trim()] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '';
    });
    return obj;
});

// Grouping by Grade
const grades = ['A', 'B', 'C', 'Pending', 'Unrated'];
const stats = {};

grades.forEach(g => {
    stats[g] = {
        count: 0,
        totalDay1Open: 0,
        totalDay1Close: 0,
        totalLongTerm: 0,
        longTermWinners: 0,
        samplesWithCurrentPrice: 0
    };
});

data.forEach(ipo => {
    const grade = ipo['Grade'] || 'Unrated';
    if (!stats[grade]) return;

    const listPrice = parseFloat(ipo['Listing Price']) || 0;
    const currPrice = parseFloat(ipo['Current Price']) || 0;
    const day1OpenPerf = parseFloat(ipo['SO Performance %']) || 0;
    const day1ClosePerf = parseFloat(ipo['SC Performance %']) || 0;

    stats[grade].count++;
    stats[grade].totalDay1Open += day1OpenPerf;
    stats[grade].totalDay1Close += day1ClosePerf;

    if (listPrice > 0 && currPrice > 0) {
        const longTermReturn = ((currPrice - listPrice) / listPrice) * 100;
        stats[grade].totalLongTerm += longTermReturn;
        stats[grade].samplesWithCurrentPrice++;
        if (longTermReturn > 0) {
            stats[grade].longTermWinners++;
        }
    }
});

console.log(`=====================================================================`);
console.log(`📊 ANALISIS PRESTASI IPO MENGIKUT GRED (DAY 1 vs LONG-TERM HOLD)`);
console.log(`=====================================================================`);

grades.forEach(g => {
    const s = stats[g];
    if (s.count === 0) return;

    const avgOpen = s.totalDay1Open / s.count;
    const avgClose = s.totalDay1Close / s.count;
    const avgLongTerm = s.samplesWithCurrentPrice > 0 ? (s.totalLongTerm / s.samplesWithCurrentPrice) : 0;
    const winRateLongTerm = s.samplesWithCurrentPrice > 0 ? ((s.longTermWinners / s.samplesWithCurrentPrice) * 100) : 0;

    console.log(`🏆 IPO GRED ${g} (Jumlah Sample: ${s.count} kaunter):`);
    console.log(`---------------------------------------------------------------------`);
    console.log(`  - Purata Kenaikan Day 1 (Open)       : +${avgOpen.toFixed(2)}%`);
    console.log(`  - Purata Kenaikan Day 1 (Close)      : +${avgClose.toFixed(2)}%`);
    console.log(`  - Purata Pulangan JANGKA PANJANG      : +${avgLongTerm.toFixed(2)}%`);
    console.log(`  - Kadar Kemenangan Jangka Panjang    : ${winRateLongTerm.toFixed(1)}% (${s.longTermWinners}/${s.samplesWithCurrentPrice} kaunter untung)`);
    console.log(`---------------------------------------------------------------------\n`);
});
console.log(`=====================================================================`);
