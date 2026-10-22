const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { updateSourceStatus } = require('./lib/sync-health');
const { atMyt, dateParts } = require('./lib/ipo-rules');

const DATA_JSON = path.join(__dirname, 'data.json');
const DATA_JS = path.join(__dirname, 'data.js');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

// Apply manual metadata and fallback prices before fetching live market prices.
// Applying overrides during a save would replace a fresh quote with an old one.
function applyOverrides(data) {
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
}

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
        throw e;
    }
}

// Fetch helper with retry, timeout and rate-limit aware backoff.
// i3investor throttles bulk requests (HTTP 429), so retry those with longer waits.
async function fetchWithRetry(url, retries = 2, hooks = {}) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
            hooks.onSuccess?.();
            return res;
        } catch (err) {
            lastError = err;
            if (i === retries) break;
            const status = err.response && err.response.status;
            const rateLimited = status === 429 || status === 403;
            if (rateLimited) hooks.onRateLimit?.();
            const retryAfter = Number(err.response?.headers?.['retry-after']);
            const delay = rateLimited
                ? (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 4000 * (i + 1))
                : 2000;
            console.log(`   -> [Retry ${i + 1}/${retries}] HTTP ${status ?? '-'}: ${err.message}. Retrying in ${Math.round(delay / 1000)}s...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
}

// The debut day is a one-shot window for the overview 'Open' price. When it is missed
// (rate limit, counter not yet indexed), the historical chart still holds day-one data.
const DEBUT_BACKFILL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function parseHistoricalOpen(html, listingDate, now = Date.now()) {
    if (typeof html !== 'string') return null;
    const parts = dateParts(listingDate, now);
    if (!parts) return null;
    const iso = `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    const block = html.match(/var\s+dtdata\s*=\s*(\[[\s\S]*?\]);/);
    if (!block) return null;
    const row = block[1].match(new RegExp(`\\[\\s*"${iso}"\\s*,\\s*"([0-9]+(?:\\.[0-9]+)?)"`));
    const open = Number(row && row[1]);
    return open > 0 ? open : null;
}

function historicalChartUrl(overviewHtml) {
    if (typeof overviewHtml !== 'string') return null;
    const link = overviewHtml.match(/href="(\/web\/stock\/historical-chart\/[^"]+)"/);
    return link ? `https://klse.i3investor.com${link[1]}` : null;
}

async function fetchHistoricalOpen(overviewHtml, listingDate, now, throttle) {
    const url = historicalChartUrl(overviewHtml);
    if (!url) return null;
    try {
        const res = await fetchWithRetry(url, 2, throttle);
        return parseHistoricalOpen(res.data, listingDate, now);
    } catch (err) {
        console.log(`   -> Historical debut lookup failed: ${err.message}`);
        return null;
    }
}

