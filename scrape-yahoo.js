const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

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
            
            let yahooSymbol = null;
            
            // 1. If we already saved stockCode, use it
            if (ipo.stockCode) {
                yahooSymbol = `${ipo.stockCode}.KL`;
            } else {
                // 2. Query Yahoo Autocomplete API
                try {
                    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbolClean)}&lang=en-US&quotesCount=6`;
                    const res = await axios.get(searchUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
                        },
                        timeout: 5000
                    });
                    const quotes = res.data.quotes || [];
                    const klsQuote = quotes.find(q => q.exchange === 'KLS' || q.symbol.endsWith('.KL'));
                    if (klsQuote) {
                        yahooSymbol = klsQuote.symbol;
                        const code = klsQuote.symbol.split('.')[0];
                        if (/^\d{4}$/.test(code)) {
                            ipo.stockCode = code;
                            console.log(`      Found Yahoo symbol ${yahooSymbol} for ${symbolClean}`);
                        }
                    }
                } catch (e) {
                    console.log(`      Yahoo autocomplete lookup failed for ${symbolClean}: ${e.message}`);
                }
                
                // 3. If Yahoo Autocomplete returned nothing (e.g. brand new listing like ENEST), fetch from iSaham stock page
                if (!yahooSymbol) {
                    try {
                        console.log(`      No direct Yahoo match for ${symbolClean}. Attempting iSaham title extraction...`);
                        const isahamUrl = `https://www.isaham.my/stock/${encodeURIComponent(symbolClean)}`;
                        const res = await axios.get(isahamUrl, {
                            headers: { "User-Agent": "Mozilla/5.0" },
                            timeout: 5000
                        });
                        const match = res.data.match(/<title>.*?\s*\((\d{4})\)\s*Share Price/i);
                        if (match && match[1]) {
                            const code = match[1];
                            ipo.stockCode = code;
                            yahooSymbol = `${code}.KL`;
                            console.log(`      -> Extracted stock code ${code} from iSaham for ${symbolClean}`);
                        }
                    } catch (e) {
                        console.log(`      iSaham title extraction failed for ${symbolClean}: ${e.message}`);
                    }
                }
                
                // 4. Ultimate fallback to alphabetical symbol
                if (!yahooSymbol) {
                    yahooSymbol = `${symbolClean}.KL`;
                }
            }
            
            let url = `https://finance.yahoo.com/quote/${yahooSymbol}`;
            
            try {
                console.log(`Fetching price and change for ${ipo.companyName} (${yahooSymbol})...`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // Cari harga & peratusan perubahan guna selector Yahoo Finance terkini
                const results = await page.evaluate((sym) => {
                    let priceElement = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="regularMarketPrice"]`)
                                    || document.querySelector(`fin-streamer[data-symbol="${sym.toUpperCase()}"][data-field="regularMarketPrice"]`);
                    let price = priceElement ? (priceElement.getAttribute('value') || priceElement.innerText) : null;
                    
                    let changeElement = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="regularMarketChangePercent"]`)
                                     || document.querySelector(`fin-streamer[data-symbol="${sym.toUpperCase()}"][data-field="regularMarketChangePercent"]`);
                    let change = changeElement ? (changeElement.getAttribute('value') || changeElement.innerText) : null;
                    
                    if (!price) {
                        let fallback = document.querySelector(`fin-streamer[data-symbol="${sym}"]`)
                                    || document.querySelector(`fin-streamer[data-symbol="${sym.toUpperCase()}"]`);
                        if (fallback) price = fallback.getAttribute('value') || fallback.innerText;
                    }
                    
                    return { price, change };
                }, yahooSymbol);

                if (results.price) {
                    const currentPrice = parseFloat(results.price.replace(/,/g, ''));
                    if (!isNaN(currentPrice)) {
                        ipo.currentPrice = currentPrice;
                        console.log(`   -> Updated ${yahooSymbol} price to RM ${currentPrice}`);
                        
                        if (results.change) {
                            const cleanChange = results.change.replace(/[()%+]/g, '').trim();
                            const dailyChange = parseFloat(cleanChange);
                            if (!isNaN(dailyChange)) {
                                const isNegative = results.change.includes('-');
                                ipo.dailyChange = isNegative ? -Math.abs(dailyChange) : Math.abs(dailyChange);
                                console.log(`   -> Updated ${yahooSymbol} daily change to ${ipo.dailyChange.toFixed(2)}%`);
                            }
                        }
                        
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

        // Save data baru ke data.json dan data.js
        if (updatedCount > 0) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 4));
            
            // Generate data.js
            const jsContent = `const IPO_DATA = ${JSON.stringify(existingData, null, 4)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
            fs.writeFileSync('./data.js', jsContent);
            
            console.log(`\nSuccessfully updated ${updatedCount} records in ${DATA_FILE} and ./data.js.`);
        } else {
            console.log('\nNo prices were updated.');
        }

    } catch (e) {
        console.error('Failed to update live prices via Yahoo Finance:', e);
    }
}

updateLivePricesYahoo();
