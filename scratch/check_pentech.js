const fs = require('fs');
const path = require('path');

const archiveDir = path.join(__dirname, '..', 'archive');
const currentDbFile = path.join(__dirname, '..', 'data.json');
const dates = ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
const currentDb = JSON.parse(fs.readFileSync(currentDbFile, 'utf8'));

function getStockData(symbolOrId, dateStr) {
    if (dateStr === 'current') {
        return currentDb.find(x => x.id.toLowerCase() === symbolOrId.toLowerCase() || (x.symbol && x.symbol.toLowerCase() === symbolOrId.toLowerCase()));
    }
    const filePath = path.join(archiveDir, `groups-${dateStr}.json`);
    if (!fs.existsSync(filePath)) return null;
    const archive = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const allStocks = [
        ...(archive.kumpulan_1 ? archive.kumpulan_1.stocks : []),
        ...(archive.kumpulan_2 ? archive.kumpulan_2.stocks : []),
        ...(archive.kumpulan_3 ? archive.kumpulan_3.stocks : [])
    ];
    return allStocks.find(x => x.id.toLowerCase() === symbolOrId.toLowerCase() || (x.symbol && x.symbol.toLowerCase() === symbolOrId.toLowerCase()));
}

['pentech', 'eipower'].forEach(id => {
    console.log(`\n--- Ticker: ${id.toUpperCase()} ---`);
    dates.forEach(d => {
        const data = getStockData(id, d);
        if (data) {
            console.log(`${d}: Price = RM ${data.currentPrice.toFixed(3)} | ATH = RM ${data.highPrice ? data.highPrice.toFixed(3) : 'N/A'} | TP = RM ${(data.sifuTargetPrice || data.targetPrice || 0).toFixed(2)}`);
        } else {
            console.log(`${d}: Not active/listed yet`);
        }
    });
    const cur = getStockData(id, 'current');
    if (cur) {
        console.log(`2026-06-20 (Current): Price = RM ${cur.currentPrice.toFixed(3)} | ATH = RM ${cur.highPrice ? cur.highPrice.toFixed(3) : 'N/A'} | TP = RM ${(cur.sifuTargetPrice || cur.targetPrice || 0).toFixed(2)}`);
    }
});
