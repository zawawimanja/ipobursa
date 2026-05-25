const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Fail output yang akan dibaca oleh fail HTML kita nanti
const OUTPUT_FILE = path.join(__dirname, 'live_data.json');

// Kita scrape dari i3investor sebab web Bursa Malaysia ada Cloudflare (Anti-Bot)
const URL = 'https://klse.i3investor.com/web/stock/active'; 

async function scrapeLiveBursa() {
    console.log("Mula menarik data Live dari pasaran (i3investor)...");
    try {
        const response = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        let results = [];
        
        // Cari jadual Top Active
        $('table.ncbg tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 7) {
                // Bergantung kepada struktur HTML i3investor
                const name = $(cols[1]).text().trim().replace(/\[.*?\]/g, '').trim(); 
                const price = parseFloat($(cols[2]).text().trim());
                let changeText = $(cols[3]).text().trim();
                const change = parseFloat(changeText) || 0;
                
                // Volume biasanya dalam darab 100 unit
                const volText = $(cols[5]).text().replace(/,/g, '').trim();
                const volume = parseFloat(volText) * 100; 
                
                // Kira Turnover (Nilai Dagangan = Harga x Volume)
                const turnover = price * volume;

                // Logik Automatik Sistem (Tapis Sikat & Momentum)
                let signal = "avoid";
                let reason = "Tiada Momentum / Sikat";

                if (change > 0 && turnover >= 3000000 && price > 0.20) {
                    signal = "buy";
                    reason = "🔥 Momentum Kuat & Jerung Masuk";
                } else if (change <= 0 && turnover >= 3000000) {
                    signal = "avoid";
                    reason = "⚠️ Jerung Buang Barang / Sikat Berbahaya";
                } else if (price <= 0.20) {
                    signal = "avoid";
                    reason = "Terlalu Murah / Risiko Sikat";
                }

                if(name && !isNaN(price)) {
                    results.push({
                        name,
                        sector: "Bursa Market", // Sektor perlukan API lain, kita letak default dulu
                        price,
                        change: (change / price) * 100, // % Perubahan
                        turnover,
                        volume,
                        signal,
                        reason
                    });
                }
            }
        });

        // Susun ikut Turnover paling tinggi
        results.sort((a, b) => b.turnover - a.turnover);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        console.log(`✅ Berjaya scrape & simpan ${results.length} kaunter ke ${OUTPUT_FILE}!`);

    } catch (error) {
        console.error("Gagal menarik data:", error.message);
        console.log("Nota: Jika kena block, mungkin perlukan proxy atau tukar URL ke page Top Volume yang lain.");
    }
}

scrapeLiveBursa();
