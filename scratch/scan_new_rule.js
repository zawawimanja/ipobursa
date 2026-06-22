const fs = require('fs');
const archive = JSON.parse(fs.readFileSync('archive/groups-2026-06-19.json', 'utf8'));
const allOld = [
    ...(archive.kumpulan_1 ? archive.kumpulan_1.stocks : []),
    ...(archive.kumpulan_2 ? archive.kumpulan_2.stocks : []),
    ...(archive.kumpulan_3 ? archive.kumpulan_3.stocks : [])
];
const oldMap = {};
allOld.forEach(x => {
    const key = x.symbol ? x.symbol.toUpperCase() : x.id.toUpperCase();
    oldMap[key] = x;
});

const d = JSON.parse(fs.readFileSync('data.json', 'utf8'));

console.log('--- SENARAI SAHAM BESAR (> RM1.00) YANG NAIK 5% - 10% HARI INI ---');
console.log('Ini adalah senarai saham yang akan mendapat "Bonus Momentum" dengan logik baru kita:\n');

d.forEach(g => {
    const key = g.symbol ? g.symbol.toUpperCase() : g.id.toUpperCase();
    const old = oldMap[key];
    if (!old) return;
    
    const curPrice = g.currentPrice || 0;
    const oldPrice = old.currentPrice || 0;
    
    if (oldPrice > 0 && curPrice >= 1.00) {
        const trueDailyChange = ((curPrice - oldPrice) / oldPrice) * 100;
        
        if (trueDailyChange >= 5.0 && trueDailyChange < 10.0) {
            console.log(`🚀 ${key} (${g.companyName})`);
            console.log(`   Harga: RM ${curPrice.toFixed(3)} | Kenaikan Sebenar: +${trueDailyChange.toFixed(2)}%`);
            console.log('');
        }
    }
});
