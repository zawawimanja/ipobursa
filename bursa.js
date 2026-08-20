const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const quickMode = args.includes('--quick') || args.includes('-q') || args.includes('quick');

console.log('========================================================================');
console.log('💼 SYSTEM UTAMA — BURSA IPO TRACKER (AUTOMATIC WORKFLOW)');
console.log('========================================================================');

if (!quickMode) {
    // LANGKAH 1: Sync iSaham.
    // - API RASMI (sync-isaham-api.js): tiada Cloudflare/403 langsung. Jalan
    //   SEKALI sehari (run 08:45) sahaja — free tier 500 kredit/bulan:
    //   10 kredit/run × 1 run/hari = 300/bulan. Jangan run 3×/hari.
    // - Selain itu: scrape + cookies Chrome (sync-isaham.js) — 0 kredit.
    // - Fallback rapat: jika API gagal → scrape; jika scrape gagal → data sedia ada.
    const hour = new Date().getHours();
    const apiWindow = hour < 11; // 08:45 = window API; 13:00/17:30 = scrape

    if (apiWindow) {
        try {
            console.log('\n🔄 LANGKAH 1: Menyelaraskan data iSaham (API rasmi)...');
            execSync('node sync-isaham-api.js', { stdio: 'inherit', cwd: __dirname });
            console.log('\n✅ LANGKAH 1 selesai (API).');
        } catch (apiError) {
            console.warn('\n⚠️  API sync gagal — fallback ke sync-isaham.js (cookies/scrape)...');
            try {
                execSync('node sync-isaham.js', { stdio: 'inherit', cwd: __dirname });
                console.log('\n✅ LANGKAH 1 selesai (scrape fallback).');
            } catch (error) {
                console.error('❌ Ralat berlaku semasa kemas kini data. Menggunakan data sedia ada...');
            }
        }
    } else {
        try {
            console.log('\n🔄 LANGKAH 1: Menyelaraskan data iSaham (cookies/scrape)...');
            execSync('node sync-isaham.js', { stdio: 'inherit', cwd: __dirname });
            console.log('\n✅ LANGKAH 1 selesai (scrape).');
        } catch (error) {
            console.error('❌ Ralat berlaku semasa kemas kini data. Menggunakan data sedia ada...');
        }
    }
    
    try {
        console.log('\n⚡ LANGKAH 2: Mengemas kini puncak tertinggi sejarah (ATH)...');
        execSync('node scratch/fix-high-anomalies.js', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
        console.error('❌ Ralat semasa kemas kini ATH. Menggunakan data sedia ada...');
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
