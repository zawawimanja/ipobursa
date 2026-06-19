const fs = require('fs');

const raw = fs.readFileSync('data.json', 'utf8');
const ipos = JSON.parse(raw);

const listedIpos = ipos.filter(ipo => 
    (ipo.stage === 5 || ipo.status === 'Listed') && 
    ipo.price > 0 && 
    (ipo.openPrice > 0 || ipo.closePrice > 0 || ipo.currentPrice > 0) &&
    ipo.os > 0
);

function getDebutPerf(ipo) {
    const start = ipo.price;
    const end = ipo.openPrice || ipo.closePrice || ipo.currentPrice;
    if (!start || !end) return 0;
    return ((end - start) / start) * 100;
}

const brackets = [
    { name: 'OS >= 100x', filter: os => os >= 100 },
    { name: 'OS 50x - 100x', filter: os => os >= 50 && os < 100 },
    { name: 'OS 20x - 50x', filter: os => os >= 20 && os < 50 },
    { name: 'OS 10x - 20x', filter: os => os >= 10 && os < 20 },
    { name: 'OS 5x - 10x', filter: os => os >= 5 && os < 10 },
    { name: 'OS < 5x', filter: os => os < 5 }
];

const osStats = brackets.map(b => ({
    name: b.name,
    count: 0,
    wins: 0,
    totalPerf: 0,
    maxPerf: -Infinity,
    minPerf: Infinity,
    filter: b.filter
}));

listedIpos.forEach(ipo => {
    const perf = getDebutPerf(ipo);
    const os = ipo.os;
    
    const bracket = osStats.find(b => b.filter(os));
    if (bracket) {
        bracket.count++;
        if (perf > 0.5) bracket.wins++;
        bracket.totalPerf += perf;
        if (perf > bracket.maxPerf) bracket.maxPerf = perf;
        if (perf < bracket.minPerf) bracket.minPerf = perf;
    }
});

console.log('=== OVERSUBSCRIPTION (OS) PERFORMANCE AUDIT ===');
const osList = osStats.map(b => ({
    name: b.name,
    count: b.count,
    winRate: b.count > 0 ? ((b.wins / b.count) * 100).toFixed(1) + '%' : '0%',
    avgPerf: b.count > 0 ? (b.totalPerf / b.count).toFixed(1) + '%' : '0%',
    minPerf: b.count > 0 ? b.minPerf.toFixed(1) + '%' : '0%',
    maxPerf: b.count > 0 ? b.maxPerf.toFixed(1) + '%' : '0%'
}));

console.table(osList);
