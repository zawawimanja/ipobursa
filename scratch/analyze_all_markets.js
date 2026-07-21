const fs = require('fs');

let content = fs.readFileSync('./data_export.js', 'utf8');
const startIdx = content.indexOf('[');
const endIdx = content.lastIndexOf(']');
const activeData = JSON.parse(content.substring(startIdx, endIdx + 1));

// All listed IPOs with openPrice data
const allIpos = activeData.filter(x =>
    x.status === 'Listed' &&
    x.openPrice != null &&
    x.price != null
);

const processed = allIpos.map(x => {
    const openPrem = ((x.openPrice - x.price) / x.price) * 100;
    const highRet = x.highPrice ? ((x.highPrice - x.price) / x.price) * 100 : null;
    const currentRet = x.currentPrice ? ((x.currentPrice - x.price) / x.price) * 100 : null;
    // Simplify sector
    let sector = (x.sector || 'Unknown').split('(')[0].trim().split('/')[0].trim();
    if (sector.length > 20) sector = sector.substring(0, 20);
    return {
        companyName: x.companyName,
        sector,
        market: x.market || 'N/A',
        price: x.price,
        openPrice: x.openPrice,
        currentPrice: x.currentPrice,
        highPrice: x.highPrice,
        openPrem,
        highRet,
        currentRet,
        year: x.year || 'N/A',
        grade: x.predictedGrade || 'N/A'
    };
}).sort((a, b) => b.openPrem - a.openPrem);

// ---- FULL RANKED TABLE ----
console.log('=======================================================================');
console.log(' SEMUA IPO (SEMUA MARKET) — RANKED BY OPENING PREMIUM');
console.log(`  Total: ${processed.length} IPO`);
console.log('=======================================================================');
console.log(' Rk | Gr  | Market      | Company                          | IPO   | Open  | Open%    | ATH%');
console.log('----|-----|-------------|----------------------------------|-------|-------|----------|--------');
processed.forEach((x, i) => {
    const openStr = (x.openPrem >= 0 ? '+' : '') + x.openPrem.toFixed(1) + '%';
    const athStr = x.highRet != null ? (x.highRet >= 0 ? '+' : '') + x.highRet.toFixed(1) + '%' : 'N/A';
    const name = x.companyName.substring(0, 32).padEnd(32, ' ');
    const mkt = (x.market || 'N/A').substring(0, 11).padEnd(11, ' ');
    console.log(` ${String(i+1).padStart(3,' ')}| [${x.grade.substring(0,2).padEnd(2,' ')}]| ${mkt} | ${name} | ${x.price.toFixed(3)} | ${x.openPrice.toFixed(3)} | ${openStr.padStart(8,' ')} | ${athStr}`);
});

// ---- BY MARKET ----
const markets = ['Main Market', 'ACE Market'];
console.log('\n=======================================================================');
console.log(' PERBANDINGAN PRESTASI MENGIKUT PASARAN');
console.log('=======================================================================');
markets.forEach(mkt => {
    const items = processed.filter(x => x.market === mkt);
    if (!items.length) return;
    const avg = items.reduce((s, x) => s + x.openPrem, 0) / items.length;
    const wins = items.filter(x => x.openPrem > 0).length;
    const jackpots = items.filter(x => x.openPrem >= 30).length;
    const losses = items.filter(x => x.openPrem < 0).length;
    const flat = items.filter(x => x.openPrem === 0).length;
    console.log(`\n📍 ${mkt} (${items.length} IPO)`);
    console.log(`   Purata Open Premium : ${avg >= 0 ? '+' : ''}${avg.toFixed(2)}%`);
    console.log(`   Jackpot (≥+30%)     : ${jackpots}/${items.length} = ${(jackpots/items.length*100).toFixed(1)}%`);
    console.log(`   Menang (>0%)        : ${wins}/${items.length} = ${(wins/items.length*100).toFixed(1)}%`);
    console.log(`   Flat (0%)           : ${flat}/${items.length} = ${(flat/items.length*100).toFixed(1)}%`);
    console.log(`   Rugi (<0%)          : ${losses}/${items.length} = ${(losses/items.length*100).toFixed(1)}%`);
});

