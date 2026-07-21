const fs = require('fs');

const dataJsonPath = './data.json';
const dataExportPath = './data_export.js';

function runAnalysis() {
    console.log('Loading data...');
    let data = [];
    if (fs.existsSync(dataJsonPath)) {
        data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    }

    let exportData = [];
    if (fs.existsSync(dataExportPath)) {
        let content = fs.readFileSync(dataExportPath, 'utf8');
        const startIdx = content.indexOf('[');
        const endIdx = content.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
            exportData = JSON.parse(content.substring(startIdx, endIdx + 1));
        }
    }

    const activeData = exportData.length > data.length ? exportData : data;

    // Filter Main Market, listed, years 2025 and 2026, must have openPrice and price
    // Note: We also exclude SkyeChip because the user confirmed it has no MITI.
    const mitiIpos = activeData.filter(x => 
        x.status === 'Listed' && 
        x.market === 'Main Market' && 
        x.openPrice && 
        x.price &&
        (x.year === 2025 || x.year === 2026) &&
        x.id !== 'skyechip'
    );

    console.log(`Found ${mitiIpos.length} listed MITI IPOs from 2025 to 2026 (excluding SkyeChip).`);

    const processed = mitiIpos.map(x => {
        const openPremium = ((x.openPrice - x.price) / x.price) * 100;
        return {
            id: x.id,
            companyName: x.companyName,
            sector: x.sector,
            price: x.price,
            openPrice: x.openPrice,
            openPremium: openPremium,
            listingDate: x.listingDate,
            year: x.year,
            predictedGrade: x.predictedGrade
        };
    }).sort((a, b) => b.openPremium - a.openPremium);

    console.log('\n=============================================================');
    console.log('🚀 MITI IPO PERFORMANCE (2025 - PRESENT) RANKED BY PREMIUM');
    console.log('=============================================================');
    processed.forEach((x, i) => {
        console.log(`${(i+1).toString().padStart(2, ' ')}. [${x.predictedGrade || 'N/A'}] ${x.companyName} (${x.year})`);
        console.log(`    Sector: ${x.sector || 'N/A'}`);
        console.log(`    IPO: RM ${x.price.toFixed(3)} | Open: RM ${x.openPrice.toFixed(3)} | Premium: +${x.openPremium.toFixed(2)}%`);
        console.log(`    Listing Date: ${x.listingDate || 'N/A'}`);
    });
}

runAnalysis();
