const fs = require('fs');

const dataJsonPath = './data.json';
const dataExportPath = './data_export.js';

function runAnalysis() {
    console.log('Loading data...');
    let data = [];
    if (fs.existsSync(dataJsonPath)) {
        data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    }

    // We can also check data_export.js since it has more items (552 items)
    let exportData = [];
    if (fs.existsSync(dataExportPath)) {
        let content = fs.readFileSync(dataExportPath, 'utf8');
        const startIdx = content.indexOf('[');
        const endIdx = content.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
            exportData = JSON.parse(content.substring(startIdx, endIdx + 1));
        }
    }

    // Combine or use the larger dataset for better statistics
    const activeData = exportData.length > data.length ? exportData : data;
    console.log(`Using dataset with ${activeData.length} records.`);

    // Filter listed Main Market companies
    // Note: In Malaysia, MITI allocations are standard for all Main Market listings,
    // and also some ACE Market listings have them depending on Bumiputera requirements.
    // Let's filter listed companies that have openPrice and price.
    const listedIpos = activeData.filter(x => x.status === 'Listed' && x.openPrice && x.price);
    const mainMarketIpos = listedIpos.filter(x => x.market === 'Main Market');
    const aceMarketIpos = listedIpos.filter(x => x.market === 'ACE Market');

    console.log(`\nListed Main Market (MITI Tranche) IPOs: ${mainMarketIpos.length}`);
    console.log(`Listed ACE Market IPOs: ${aceMarketIpos.length}`);

    const processIpos = (list) => {
        return list.map(x => {
            const openPremium = ((x.openPrice - x.price) / x.price) * 100;
            return {
                id: x.id,
                companyName: x.companyName,
                sector: x.sector,
                price: x.price,
                openPrice: x.openPrice,
                openPremium: openPremium,
                listingDate: x.listingDate,
                predictedGrade: x.predictedGrade
            };
        }).sort((a, b) => b.openPremium - a.openPremium);
    };

    const mainProcessed = processIpos(mainMarketIpos);
    const aceProcessed = processIpos(aceMarketIpos);

    console.log('\n=============================================================');
    console.log('🚀 TOP 15 MAIN MARKET (MITI) IPO JACKPOTS IN DATABASE');
    console.log('=============================================================');
    mainProcessed.slice(0, 15).forEach((x, i) => {
        console.log(`${(i+1).toString().padStart(2, ' ')}. [${x.predictedGrade || 'N/A'}] ${x.companyName}`);
        console.log(`    Sector: ${x.sector || 'N/A'}`);
        console.log(`    IPO: RM ${x.price.toFixed(3)} | Open: RM ${x.openPrice.toFixed(3)} | Premium: +${x.openPremium.toFixed(2)}%`);
        console.log(`    Listing Date: ${x.listingDate || 'N/A'}`);
    });

    const calculateStats = (list) => {
        if (list.length === 0) return { avg: 0, winRate: 0 };
        const winCount = list.filter(x => x.openPremium > 0).length;
        const lossCount = list.filter(x => x.openPremium < 0).length;
        const flatCount = list.filter(x => x.openPremium === 0).length;
        const avg = list.reduce((sum, x) => sum + x.openPremium, 0) / list.length;
        return {
            avg: avg,
            winRate: (winCount / list.length) * 100,
            win: winCount,
            loss: lossCount,
            flat: flatCount
        };
    };

    const mainStats = calculateStats(mainProcessed);
    const aceStats = calculateStats(aceProcessed);

    console.log('\n=============================================================');
    console.log('📊 PERFORMANCE METRICS COMPARISON');
    console.log('=============================================================');
    console.log(`Main Market (MITI Tranche):`);
    console.log(`  - Average Opening Premium: +${mainStats.avg.toFixed(2)}%`);
    console.log(`  - Win Rate (Opened Green): ${mainStats.winRate.toFixed(2)}% (${mainStats.win} wins, ${mainStats.loss} losses, ${mainStats.flat} flat)`);
    
    console.log(`\nACE Market:`);
    console.log(`  - Average Opening Premium: +${aceStats.avg.toFixed(2)}%`);
    console.log(`  - Win Rate (Opened Green): ${aceStats.winRate.toFixed(2)}% (${aceStats.win} wins, ${aceStats.loss} losses, ${aceStats.flat} flat)`);

    // Analyse sector performance for Main Market
    const sectorStats = {};
    mainProcessed.forEach(x => {
        const sector = (x.sector || 'Unknown').split('(')[0].trim();
        if (!sectorStats[sector]) {
            sectorStats[sector] = { sum: 0, count: 0 };
        }
        sectorStats[sector].sum += x.openPremium;
        sectorStats[sector].count++;
    });

    const sectorList = Object.keys(sectorStats).map(s => ({
        sector: s,
        avg: sectorStats[s].sum / sectorStats[s].count,
        count: sectorStats[s].count
    })).sort((a, b) => b.avg - a.avg);

    console.log('\n=============================================================');
    console.log('📁 MAIN MARKET SECTOR RANKINGS BY OPENING PREMIUM');
    console.log('=============================================================');
    sectorList.forEach((x, i) => {
        console.log(`${(i+1).toString().padStart(2, ' ')}. ${x.sector.padEnd(30, ' ')} | Avg Premium: +${x.avg.toFixed(2)}% (${x.count} IPOs)`);
    });
}

runAnalysis();