async function scrapeI3PricesAxios(options = {}) {
    try {
        console.log('Reading data.json...');
        let existingData = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
        applyOverrides(existingData);
        
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
            updateSourceStatus('i3investor', { status: 'skipped', message: 'No listed IPOs to refresh.' });
            return;
        }

        console.log(`Found ${listedIpos.length} listed IPOs to update from i3investor using Axios.`);
        
        let updatedCount = 0;
        let failedCount = 0;
        let pendingSave = false;
        let debutBackfilled = 0;
        // Adaptive polite delay: grows on throttling, decays on clean responses.
        let throttleDelayMs = 1000;
        const throttle = {
            onRateLimit: () => { throttleDelayMs = Math.min(throttleDelayMs * 2, 12000); },
            onSuccess: () => { throttleDelayMs = Math.max(1000, Math.floor(throttleDelayMs / 2)); }
        };

        for (let i = 0; i < listedIpos.length; i++) {
            let ipo = listedIpos[i];
            let symbolClean = ipo.symbol.replace(/\[.*?\]/g, '').trim();
            if (!symbolClean) {
                failedCount++;
                continue;
            }
            if (/\s/.test(symbolClean)) {
                // Bursa tickers have no spaces, so this is a company name stored as a
                // symbol; i3 would answer with its homepage and no price.
                console.log(`   -> Skip ${ipo.companyName}: '${symbolClean}' is not a ticker symbol.`);
                failedCount++;
                continue;
            }
            
            let url = `https://klse.i3investor.com/web/stock/overview/${symbolClean}`;
            
            try {
                console.log(`[${i + 1}/${listedIpos.length}] Fetching ${ipo.companyName} (${symbolClean})...`);
                const res = await fetchWithRetry(url, 2, throttle);
                const $ = cheerio.load(res.data);
                
                let priceText = null;
                let openPriceText = null;
                $('p').each((idx, el) => {
                    if ($(el).text().trim() === 'Last Price') {
                        const nextP = $(el).next('p');
                        if (nextP.length > 0) {
                            priceText = nextP.text().trim();
                        }
                    } else if ($(el).text().trim() === 'Open') {
                        // i3 overview pairs the label/value in adjacent .col-6 cells.
                        const valueP = $(el).parent().next('.col-6').find('p');
                        if (valueP.length > 0) openPriceText = valueP.text().trim();
                    }
                });

                if (priceText) {
                    const currentPrice = parseFloat(priceText);
                    if (!isNaN(currentPrice) && currentPrice > 0) {
                        const oldPrice = ipo.currentPrice;
                        ipo.currentPrice = currentPrice;

                        // Overview Open is today's open, so it is a debut price only
                        // on the IPO's listing date after Malaysia's market opens.
                        const now = Number(options.now ?? Date.now());
                        const listingDay = atMyt(ipo.listingDate, '00:00', now);
                        const marketOpen = atMyt(ipo.listingDate, '09:00', now);
                        const openPrice = Number(openPriceText);
                        if (!(ipo.openPrice > 0) && listingDay && marketOpen &&
                            now >= marketOpen.getTime() && now < listingDay.getTime() + 24 * 60 * 60 * 1000 &&
                            Number.isFinite(openPrice) && openPrice > 0) {
                            ipo.openPrice = openPrice;
                        }

                        // Missed the debut day? Recover day-one open from the historical chart.
                        const daysSinceListing = listingDay ? now - listingDay.getTime() : NaN;
                        if (!(ipo.openPrice > 0) && listingDay && marketOpen && now >= marketOpen.getTime() &&
                            daysSinceListing <= DEBUT_BACKFILL_WINDOW_MS) {
                            const historicalOpen = await fetchHistoricalOpen(res.data, ipo.listingDate, now, throttle);
                            if (historicalOpen) {
                                ipo.openPrice = historicalOpen;
                                debutBackfilled++;
                                console.log(`   -> Backfilled debut open from history: RM ${historicalOpen}`);
                            }
                        }

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
                        failedCount++;
                    }
                } else {
                    console.log(`   -> Price element not found for ${symbolClean}`);
                    failedCount++;
                }
                
                // Polite delay so i3investor does not throttle the run
                await new Promise(r => setTimeout(r, throttleDelayMs + Math.random() * 500));
                
            } catch (err) {
                console.error(`❌ Error fetching ${symbolClean}: ${err.message}`);
                failedCount++;
                const status = err.response && err.response.status;
                if (status === 429 || status === 403) {
                    throttle.onRateLimit();
                    // Stay paused before hitting the next counter with a fresh request budget.
                    await new Promise(r => setTimeout(r, throttleDelayMs));
                }
            }
        }

        // Final save for any remaining updates
        if (pendingSave) {
            saveDatabase(existingData);
        }

        console.log(`\nScraping finished. Successfully updated ${updatedCount} stock prices.`);
        const status = updatedCount === 0 ? 'failed' : failedCount > 0 ? 'partial' : 'success';
        updateSourceStatus('i3investor', {
            status,
            message: `${updatedCount} prices refreshed; ${failedCount} could not be refreshed.` +
                (debutBackfilled ? ` ${debutBackfilled} debut price(s) backfilled from history.` : '')
        });
        if (status !== 'success') process.exitCode = 1;

    } catch (e) {
        console.error('Failed to run Axios-based i3investor scraper:', e);
        updateSourceStatus('i3investor', { status: 'failed', message: 'Price sync could not complete.' });
        process.exitCode = 1;
    }
}

module.exports = { scrapeI3PricesAxios, parseHistoricalOpen };
if (require.main === module) scrapeI3PricesAxios();
