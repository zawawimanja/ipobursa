const fs = require('fs');

const raw = fs.readFileSync('data.json', 'utf8');
const ipos = JSON.parse(raw);

const listedIpos = ipos.filter(ipo => 
    (ipo.stage === 5 || ipo.status === 'Listed') && 
    ipo.price > 0 && 
    (ipo.openPrice > 0 || ipo.closePrice > 0 || ipo.currentPrice > 0)
);

function getDebutPerf(ipo) {
    const start = ipo.price;
    const end = ipo.openPrice || ipo.closePrice || ipo.currentPrice;
    if (!start || !end) return 0;
    return ((end - start) / start) * 100;
}

const ibStats = {};

listedIpos.forEach(ipo => {
    let ib = (ipo.ib || 'Unknown').trim();
    // Normalize IB name
    let ibClean = ib;
    const ibLower = ib.toLowerCase();
    if (ibLower.includes('m&a') || ibLower.includes('m & a')) ibClean = 'M&A Securities';
    else if (ibLower.includes('public')) ibClean = 'Public Investment Bank';
    else if (ibLower.includes('alliance')) ibClean = 'Alliance Investment Bank';
    else if (ibLower.includes('maybank')) ibClean = 'Maybank Investment Bank';
    else if (ibLower.includes('cimb')) ibClean = 'CIMB Investment Bank';
    else if (ibLower.includes('rhb')) ibClean = 'RHB Investment Bank';
    else if (ibLower.includes('affin')) ibClean = 'Affin Hwang Investment Bank';
    else if (ibLower.includes('kenanga')) ibClean = 'Kenanga Investment Bank';
    else if (ibLower.includes('malacca')) ibClean = 'Malacca Securities';
    else if (ibLower.includes('mercury')) ibClean = 'Mercury Securities';
    else if (ibLower.includes('ta securities')) ibClean = 'TA Securities';
    else if (ibLower.includes('uob')) ibClean = 'UOB Kay Hian';
    else if (ibLower.includes('apex')) ibClean = 'Apex Securities';
    else if (ibLower.includes('sj securities')) ibClean = 'SJ Securities';
    else if (ibLower.includes('kaf')) ibClean = 'KAF Investment Bank';
    else if (ibLower.includes('aminvestment')) ibClean = 'AmInvestment Bank';
    else ibClean = 'Other / Unknown';

    if (!ibStats[ibClean]) {
        ibStats[ibClean] = { count: 0, wins: 0, totalPerf: 0, maxPerf: -Infinity };
    }
    
    const perf = getDebutPerf(ipo);
    ibStats[ibClean].count++;
    if (perf > 0.5) ibStats[ibClean].wins++;
    ibStats[ibClean].totalPerf += perf;
    if (perf > ibStats[ibClean].maxPerf) ibStats[ibClean].maxPerf = perf;
});

console.log('=== INVESTMENT BANK PERFORMANCE AUDIT ===');
const ibList = Object.keys(ibStats).map(name => ({
    name,
    count: ibStats[name].count,
    winRate: ((ibStats[name].wins / ibStats[name].count) * 100).toFixed(1) + '%',
    avgPerf: (ibStats[name].totalPerf / ibStats[name].count).toFixed(1) + '%',
    maxPerf: ibStats[name].maxPerf.toFixed(1) + '%'
})).sort((a, b) => parseFloat(b.avgPerf) - parseFloat(a.avgPerf));

console.table(ibList);
