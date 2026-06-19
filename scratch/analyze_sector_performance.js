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

const sectorStats = {};

listedIpos.forEach(ipo => {
    let sector = (ipo.sector || 'Unknown').trim();
    // Simple classification
    let secClean = 'Other';
    const sLower = sector.toLowerCase();
    
    if (sLower.includes('semi') || sLower.includes('hardware') || sLower.includes('electronics') || sLower.includes('electrical')) secClean = 'Semiconductor & Electronics';
    else if (sLower.includes('data centre') || sLower.includes('cloud') || sLower.includes('datacenter')) secClean = 'Data Centre / Cleanroom';
    else if (sLower.includes('solar') || sLower.includes('renewable') || sLower.includes('green energy')) secClean = 'Renewable Energy / Solar';
    else if (sLower.includes('it services') || sLower.includes('software') || sLower.includes('tech') || sLower.includes('digital') || sLower.includes('cybersecurity')) secClean = 'Technology / IT / Software';
    else if (sLower.includes('industrial') || sLower.includes('manufacturing')) secClean = 'Industrial Products / Mfg';
    else if (sLower.includes('consumer') || sLower.includes('food') || sLower.includes('retail')) secClean = 'Consumer Products / Retail';
    else if (sLower.includes('construction') || sLower.includes('property') || sLower.includes('estate')) secClean = 'Construction & Property';
    else if (sLower.includes('telecommunication') || sLower.includes('telecom')) secClean = 'Telecommunications';
    else if (sLower.includes('transportation') || sLower.includes('logistics')) secClean = 'Transportation & Logistics';
    else if (sLower.includes('financial') || sLower.includes('bank') || sLower.includes('insurance')) secClean = 'Financial Services';
    else if (sLower.includes('health') || sLower.includes('medical') || sLower.includes('pharma')) secClean = 'Healthcare / Medical';
    else if (sLower.includes('utilities') || sLower.includes('power')) secClean = 'Utilities / Power';
    else secClean = 'Other Services / Miscellaneous';

    if (!sectorStats[secClean]) {
        sectorStats[secClean] = { count: 0, wins: 0, totalPerf: 0, maxPerf: -Infinity };
    }
    
    const perf = getDebutPerf(ipo);
    sectorStats[secClean].count++;
    if (perf > 0.5) sectorStats[secClean].wins++;
    sectorStats[secClean].totalPerf += perf;
    if (perf > sectorStats[secClean].maxPerf) sectorStats[secClean].maxPerf = perf;
});

console.log('=== SECTOR PERFORMANCE AUDIT ===');
const sectorList = Object.keys(sectorStats).map(name => ({
    name,
    count: sectorStats[name].count,
    winRate: ((sectorStats[name].wins / sectorStats[name].count) * 100).toFixed(1) + '%',
    avgPerf: (sectorStats[name].totalPerf / sectorStats[name].count).toFixed(1) + '%',
    maxPerf: sectorStats[name].maxPerf.toFixed(1) + '%'
})).sort((a, b) => parseFloat(b.avgPerf) - parseFloat(a.avgPerf));

console.table(sectorList);
