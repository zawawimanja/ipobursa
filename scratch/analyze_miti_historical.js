const fs = require('fs');

// Use data_export.js (552 records) for max coverage
let content = fs.readFileSync('./data_export.js', 'utf8');
const startIdx = content.indexOf('[');
const endIdx = content.lastIndexOf(']');
const activeData = JSON.parse(content.substring(startIdx, endIdx + 1));

// All listed Main Market with openPrice data (exclude SkyeChip - no MITI)
const mitiIpos = activeData.filter(x =>
    x.status === 'Listed' &&
    x.market === 'Main Market' &&
    x.openPrice != null &&
    x.price != null &&
    x.id !== 'skyechip'
);

const processed = mitiIpos.map(x => {
    const openPrem = ((x.openPrice - x.price) / x.price) * 100;
    const currentRet = x.currentPrice ? ((x.currentPrice - x.price) / x.price) * 100 : null;
    const highRet = x.highPrice ? ((x.highPrice - x.price) / x.price) * 100 : null;
    return {
        companyName: x.companyName,
        sector: x.sector || 'N/A',
        price: x.price,
        openPrice: x.openPrice,
        currentPrice: x.currentPrice,
        highPrice: x.highPrice,
        openPrem,
        currentRet,
        highRet,
        year: x.year,
        grade: x.predictedGrade || 'N/A',
        listingDate: x.listingDate || 'N/A'
    };
}).sort((a, b) => b.openPrem - a.openPrem);

// --- FULL RANKED TABLE ---
console.log('=================================================================');
console.log(' SEMUA MITI MAIN MARKET IPO (HISTORICAL) — RANK BY OPENING %');
console.log('=================================================================');
console.log(` Rank | Grade | Company                              | IPO    | Open   | Open%    | ATH%`);
console.log(`------|-------|--------------------------------------|--------|--------|----------|--------`);
processed.forEach((x, i) => {
    const openStr = (x.openPrem >= 0 ? '+' : '') + x.openPrem.toFixed(1) + '%';
    const athStr = x.highRet != null ? (x.highRet >= 0 ? '+' : '') + x.highRet.toFixed(1) + '%' : 'N/A';
    const name = x.companyName.substring(0, 36).padEnd(36, ' ');
    console.log(` ${String(i+1).padStart(3,' ')}  | [${x.grade}] | ${name} | ${x.price.toFixed(3)} | ${x.openPrice.toFixed(3)} | ${openStr.padStart(8,' ')} | ${athStr}`);
});

// --- SECTOR STATS ---
const sectorMap = {};
processed.forEach(x => {
    // Simplify sector name
    let s = (x.sector || 'N/A').split('(')[0].trim().split('/')[0].trim();
    if (!sectorMap[s]) sectorMap[s] = [];
    sectorMap[s].push(x);
});

const sectorStats = Object.entries(sectorMap).map(([sector, items]) => {
    const avgOpen = items.reduce((s, x) => s + x.openPrem, 0) / items.length;
    const maxOpen = Math.max(...items.map(x => x.openPrem));
    const wins = items.filter(x => x.openPrem > 5).length;
    return { sector, count: items.length, avgOpen, maxOpen, wins };
}).sort((a, b) => b.avgOpen - a.avgOpen);

console.log('\n=================================================================');
console.log(' SECTOR RANKING — PURATA PREMIUM PEMBUKAAN (Main Market MITI)');
console.log('=================================================================');
console.log(` Rank | Sector                          | Count | AvgOpen% | MaxOpen% | Win>5%`);
console.log(`------|----------------------------------|-------|----------|----------|-------`);
sectorStats.forEach((x, i) => {
    const avg = (x.avgOpen >= 0 ? '+' : '') + x.avgOpen.toFixed(1) + '%';
    const max = (x.maxOpen >= 0 ? '+' : '') + x.maxOpen.toFixed(1) + '%';
    const sec = x.sector.substring(0, 32).padEnd(32, ' ');
    console.log(` ${String(i+1).padStart(3,' ')}  | ${sec} | ${String(x.count).padStart(5,' ')} | ${avg.padStart(8,' ')} | ${max.padStart(8,' ')} | ${x.wins}/${x.count}`);
});

// --- SURPRISE BOMBS (Grade C/N/A tapi naik gila) ---
const surprises = processed.filter(x => (x.grade === 'C' || x.grade === 'N/A') && x.openPrem > 15);
if (surprises.length > 0) {
    console.log('\n=================================================================');
    console.log(' 💣 SURPRISE BOMBS — GRADE C/N/A TAPI MELETUP (Open >+15%)');
    console.log('=================================================================');
    surprises.forEach(x => {
        console.log(` - ${x.companyName} [${x.grade}] | Sektor: ${x.sector}`);
        console.log(`   IPO RM${x.price.toFixed(3)} → Open RM${x.openPrice.toFixed(3)} (+${x.openPrem.toFixed(1)}%)`);
    });
}

// --- SUMMARY STATS ---
const total = processed.length;
const wins = processed.filter(x => x.openPrem > 0).length;
const jackpots = processed.filter(x => x.openPrem >= 30).length;
const avg = processed.reduce((s, x) => s + x.openPrem, 0) / total;
console.log('\n=================================================================');
console.log(` RINGKASAN: ${total} IPO MITI Main Market dalam database`);
console.log(`  - Purata Premium Pembukaan : ${avg >= 0 ? '+' : ''}${avg.toFixed(2)}%`);
console.log(`  - Win Rate (Buka Hijau)    : ${wins}/${total} (${(wins/total*100).toFixed(1)}%)`);
console.log(`  - Jackpots (≥+30% open)   : ${jackpots}/${total} (${(jackpots/total*100).toFixed(1)}%)`);
console.log('=================================================================');
