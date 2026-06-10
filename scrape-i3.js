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
        // Save to data.json
        fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
        
        // Save to data.js
        const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
        fs.writeFileSync(DATA_JS, jsContent, 'utf8');
    } catch (e) {
        console.error('Error saving database:', e.message);
    }
}

async function scrapeI3PricesAxios() {
    try {
        console.log('Reading data.json...');
        let existingData = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
        
        // Filter listed IPOs (stage 5) with a valid symbol
        const listedIpos = existingData.filter(ipo => ipo.stage === 5 && ipo.symbol);
        
        if (listedIpos.length === 0) {
            console.log('No listed IPOs with symbols found.');
            return;
        }

        console.log(`Found ${listedIpos.length} listed IPOs to update from i3investor using Axios.`);
        
        let updatedCount = 0;

        for (let ipo of listedIpos) {
            let symbolClean = ipo.symbol.replace(/\[.*?\]/g, '').trim();
            if (!symbolClean) continue;
            
            // i3investor URL using symbol
            let url = `https://klse.i3investor.com/web/stock/overview/${symbolClean}`;
            
            try {
                console.log(`Fetching ${ipo.companyName} (${symbolClean})...`);
                const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
                const $ = cheerio.load(res.data);
                
                let priceText = null;
                $('p').each((i, el) => {
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
                        
                        // Save immediately
                        saveDatabase(existingData);
                        updatedCount++;
                    } else {
                        console.log(`   -> Invalid price format: ${priceText}`);
                    }
                } else {
                    console.log(`   -> Price element not found for ${symbolClean}`);
                }
                
                // Small delay to be polite
                await new Promise(r => setTimeout(r, 150));
                
            } catch (err) {
                console.error(`Error fetching ${symbolClean}: ${err.message}`);
            }
        }

        console.log(`\nScraping finished. Successfully updated ${updatedCount} stock prices.`);

    } catch (e) {
        console.error('Failed to run Axios-based i3investor scraper:', e);
    }
}

scrapeI3PricesAxios();
