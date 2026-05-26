const puppeteer = require('puppeteer');
const fs = require('fs');

const DATA_FILE = './data.json';

async function updateLivePricesYahoo() {
    try {
        console.log('Reading data.json...');
        let existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        let updatedCount = 0;

        // Cari IPO di stage 4 (Listed) yang ada field symbol
        const listedIpos = existingData.filter(ipo => ipo.stage === 4 && ipo.symbol);

        if (listedIpos.length === 0) {
            console.log('No listed IPOs with symbols found.');
            return;
        }

        console.log(`Found ${listedIpos.length} listed IPOs to check on Yahoo Finance.`);

        // Launch puppeteer
        const browser = await puppeteer.launch({
            headless: "new", // guna new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Block resources yang tak perlu untuk lajukan loading (images, css, dll)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if(['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())){
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set User-Agent spy tak kena block
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

        for (let ipo of listedIpos) {
            // Clean symbol e.g., "3REN [NS]" -> "3REN"
            let symbolClean = ipo.symbol.replace(/\[.*?\]/g, '').trim();
            if (!symbolClean) continue;
            
            // Code bursa di Yahoo Finance biasanya diakhiri dengan .KL
            let yahooSymbol = `${symbolClean}.KL`;
            let url = `https://finance.yahoo.com/quote/${yahooSymbol}`;
            
            try {
                console.log(`Fetching price for ${ipo.companyName} (${yahooSymbol})...`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // Cari harga guna selector Yahoo Finance terkini
                const currentPriceStr = await page.evaluate(() => {
                    // Try data-field regularMarketPrice
                    let priceElement = document.querySelector('fin-streamer[data-field="regularMarketPrice"]');
                    if (priceElement) return priceElement.getAttribute('value') || priceElement.innerText;
                    
                    // Fallback
                    let fallback = document.querySelector(`fin-streamer[data-symbol$=".KL"]`);
                    if (fallback) return fallback.getAttribute('value') || fallback.innerText;
                    
                    return null;
                });

                if (currentPriceStr) {
                    const currentPrice = parseFloat(currentPriceStr.replace(/,/g, ''));
                    if (!isNaN(currentPrice)) {
                        ipo.currentPrice = currentPrice;
                        console.log(`   -> Updated ${yahooSymbol} price to RM ${currentPrice}`);
                        
                        // Recalculate performance
                        if (ipo.price > 0) {
                            const newPerf = ((currentPrice - ipo.price) / ipo.price) * 100;
                            ipo.performance = (newPerf >= 0 ? '+' : '') + newPerf.toFixed(1) + '%';
                        }
                        updatedCount++;
                    }
                } else {
                    console.log(`   -> Could not find price for ${yahooSymbol}`);
                }
                
                // Random delay sikit nak elak rate limit (Yahoo block bot kalu laju sgt)
                await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
                
            } catch (err) {
                console.error(`Error fetching ${yahooSymbol}: ${err.message}`);
            }
        }

        await browser.close();

        // Save data baru ke data.json
        if (updatedCount > 0) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 4));
            console.log(`\nSuccessfully updated ${updatedCount} records in ${DATA_FILE}.`);
        } else {
            console.log('\nNo prices were updated.');
        }

    } catch (e) {
        console.error('Failed to update live prices via Yahoo Finance:', e);
    }
}

updateLivePricesYahoo();
