const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Load .env manually if exists to protect credentials
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = val;
        }
    });
}

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
        'KUCINGKO [NS]': 'kucingko',
        'MFGROUP': 'manforce-group',
        'ADNEX': 'adnex',
        'NE': 'adnex',
        '5ER': '5e-resources',
        'SRKK': 'srkk-ai',
        'SRKK AI BERHAD': 'srkk-ai'
    };

    if (idMap[cleanName]) {
        const found = existingData.find(d => d.id === idMap[cleanName]);
        if (found) return found;
    }
    
    // Match by symbol first if the input matches d.symbol
    const symbolMatch = existingData.find(d => d.symbol && d.symbol.toUpperCase() === cleanName);
    if (symbolMatch) return symbolMatch;
    
    // Fallback to exact normalize match first to avoid greedy substring matching
    const normName = normalizeName(name);
    const exactNormalizeMatch = existingData.find(d => normalizeName(d.companyName) === normName);
    if (exactNormalizeMatch) return exactNormalizeMatch;
    
    // Fallback to fuzzy normalize match
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
            if (label === 'market:') market = val;
            if (label.includes('listing price')) price = parseFloat(val.replace('RM', '').trim()) || 0;
            if (label.includes('closing date')) closingDate = val;
            if (label.includes('listing date')) listingDate = val;
            if (label.includes('shariah')) shariah = val.toLowerCase().includes('yes');
        });

        let existing = findExistingIPO(companyName, existingData);
        let targetStage = 3;
        let targetStatus = 'Application Open';

        if (price === 0 || !closingDate || closingDate.toLowerCase().includes('tba')) {
            // It has no pricing or active closing dates yet - stay in Draft or MITI stage!
            targetStage = (existing && existing.stage && existing.stage < 3) ? existing.stage : 1;
            targetStatus = targetStage === 2 ? 'MITI Allocation Phase' : 'Draft / Exposure Phase';
        }

        if (existing) {
            existing.stage = targetStage;
            existing.status = targetStatus;
            existing.price = price || existing.price;
            existing.closingDate = closingDate || existing.closingDate;
            existing.listingDate = listingDate || existing.listingDate;
            existing.market = market.includes('ACE') ? 'ACE Market' : (market.includes('Main') ? 'Main Market' : market);
            existing.shariah = shariah;
            if (!existing.symbol) {
                existing.symbol = symbol;
            }
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
                stage: targetStage,
                status: targetStatus,
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
    // Based on the structure, h3/h4 separates sections, h5 are company names.
    let currentSection = '';
    
    $('h3, h4, h5').each((i, el) => {
        const text = $(el).text().trim();
        const tagName = el.tagName.toLowerCase();
        
        if (tagName === 'h4' || tagName === 'h3') {
            if (text.includes('MITI IPO') || text.includes('Upcoming Listing')) {
                currentSection = 'MITI';
            } else if (text.includes('Future IPO')) {
                currentSection = 'Future';
            } else {
                currentSection = '';
            }
        } else if (tagName === 'h5') {
            if (!currentSection) return; // Ignore h5s outside the IPO sections

            // It's a company name
            const companyName = text;
            
            // Look ahead for details
            let nextElem = $(el).next();
            let detailsText = '';
            while(nextElem.length && nextElem[0].tagName.toLowerCase() !== 'h5' && nextElem[0].tagName.toLowerCase() !== 'h4' && nextElem[0].tagName.toLowerCase() !== 'h3') {
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
                // Always update to the latest scraped prices
                existing.closePrice = closePrice || currentPrice || existing.closePrice;
                existing.currentPrice = currentPrice || closePrice || existing.currentPrice;
                if (existing.price > 0 && existing.currentPrice > 0) {
                    const perf = ((existing.currentPrice - existing.price) / existing.price) * 100;
                    existing.performance = (perf >= 0 ? '+' : '') + perf.toFixed(2) + '%';
                }
                existing.year = existing.year || year;
                if (!existing.listingDate || existing.listingDate === 'TBA') {
                    existing.listingDate = formatListingDate(listingDate) || date;
                }
                existing.symbol = symbol;
            } else {
                const cleanId = symbol.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const finalPrice = ipoPrice;
                const finalCurrent = currentPrice || closePrice;
                let performance = '+0.00%';
                if (finalPrice > 0 && finalCurrent > 0) {
                    const perf = ((finalCurrent - finalPrice) / finalPrice) * 100;
                    performance = (perf >= 0 ? '+' : '') + perf.toFixed(2) + '%';
                }
                existingData.push({
                    id: cleanId,
                    companyName: symbol,
                    symbol: symbol,
                    stage: 5,
                    status: 'Listed',
                    price: finalPrice,
                    openPrice,
                    closePrice: closePrice || currentPrice,
                    currentPrice: finalCurrent,
                    performance,
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
    console.log('Running Deep Hunt for OS and TP/FV (Shariah only)...');
    let huntedCount = 0;

    // Only hunt Shariah-compliant IPOs:
    // 1. Stage 3 & 4 (pre-listing) - always hunt if missing OS
    // 2. Stage 5 (listed 2024+) - hunt if missing OS
    // Skip non-Shariah, [NS] placeholders, and old entries
    const targets = existingData.filter(ipo => {
        if (!ipo.companyName || ipo.companyName.includes('[NS]')) return false;
        if (ipo.shariah !== true) return false; // Shariah only
        if (ipo.stage === 3 || ipo.stage === 4) return !ipo.os;
        if (ipo.stage === 5) return !ipo.os && (ipo.year >= 2024 || !ipo.year);
        return false;
    });

    console.log(`  Targeting ${targets.length} IPO(s) for OS/TP hunt...`);

    for (let ipo of targets) {
        const stem = normalizeName(ipo.companyName).replace(/\s+/g, '-');
            const ticker = ipo.symbol ? ipo.symbol.toLowerCase() : stem;
            
            const fullSlug = ipo.companyName.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
            
            const urls = [
                ipo.insightUrl, // Try saved URL first
                `https://www.isaham.my/ipo/insights/${fullSlug}`,
                `https://www.isaham.my/ipo-insights/${fullSlug}`,
                `https://www.isaham.my/ipo/insights/${fullSlug.replace(/-berhad|-bhd|-group|-holdings|-corp/g, '')}`,
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

function predictGrade(ipo) {
    const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0;
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();

    const superHeroIBs = ["maybank"];
    const heroIBs = ["public", "kaf", "alliance"];
    const topTierIBs = ["rhb", "aminvestment", "alliance", "affin hwang", "kaf", "public"];
    const momentumIBs = ["m&a", "malacca", "ta securities", "kenanga", "apex", "sj securities"];
    const flatSkews = ["uob", "cimb", "mercury"];
    
    const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity"];
    const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

    const isSuperHero = superHeroIBs.some(tier => ib.includes(tier));
    const isHero = heroIBs.some(tier => ib.includes(tier)) || isSuperHero;
    const isTopTier = topTierIBs.some(tier => ib.includes(tier)) || isSuperHero;
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isFlatSkew = flatSkews.some(tier => ib.includes(tier));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));
    
    const isMainMarket = ipo.market && ipo.market.toLowerCase().includes('main');
    const isAceMarket = !isMainMarket;

    let score = 0;
    let reasons = [];
    
    if (isSuperHero) {
        score += 50;
        reasons.push("SuperHero IB (+50)");
    } else if (isHero) {
        score += 40;
        reasons.push("Hero IB (+40)");
    } else if (isTopTier) {
        score += 30;
        reasons.push("Top Tier IB (+30)");
    } else if (isMomentum) {
        score += 20;
        reasons.push("Momentum IB (+20)");
    }
    
    if (isFlatSkew) {
        score -= 15;
        reasons.push("Flat Skew IB (-15)");
    }
    
    if (isTrendingSector) {
        score += 30;
        reasons.push("Trending Sector (+30)");
    }
    if (isExpansionFund) {
        score += 20;
        reasons.push("Expansion/R&D Fund Use (+20)");
    }
    
    if (isMainMarket) {
        score += 10;
        reasons.push("Main Market (+10)");
    } else if (isAceMarket) {
        score += 5;
        reasons.push("ACE Market (+5)");
    }

    // Price sweet spot scoring
    const price = ipo.price || 0;
    if (price >= 0.30 && price <= 0.50) {
        score += 15;
        reasons.push("Retail sweet spot price (+15)");
    } else if (price >= 0.75 && price <= 1.00) {
        score += 15;
        reasons.push("Growth sweet spot price (+15)");
    } else if (price > 0 && price < 0.20) {
        score -= 15;
        reasons.push("Penny stock penalty (-15)");
    } else if (price > 1.00) {
        score -= 15;
        reasons.push("High-ticket stock penalty (-15)");
    }

    // Geography premium scoring
    const geo = (ipo.geography || '').toLowerCase();
    if (geo === 'penang' && isTrendingSector) {
        score += 20;
        reasons.push("Penang Silicon Valley Premium (+20)");
    } else if (geo === 'johor' || geo === 'melaka') {
        score -= 5;
        reasons.push("Geography penalty (-5)");
    }

    // OFS and PE Valuation Adjustments
    const hasOFS = ipo.ofs === true || ipo.hasOFS === true;
    if (hasOFS) {
        score -= 15;
        reasons.push("Offer for Sale (OFS) component (-15)");
    }
    if (pe > 0 && pe < 13.0) {
        score += 15;
        reasons.push("Cheap/Attractive valuation PE < 13x (+15)");
    } else if (pe > 0 && pe < 18.0) {
        score += 5;
        reasons.push("Reasonable valuation PE < 18x (+5)");
    } else if (pe > 22.0) {
        score -= 10;
        reasons.push("Expensive valuation PE > 22x (-10)");
    }

    let grade = 'C';
    if (score >= 70) grade = 'A';
    else if (score >= 40) grade = 'B';
    
    return { grade, score, reasons };
}

async function autoEnrichFinancials(existingData) {
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
        console.warn('⚠️ [Financial Enrichment] GROQ_API_KEY not found. Skipping auto-financial enrichment.');
        return 0;
    }

    console.log('\n=== Starting Auto Financial Enrichment (Shariah 2026+ IPOs) ===');
    
    const targets = existingData.filter(ipo => 
        ipo.shariah === true && 
        (ipo.year === 2026 || ipo.year === 2027 || !ipo.year) &&
        (ipo.stage === 2 || ipo.stage === 3 || ipo.stage === 4 || ipo.stage === 5) &&
        (!ipo.headers || ipo.headers.length === 0)
    );

    console.log(`  Found ${targets.length} IPO(s) needing financial profile enrichment.`);
    if (targets.length === 0) return 0;

        let enrichedCount = 0;
        const maxExtractions = 2;

        for (let ipo of targets) {
            if (enrichedCount >= maxExtractions) {
                console.log(`\n  [Financial Enrichment] Reached limit of ${maxExtractions} extractions per run. Skipping remaining targets.`);
                break;
            }

            console.log(`\n  Processing: ${ipo.companyName}...`);
            
            const stem = normalizeName(ipo.companyName).replace(/\s+/g, '-');
            const ticker = ipo.symbol ? ipo.symbol.toLowerCase() : stem;
            
            const fullSlug = ipo.companyName.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
            
            const urls = [
                ipo.insightUrl,
                `https://www.isaham.my/ipo/insights/${fullSlug}`,
                `https://www.isaham.my/ipo-insights/${fullSlug}`,
                `https://www.isaham.my/ipo/insights/${fullSlug.replace(/-berhad|-bhd|-group|-holdings|-corp/g, '')}`,
                `https://www.isaham.my/ipo/${stem}`,
                `https://www.isaham.my/ipo-insights/${stem}`,
                `https://www.isaham.my/stock/${ticker}/insights`,
                `https://www.isaham.my/ipo/${ticker}`
            ].filter(Boolean);

            let htmlData = null;
            let matchedUrl = null;
            for (const url of urls) {
                try {
                    const response = await axios.get(url, { headers: HEADERS });
                    if (response.data && response.data.includes('revenueFyeBarChart')) {
                        htmlData = response.data;
                        matchedUrl = url;
                        break;
                    }
                } catch (e) {
                    // Ignore probing errors
                }
            }

            if (!htmlData) {
                console.log(`    ✗ Could not find a valid iSaham Insights page for ${ipo.companyName}`);
                continue;
            }

            console.log(`    ✓ Found Insights page: ${matchedUrl}`);
            ipo.insightUrl = matchedUrl;

            const $ = cheerio.load(htmlData);
            
            let revenueData = null;
            let patData = null;
            let proceedDataRaw = null;
            
            $('script').each((i, el) => {
                const js = $(el).html();
                if (!js) return;
                
                const revMatch = js.match(/var\s+revenueFYE\s*=\s*({[^}]+});?/);
                if (revMatch) {
                    try {
                        revenueData = JSON.parse(revMatch[1].replace(/'/g, '"'));
                    } catch (e) {}
                }
                
                const patMatch = js.match(/var\s+patFYE\s*=\s*({[^}]+});?/);
                if (patMatch) {
                    try {
                        patData = JSON.parse(patMatch[1].replace(/'/g, '"'));
                    } catch (e) {}
                }
                
                const proceedMatch = js.match(/var\s+proceedData\s*=\s*({[^;]+});?/);
                if (proceedMatch) {
                    proceedDataRaw = proceedMatch[1].trim();
                }
            });

            let swotText = '';
            $('.card-body').each((i, el) => {
                const text = $(el).text().replace(/\s+/g, ' ').trim();
                if (text.includes('Superior Profit Margins') || text.includes('Customer Concentration') || text.includes('SWOT Analysis')) {
                    swotText += text + '\n';
                }
            });
            swotText = swotText.substring(0, 3000);

            const ipoDetailsText = $('.card-body').eq(1).text().replace(/\s+/g, ' ').trim();

            const promptContext = {
                ipoDetails: ipoDetailsText,
                revenueFYE: revenueData,
                patFYE: patData,
                proceedsSummary: proceedDataRaw,
                qualitativeInsights: swotText
            };

            const systemPrompt = `You are "Prospectus Extractor AI", a professional Malaysian stock analyst.
Your task is to analyze the provided IPO details and financial variables, and generate a structured JSON object conforming to the schema below.

Requirements:
1. Identify the 3 most recent historical years (e.g. FYE 23, FYE 24, FYE 25) and map their keys using the 2-digit year suffix (e.g., rev23, gp23, pat23, assets23, liab23).
2. For the 2 projected/future years (e.g., FYE 26 and FYE 27), you MUST map them to the keys ending with 'F' and 'F1' (i.e. revF, gpF, patF, assetsF, liabF for FYE F; and revF1, gpF1, patF1, assetsF1, liabF1 for FYE F+1).
3. Do NOT output keys like rev26 or pat27 for projections. Use 'F' and 'F1' keys instead.
4. Convert all revenue, gp, pat, assets, liab numbers to actual RM values (multiply by 1,000 if they are in RM'000, or leave if already in RM).
5. If assets and liabilities are not mentioned, estimate them based on the context (e.g., assets = revenue * 1.5, liabilities = assets * 0.4).
6. Calculate GP based on GP margin if mentioned, or default to a reasonable industry margin.
7. Generate targetPe (e.g. 15-25 based on sector), catalysts (list of 3 key strings), and peers.
8. Output a professional 3-4 sentence analystInsight in Malay/English.

⚠️ CRITICAL PROJECTION RULES (DO NOT VIOLATE):
A. revF MUST be GREATER than rev25 (the latest historical year). Projections must show GROWTH, not decline.
B. patF MUST be GREATER than pat25. Never project profit to fall below the latest actual year.
C. gpF MUST be GREATER than gp25.
D. revF1 must be GREATER than revF. patF1 must be GREATER than patF.
E. Minimum growth rate for projections: at least 5-10% per year. Use higher for high-growth sectors (tech/semiconductor: 15-25%).
F. The targetPe you choose MUST result in a fair value close to the IPO price × expected upside. Formula: fairValue = (patF / totalShares) × targetPe. This must be ABOVE the IPO price to justify investment.

Return ONLY a valid JSON object matching this structure (these are EXAMPLE numbers only — replace with actual data):
{
  "totalShares": 500000000,
  "headers": ["FYE 23", "FYE 24", "FYE 25", "Projection (FYE F)", "Projection (FYE F+1)"],
  "rev23": 80000000, "rev24": 95000000, "rev25": 115000000, "revF": 135000000, "revF1": 158000000,
  "gp23": 20000000, "gp24": 25000000, "gp25": 32000000, "gpF": 38000000, "gpF1": 45000000,
  "pat23": 8000000, "pat24": 10000000, "pat25": 13000000, "patF": 16000000, "patF1": 19000000,
  "assets23": 50000000, "assets24": 60000000, "assets25": 75000000, "assetsF": 90000000, "assetsF1": 105000000,
  "liab23": 20000000, "liab24": 24000000, "liab25": 30000000, "liabF": 36000000, "liabF1": 42000000,
  "targetPe": 18,
  "catalysts": [
    "Catalyst 1...",
    "Catalyst 2..."
  ],
  "peers": "Peer comparison details..."
}`;

            try {
                console.log('      Sending request to Groq...');
                const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(promptContext, null, 2) }
                    ],
                    max_tokens: 1500,
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                }, {
                    headers: {
                        'Authorization': `Bearer ${GROQ_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                const parsedJson = JSON.parse(groqResponse.data.choices[0].message.content);
                console.log('      ✓ Successfully parsed financial data!');

                // Merge into ipo object
                Object.assign(ipo, parsedJson);
                ipo.enrichedBy = "AI";

                // Re-predict Grade
                const gradeResult = predictGrade(ipo);
                ipo.predictedGrade = gradeResult.grade;
                ipo.analystInsight = parsedJson.analystInsight;
                
                console.log(`      ✓ Predicted Grade: [${gradeResult.grade}] (Score: ${gradeResult.score}/100)`);
                enrichedCount++;
                
            } catch (err) {
                console.error('      ✗ Error extracting financials via Groq:', err.message);
                if (err.response && err.response.status === 429) {
                    console.log('      ⚠️ Rate limit (429) hit. Stopping AI enrichment for this run to prevent blocking.');
                    break;
                }
            }

            // Polite delay
            await new Promise(r => setTimeout(r, 3000));
        }
        return enrichedCount;
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

    // Automatically crawl and enrich financial profiles using Groq
    const enrichedCount = await autoEnrichFinancials(existingData);

    // Apply overrides if overrides.json exists
    const overridesPath = path.join(__dirname, 'overrides.json');
    if (fs.existsSync(overridesPath)) {
        try {
            const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
            let appliedCount = 0;
            existingData.forEach(ipo => {
                const override = overrides[ipo.id];
                if (override) {
                    Object.assign(ipo, override);
                    appliedCount++;
                }
            });
            console.log(`  [Overrides] Applied overrides to ${appliedCount} IPOs from overrides.json.`);
        } catch (e) {
            console.error('  [Overrides] Error applying overrides:', e.message);
        }
    }

    // Save back to data.json
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(existingData, null, 2));
    
    // Generate data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(existingData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
    fs.writeFileSync(DATA_JS_FILE, jsContent);

    // Generate sync-status.js
    const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const syncStatus = {
        lastSync: stamp,
        status: "Success",
        enrichedCount: enrichedCount || 0,
        totalIpos: existingData.length
    };
    const statusJsContent = `const SYNC_STATUS = ${JSON.stringify(syncStatus, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = SYNC_STATUS;\n}`;
    fs.writeFileSync(path.join(__dirname, 'sync-status.js'), statusJsContent);

    console.log(`\n--- Sync Complete ---`);
    console.log(`Total IPOs: ${existingData.length} (Added ${existingData.length - initialCount} new)`);
    console.log(`Files updated: data.json, data.js, sync-status.js`);

    // Auto git push to update live dashboard
    await gitPush();
}

async function gitPush() {
    const { execSync } = require('child_process');
    try {
        const status = execSync('git status --porcelain data.json data.js sync-status.js', { cwd: __dirname }).toString().trim();
        if (!status) {
            console.log('\n[Git] No changes to push.');
            return;
        }
        const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        execSync('git add data.json data.js sync-status.js', { cwd: __dirname });
        execSync(`git commit -m "Auto sync: ${stamp}"`, { cwd: __dirname });
        execSync('git push', { cwd: __dirname });
        console.log(`\n[Git] ✅ Pushed to GitHub successfully.`);
    } catch (e) {
        console.error('\n[Git] ❌ Push failed:', e.message);
    }
}

main().catch(console.error);
