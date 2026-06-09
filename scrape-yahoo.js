const puppeteer = require('puppeteer');
const fs = require('fs');

const DATA_FILE = './data.json';

async function updateLivePricesYahoo() {
    try {
        console.log('Reading data.json...');
        let existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        let updatedCount = 0;

        // Candidates: IPOs that have a symbol and either already listed (stage 5)
        // or are on/after listing date (stage 4 with listingDate <= today)
        const today = new Date();
        function parseListingDate(s) {
            if (!s) return null;
            // Expect formats like "03-Jun-2026" or "3-Jun-2026"
            const parts = s.split('-');
            if (parts.length !== 3) return null;
            const day = parts[0].padStart(2, '0');
            const monStr = parts[1];
            const year = parts[2];
            const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
            const m = months[monStr.substring(0,3)];
            if (m === undefined) return null;
            return new Date(parseInt(year,10), m, parseInt(day,10));
        }

        const listedIpos = existingData.filter(ipo => {
            if (!ipo.symbol) return false;
            if (ipo.stage === 5) return true;
            if (ipo.listingDate) {
                const ld = parseListingDate(ipo.listingDate);
                if (ld && ld <= today) return true;
            }
            return false;
        });

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
                        // If openPrice is missing and this looks like listing day or recently listed,
                        // set openPrice to the first seen market price.
                        try {
                            const ld = parseListingDate(ipo.listingDate);
                            const isListingDay = ld && ld.toDateString() === new Date().toDateString();
                            const listedAlready = ipo.stage === 5 || (ld && ld <= today);
                            if ((isListingDay || listedAlready) && (ipo.openPrice === undefined || ipo.openPrice === null)) {
                                ipo.openPrice = currentPrice;
                                console.log(`   -> Set openPrice for ${yahooSymbol} to RM ${currentPrice}`);
                            }
                        } catch (e) {
                            // ignore parse errors
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
