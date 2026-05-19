const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, 'data.json');
const DATA_JS_FILE = path.join(__dirname, 'data.js');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

function normalizeName(name) {
    return name.toLowerCase()
        .replace(/berhad|bhd|group|holdings|corp/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}


function findExistingIPO(name, existingData) {
    const cleanName = name.trim().toUpperCase();
    
    // Explicit ID mapping for known entities to avoid duplicates
    const idMap = {
        'EMPIRE': 'empire-premium',
        'MTTSL': 'mtt-shipping',
        'UUE': 'uue-holdings',
        'WENTEL': 'wentel-engineering',
        'SWIFT': 'swift-haulage',
        'GHS [NS]': 'ghs',
        'SEMICO [NS]': 'semico',
        'SALIRAN [NS]': 'saliran-group',
        'SUPREME': 'supreme-consolidated',
        'AZAMJAYA [NS]': 'azam-jaya',
        'KUCINGKO [NS]': 'kucingko'
    };

    if (idMap[cleanName]) {
        const found = existingData.find(d => d.id === idMap[cleanName]);
        if (found) return found;
    }
    
    // Fallback to fuzzy normalize match
    const normName = normalizeName(name);
    return existingData.find(d => {
        const normExisting = normalizeName(d.companyName);
        return normExisting.includes(normName) || normName.includes(normExisting);
    });
}

async function fetchPage(url) {
    try {
        const response = await axios.get(url, { headers: HEADERS });
        return cheerio.load(response.data);
    } catch (e) {
        if (e.response && e.response.status === 404) {
            // Silence 404s as they are expected during brute-force probing
            return null;
        }
        console.error(`Failed to fetch ${url}:`, e.message);
        return null;
    }
}

async function scrapeUpcomingIPOs(existingData) {
    console.log('Scraping Stage 3 (Upcoming) IPOs...');
    const $ = await fetchPage('https://www.isaham.my/ipo');
    if (!$) return 0;

    let count = 0;
    $('.f-ipo-card').each((i, el) => {
        const titleText = $(el).find('.card-title').text().trim();
        if (!titleText) return;

        const parts = titleText.split('|');
        const symbol = parts[0].trim();
        const companyName = parts[1] ? parts[1].trim() : symbol;

        let market = '', price = 0, closingDate = '', listingDate = '', shariah = false;
        $(el).find('span.font-weight-bold').each((_, span) => {
            const label = $(span).text().toLowerCase();
            const val = $(span).next('span').text().trim();
            if (label.includes('market')) market = val;
            if (label.includes('listing price')) price = parseFloat(val.replace('RM', '').trim()) || 0;
            if (label.includes('closing date')) closingDate = val;
            if (label.includes('listing date')) listingDate = val;
            if (label.includes('shariah')) shariah = val.toLowerCase().includes('yes');
        });

        let existing = findExistingIPO(companyName, existingData);

        if (existing) {
            existing.stage = 3;
            existing.status = 'Application Open';
            existing.price = price || existing.price;
            existing.closingDate = closingDate || existing.closingDate;
            existing.listingDate = listingDate || existing.listingDate;
            existing.market = market.includes('ACE') ? 'ACE Market' : (market.includes('Main') ? 'Main Market' : market);
            existing.shariah = shariah;
        } else {
            existingData.push({
                id: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                companyName,
                symbol,
                market: market.includes('ACE') ? 'ACE Market' : (market.includes('Main') ? 'Main Market' : market),
                price,
                closingDate,
                listingDate,
                shariah,
                stage: 3,
                status: 'Application Open',
                year: new Date().getFullYear()
            });
        }
        count++;
    });
    return count;
}

async function scrapeMitiAndDraftIPOs(existingData) {
    console.log('Scraping Stage 1 & 2 (MITI and Draft) IPOs...');
    const $ = await fetchPage('https://www.isaham.my/ipo/miti');
    if (!$) return 0;

    let count = 0;
    
    // The structure typically has headings like "MITI IPO" and "Future IPO", followed by elements
    // Let's find h5 tags that typically hold the company names.
    // Based on the structure, h4 separates sections, h5 are company names.
    let currentSection = '';
    
    $('h4, h5').each((i, el) => {
        const text = $(el).text().trim();
        
        if (el.tagName.toLowerCase() === 'h4') {
            if (text.includes('MITI IPO') || text.includes('Upcoming Listing')) {
                currentSection = 'MITI';
            } else if (text.includes('Future IPO')) {
                currentSection = 'Future';
            }
        } else if (el.tagName.toLowerCase() === 'h5') {
            // It's a company name
            const companyName = text;
            
            // Look ahead for details
            let nextElem = $(el).next();
            let detailsText = '';
            while(nextElem.length && nextElem[0].tagName.toLowerCase() !== 'h5' && nextElem[0].tagName.toLowerCase() !== 'h4') {
                detailsText += nextElem.text() + ' ';
                nextElem = nextElem.next();
            }

            let stage = currentSection === 'MITI' ? 2 : 1;
            let status = currentSection === 'MITI' ? 'MITI Allocation Phase' : 'Draft / Exposure Phase';
            
            let existing = findExistingIPO(companyName, existingData);

            if (existing) {
                // Only update stage if it's currently a lower stage or pending
                if (!existing.stage || existing.stage < stage) {
                    existing.stage = stage;
                    existing.status = status;
                }
            } else {
                existingData.push({
                    id: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    companyName,
                    stage,
                    status,
                    price: 0,
                    year: new Date().getFullYear()
                });
            }
            count++;
        }
    });

    return count;
}

function formatListingDate(dateStr) {
    if (!dateStr || dateStr === 'TBA') return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const months = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return null;
}

async function scrapeListedStatistics(existingData) {
    console.log('Scraping Stage 5 (Listed Statistics) IPOs...');
    const $ = await fetchPage('https://www.isaham.my/ipo/statistics');
    if (!$) return 0;

    let count = 0;
    $('#statsTable tbody tr').each((i, el) => {
        const cols = $(el).find('td');
        if (cols.length >= 7) {
            const date = $(cols[0]).text().trim();
            const symbol = $(cols[2]).text().trim();
            const listingDate = $(cols[3]).text().trim();
            
            let year = 2026;
            if (listingDate && listingDate !== 'TBA') {
                const yr = parseInt(listingDate.split('-').pop());
                if (yr) year = yr;
            } else if (date) {
                const yr = parseInt(date.split('-')[0]);
                if (yr) year = yr;
            }

            const ipoPrice = parseFloat($(cols[4]).text()) || parseFloat($(cols[1]).text()) || 0;
            const currentPrice = parseFloat($(cols[5]).text()) || 0;
            
            const scPerfText = $(cols[7]).text().trim().replace('%', '');
            const scPerf = parseFloat(scPerfText) || 0;
            
            const soPerfText = $(cols[6]).text().trim().replace('%', '');
            const soPerf = parseFloat(soPerfText) || 0;
            
            const openPrice = ipoPrice * (1 + soPerf / 100);
            const closePrice = ipoPrice * (1 + scPerf / 100);

            let existing = findExistingIPO(symbol, existingData);

            if (existing) {
                existing.stage = 5;
                existing.status = 'Listed';
                existing.price = existing.price || ipoPrice;
                if (!existing.openPrice || existing.openPrice === 0) {
                    existing.openPrice = openPrice;
                }
                existing.closePrice = existing.closePrice || closePrice || currentPrice;
                existing.currentPrice = currentPrice || existing.currentPrice || closePrice;
                existing.year = existing.year || year;
                if (!existing.listingDate || existing.listingDate === 'TBA') {
                    existing.listingDate = formatListingDate(listingDate) || date;
                }
                existing.symbol = symbol;
            } else {
                const cleanId = symbol.toLowerCase().replace(/[^a-z0-9]/g, '-');
                existingData.push({
                    id: cleanId,
                    companyName: symbol,
                    symbol: symbol,
                    stage: 5,
                    status: 'Listed',
                    price: ipoPrice,
                    openPrice,
                    closePrice: closePrice || currentPrice,
                    currentPrice: currentPrice || closePrice,
                    year,
                    listingDate: formatListingDate(listingDate) || date
                });
            }
            count++;
        }
    });
    return count;
}

async function deepHuntData(existingData) {
    console.log('Running Deep Hunt for OS and TP/FV...');
    let huntedCount = 0;

    for (let ipo of existingData) {
        if ((ipo.stage === 3 || ipo.stage === 4) && (!ipo.os || !ipo.avgTP || !ipo.pe)) {
            const stem = normalizeName(ipo.companyName).replace(/\s+/g, '-');
            const ticker = ipo.symbol ? ipo.symbol.toLowerCase() : stem;
            
            const urls = [
                ipo.insightUrl, // Try saved URL first
                `https://www.isaham.my/ipo/${stem}`,
                `https://www.isaham.my/ipo-insights/${stem}`,
                `https://www.isaham.my/stock/${ticker}/insights`,
                `https://www.isaham.my/ipo/${ticker}`
            ].filter(Boolean);

            let foundInfo = false;
            for (const url of urls) {
                try {
                    const $ = await fetchPage(url);
                    if (!$) continue;
                    
                    const text = $('body').text();

                    // Hunt for OS
                    if (!ipo.os) {
                        const osMatch = text.match(/Oversubscription rate:\s*(\d+\.\d+)x/i) || 
                                      text.match(/subscribed by\s*(\d+\.\d+)\s*times/i) ||
                                      text.match(/OS Rate:\s*(\d+\.\d+)/i) ||
                                      text.match(/oversubscribed by\s*(\d+\.\d+)x/i);
                        if (osMatch) {
                            ipo.os = parseFloat(osMatch[1]);
                            ipo.isAutoOS = true;
                            console.log(`  [OS] Found ${ipo.os}x for ${ipo.companyName}`);
                            foundInfo = true;
                        }
                    }

                    // Hunt for TP/FV
                    if (!ipo.avgTP) {
                        const tpPatterns = [
                            /Fair Value\s*(?:of|is|at)?\s*RM\s*(\d+\.\d+)/i,
                            /Target Price\s*(?:of|is|at)?\s*RM\s*(\d+\.\d+)/i,
                            /Average Target Price:\s*RM\s*(\d+\.\d+)/i,
                            /FV\s*(?:of|is|at)?\s*RM\s*(\d+\.\d+)/i
                        ];

                        let foundTP = null;
                        for (const pattern of tpPatterns) {
                            const match = text.match(pattern);
                            if (match) {
                                foundTP = parseFloat(match[1]);
                                break;
                            }
                        }

                        if (foundTP) {
                            ipo.avgTP = foundTP;
                            ipo.isAutoTP = true;
                            if (!ipo.research) ipo.research = [];
                            
                            const analystEntry = { 
                                house: "iSaham (Auto-Hunt)", 
                                tp: foundTP, 
                                view: "Auto-Detected Value", 
                                img: "https://www.isaham.my/img/logo-isaham.png",
                                isAuto: true 
                            };

                            if (!ipo.research.some(r => r.house === analystEntry.house)) {
                                ipo.research.push(analystEntry);
                            }
                            console.log(`  [TP] Found RM ${foundTP} for ${ipo.companyName}`);
                            foundInfo = true;
                        }
                    }

                    // Hunt for PE
                    if (!ipo.pe) {
                        const peMatch = text.match(/P\/E Ratio:\s*(\d+\.\d+)/i) || text.match(/PE:\s*(\d+\.\d+)/i);
                        if (peMatch) {
                            ipo.pe = parseFloat(peMatch[1]);
                            ipo.isAutoPE = true;
                            console.log(`  [PE] Found ${ipo.pe} for ${ipo.companyName}`);
                            foundInfo = true;
                        }
                    }
                    
                    if (foundInfo) break; // found what we needed for this IPO

                } catch (e) {
                    // Ignore errors for individual URLs
                }
            }
            if (foundInfo) huntedCount++;
        }
    }
    return huntedCount;
}

function parseFlexDate(str) {
    if (!str) return null;
    const iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso;
    const dashMonth = str.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
    if (dashMonth) return new Date(`${dashMonth[2]} ${dashMonth[1]}, ${dashMonth[3]}`);
    const fullDate = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (fullDate) return new Date(`${fullDate[2]} ${fullDate[1]}, ${fullDate[3]}`);
    const shortMonth = str.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
    if (shortMonth) return new Date(`${shortMonth[2]} ${shortMonth[1]}, ${new Date().getFullYear()}`);
    return null;
}

function autoPromoteIPOs(finalData) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let promotedCount = 0;
    finalData.forEach(ipo => {
        if (ipo.stage === 5) return;
        
        if (ipo.status === 'Listed' || (ipo.year && ipo.year < 2026)) {
            ipo.stage = 5;
            ipo.status = 'Listed';
            promotedCount++;
            console.log(`  [Auto-Promote] ${ipo.companyName} (Status Listed or Year < 2026 -> Stage 5)`);
        }

        if (ipo.stage >= 3) {
            if (ipo.listingDate) {
                const listDate = parseFlexDate(ipo.listingDate);
                if (listDate) {
                    listDate.setHours(0, 0, 0, 0);
                    if (listDate <= today) {
                        ipo.stage = 5;
                        ipo.status = 'Listed';
                        promotedCount++;
                        console.log(`  [Auto-Promote] ${ipo.companyName} (Listing date ${ipo.listingDate} passed -> Stage 5)`);
                    } else if (ipo.closingDate) {
                        const closeDate = parseFlexDate(ipo.closingDate);
                        if (closeDate && closeDate < now) {
                            if (ipo.stage === 3) {
                                ipo.stage = 4;
                                ipo.status = 'Pre-Listing';
                                console.log(`  [Auto-Promote] ${ipo.companyName} (Closing date passed -> Stage 4)`);
                            }
                        }
                    }
                }
            } else if (ipo.closingDate) {
                const closeDate = parseFlexDate(ipo.closingDate);
                if (closeDate && closeDate < now) {
                    if (ipo.stage === 3) {
                        ipo.stage = 4;
                        ipo.status = 'Pre-Listing';
                        console.log(`  [Auto-Promote] ${ipo.companyName} (Closing date passed -> Stage 4)`);
                    }
                }
            }
        }
    });
    return promotedCount;
}

async function main() {
    console.log('--- Starting IPO Hunter Sync ---');
    
    let existingData = [];
    if (fs.existsSync(DATA_JSON_FILE)) {
        existingData = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));
    } else {
        console.warn('data.json not found. Starting fresh.');
    }

    const initialCount = existingData.length;

    await scrapeListedStatistics(existingData);
    await scrapeUpcomingIPOs(existingData);
    await scrapeMitiAndDraftIPOs(existingData);
    // Run fallback auto-promotion logic based on dates
    console.log('Running Fallback Auto-Promotion Sweep...');
    const promoted = autoPromoteIPOs(existingData);
    if (promoted > 0) {
        console.log(`  Successfully auto-promoted ${promoted} IPO(s).`);
    } else {
        console.log('  No fallback promotions required.');
    }

    await deepHuntData(existingData);

    // Save back to data.json
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(existingData, null, 2));
    
    // Generate data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(existingData, null, 2)};\n`;
    fs.writeFileSync(DATA_JS_FILE, jsContent);

    console.log(`\n--- Sync Complete ---`);
    console.log(`Total IPOs: ${existingData.length} (Added ${existingData.length - initialCount} new)`);
    console.log(`Files updated: data.json, data.js`);
}

main().catch(console.error);
