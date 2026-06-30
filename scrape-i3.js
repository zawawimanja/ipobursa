const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const DATA_JSON = path.join(__dirname, 'data.json');
const DATA_JS = path.join(__dirname, 'data.js');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

// Helper function to save the data array to both data.json and data.js
function saveDatabase(data) {
    try {
        // Apply overrides if overrides.json exists
        const overridesPath = path.join(__dirname, 'overrides.json');
        if (fs.existsSync(overridesPath)) {
            try {
                const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
                let appliedCount = 0;
                data.forEach(ipo => {
                    const override = overrides[ipo.id];
                    if (override) {
                        Object.assign(ipo, override);
                        appliedCount++;
                    }
                });
                console.log(`   -> [Overrides] Applied overrides to ${appliedCount} IPOs from overrides.json.`);
            } catch (e) {
                console.error('   -> [Overrides] Error applying overrides:', e.message);
            }
        }

        // Save to data.json
        fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
        
        // Save to data.js
        const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
        fs.writeFileSync(DATA_JS, jsContent, 'utf8');
    } catch (e) {
        console.error('Error saving database:', e.message);
    }
}

// Fetch helper with retry and timeout
async function fetchWithRetry(url, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
            return res;
        } catch (err) {
            if (i === retries) throw err;
            console.log(`   -> [Retry ${i + 1}/${retries}] Error: ${err.message}. Retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function scrapeI3PricesAxios() {
    try {
        console.log('Reading data.json...');
        let existingData = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
        
        // Filter listed IPOs:
        // - Must have stage 5 and a valid symbol
        // - Keep all recent IPOs (2025 and 2026)
        // - Randomly sample 10% of older IPOs (< 2025) per run to stagger updates and avoid i3investor rate limits
        const listedIpos = existingData.filter(ipo => {
            if (ipo.stage !== 5 || !ipo.symbol) return false;
            if (ipo.year >= 2025) return true;
            return Math.random() < 0.1;
        });
        
        if (listedIpos.length === 0) {
            console.log('No listed IPOs to update.');
            return;
        }

        console.log(`Found ${listedIpos.length} listed IPOs to update from i3investor using Axios.`);
        
        let updatedCount = 0;
        let pendingSave = false;

        for (let i = 0; i < listedIpos.length; i++) {
            let ipo = listedIpos[i];
            let symbolClean = ipo.symbol.replace(/\[.*?\]/g, '').trim();
            if (!symbolClean) continue;
            
            let url = `https://klse.i3investor.com/web/stock/overview/${symbolClean}`;
            
            try {
                console.log(`[${i + 1}/${listedIpos.length}] Fetching ${ipo.companyName} (${symbolClean})...`);
                const res = await fetchWithRetry(url);
                const $ = cheerio.load(res.data);
                
                let priceText = null;
                $('p').each((idx, el) => {
                    if ($(el).text().trim() === 'Last Price') {
                        const nextP = $(el).next('p');
                        if (nextP.length > 0) {
                            priceText = nextP.text().trim();
                        }
                    }
                });

                if (priceText) {
                    const currentPrice = parseFloat(priceText);
                    if (!isNaN(currentPrice) && currentPrice > 0) {
                        const oldPrice = ipo.currentPrice;
                        ipo.currentPrice = currentPrice;
                        
                        // Recalculate performance
                        if (ipo.price > 0) {
                            const newPerf = ((currentPrice - ipo.price) / ipo.price) * 100;
                            ipo.performance = (newPerf >= 0 ? '+' : '') + newPerf.toFixed(2) + '%';
                        }
                        
                        console.log(`   -> Updated: RM ${oldPrice} -> RM ${currentPrice} (Perf: ${ipo.performance})`);
                        updatedCount++;
                        pendingSave = true;
                        
                        // Batch writes: Save database every 10 updates to reduce file I/O overhead
                        if (updatedCount % 10 === 0) {
                            saveDatabase(existingData);
                            pendingSave = false;
                        }
                    } else {
                        console.log(`   -> Invalid price format: ${priceText}`);
                    }
                } else {
                    console.log(`   -> Price element not found for ${symbolClean}`);
                }
                
                // Polite delay: 1.0 to 1.5 seconds to avoid rate limiting
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
                
            } catch (err) {
                console.error(`❌ Error fetching ${symbolClean}: ${err.message}`);
            }
        }

        // Final save for any remaining updates
        if (pendingSave) {
            saveDatabase(existingData);
        }

        console.log(`\nScraping finished. Successfully updated ${updatedCount} stock prices.`);

    } catch (e) {
        console.error('Failed to run Axios-based i3investor scraper:', e);
    }
}

scrapeI3PricesAxios();
