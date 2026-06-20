const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const quickMode = args.includes('--quick') || args.includes('-q') || args.includes('quick');

console.log('========================================================================');
console.log('💼 SYSTEM UTAMA — BURSA IPO TRACKER (AUTOMATIC WORKFLOW)');
console.log('========================================================================');

if (!quickMode) {
    try {
        console.log('\n🔄 LANGKAH 1: Menyelaraskan harga terkini dari iSaham...');
        execSync('node sync-isaham.js', { stdio: 'inherit', cwd: __dirname });
        
        console.log('\n⚡ LANGKAH 2: Mengemas kini puncak tertinggi sejarah (ATH)...');
        execSync('node scratch/fix-high-anomalies.js', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
        console.error('❌ Ralat berlaku semasa kemas kini data. Menggunakan data sedia ada...');
    }
} else {
    console.log('\n⚡ Mod Pantas (Quick Mode): Membaca database sedia ada sahaja...');
}

try {
    console.log('\n📈 LANGKAH 3: Menjana Laporan Harian (Morning Brief & Watchlist)...');
    execSync('node morning-brief.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
    console.error('❌ Ralat semasa menjana laporan:', error.message);
}