// ---- SECTOR STATS (ALL MARKETS) ----
const sectorMap = {};
processed.forEach(x => {
    if (!sectorMap[x.sector]) sectorMap[x.sector] = [];
    sectorMap[x.sector].push(x);
});

const sectorStats = Object.entries(sectorMap).map(([sector, items]) => {
    const avg = items.reduce((s, x) => s + x.openPrem, 0) / items.length;
    const max = Math.max(...items.map(x => x.openPrem));
    const wins = items.filter(x => x.openPrem > 5).length;
    const jackpots = items.filter(x => x.openPrem >= 30).length;
    return { sector, count: items.length, avg, max, wins, jackpots };
}).filter(x => x.count >= 2).sort((a, b) => b.avg - a.avg);

console.log('\n=======================================================================');
console.log(' RANKING SEKTOR (MIN 2 IPO) — PURATA OPENING PREMIUM');
console.log('=======================================================================');
console.log(' Rk | Sector               | Count | AvgOpen% | MaxOpen% | Jackpot | Win>5%');
console.log('----|----------------------|-------|----------|----------|---------|-------');
sectorStats.forEach((x, i) => {
    const avg = (x.avg >= 0 ? '+' : '') + x.avg.toFixed(1) + '%';
    const max = (x.max >= 0 ? '+' : '') + x.max.toFixed(1) + '%';
    const sec = x.sector.substring(0, 20).padEnd(20, ' ');
    console.log(` ${String(i+1).padStart(3,' ')}| ${sec} | ${String(x.count).padStart(5,' ')} | ${avg.padStart(8,' ')} | ${max.padStart(8,' ')} | ${x.jackpots}/${x.count}    | ${x.wins}/${x.count}`);
});

// ---- GRADE STATS ----
const gradeMap = {};
processed.forEach(x => {
    const g = x.grade;
    if (!gradeMap[g]) gradeMap[g] = [];
    gradeMap[g].push(x);
});

console.log('\n=======================================================================');
console.log(' RANKING MENGIKUT GRED ANALYST');
console.log('=======================================================================');
['A', 'B', 'C', 'N/A'].forEach(g => {
    const items = gradeMap[g];
    if (!items || !items.length) return;
    const avg = items.reduce((s, x) => s + x.openPrem, 0) / items.length;
    const jackpots = items.filter(x => x.openPrem >= 30).length;
    const wins = items.filter(x => x.openPrem > 0).length;
    console.log(`\n  Gred [${g}] — ${items.length} IPO`);
    console.log(`    Purata Open : ${avg >= 0 ? '+' : ''}${avg.toFixed(2)}%`);
    console.log(`    Jackpot ≥30%: ${jackpots}/${items.length} = ${(jackpots/items.length*100).toFixed(1)}%`);
    console.log(`    Win Rate    : ${wins}/${items.length} = ${(wins/items.length*100).toFixed(1)}%`);
    const top3 = items.sort((a,b) => b.openPrem - a.openPrem).slice(0,3);
    top3.forEach(x => console.log(`    - ${x.companyName} → Open +${x.openPrem.toFixed(1)}% (${x.market})`));
});

// ---- OVERALL ----
const totalWins = processed.filter(x => x.openPrem > 0).length;
const totalJack = processed.filter(x => x.openPrem >= 30).length;
const totalAvg = processed.reduce((s,x) => s + x.openPrem, 0) / processed.length;
console.log('\n=======================================================================');
console.log(` OVERALL — ${processed.length} IPO SEMUA MARKET`);
console.log(`  Purata Premium Pembukaan : ${totalAvg >= 0 ? '+' : ''}${totalAvg.toFixed(2)}%`);
console.log(`  Win Rate                 : ${totalWins}/${processed.length} = ${(totalWins/processed.length*100).toFixed(1)}%`);
console.log(`  Jackpot (≥+30%)          : ${totalJack}/${processed.length} = ${(totalJack/processed.length*100).toFixed(1)}%`);
console.log('=======================================================================');
