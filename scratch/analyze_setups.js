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
const gainers = d.filter(x => typeof x.dailyChange === 'number' && x.dailyChange >= 5.0).sort((a,b) => b.dailyChange - a.dailyChange).slice(0, 6);

console.log('ANALISIS SETUP JUMAAT LEPAS UNTUK SAHAM YANG NAIK HARI INI:\n');

gainers.forEach(g => {
    const key = g.symbol ? g.symbol.toUpperCase() : g.id.toUpperCase();
    const old = oldMap[key];
    if (!old) {
        console.log(`- ${key}: Tiada data Jumaat lepas`);
        return;
    }
    
    const curPrice = old.currentPrice || 0;
    const highPrice = old.highPrice || 0;
    const tp = old.calibratedSifuTargetPrice || old.sifuTargetPrice || old.avgTP || 0;
    
    const distToAth = highPrice ? ((highPrice - curPrice) / curPrice) * 100 : 0;
    const upside = tp > 0 ? ((tp - curPrice) / curPrice) * 100 : 0;
    
    let setup = '';
    if (distToAth >= 0 && distToAth <= 5.0) setup = 'RBS Retest (Dekat ATH)';
    else if (distToAth > 5.0 && distToAth <= 20.0) setup = 'Healthy Dip';
    else if (distToAth > 20.0) setup = 'Deep Pullback / Downtrend';
    
    console.log(`🚀 ${key} (+${g.dailyChange.toFixed(1)}% hari ini ke RM${g.currentPrice})`);
    console.log(`   Data Jumaat (19 Jun): Harga Tutup = RM ${curPrice.toFixed(3)} | ATH = RM ${highPrice.toFixed(3)}`);
    console.log(`   Jarak ke ATH: ${distToAth.toFixed(1)}%  -> SETUP JUMAAT: [${setup}]`);
    console.log(`   Upside waktu itu: ${upside.toFixed(1)}%`);
    console.log('');
});
