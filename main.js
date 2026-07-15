let ipoData = [];
let currentStage = 1;

function getGroqKey() {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('groq');
    if (urlKey) {
        localStorage.setItem('gadisai_groq_key', urlKey);
        return urlKey;
    }
    return localStorage.getItem('gadisai_groq_key') || '';
}
let selectedGrades = ['A', 'B', 'C', 'Pending'];
let currentYear = 'all';
let currentSearch = '';
let currentSort = 'newest';

// Load data from inline script (works with file:// protocol)
function initializeData() {
    try {
        // Step 1: Start with enrichment data from data.js
        if (typeof IPO_DATA !== 'undefined') {
            console.log('DEBUG: Initializing with ' + IPO_DATA.length + ' items from data.js');
            const stage4Count = IPO_DATA.filter(i => i.stage === 4).length;
            console.log('DEBUG: Items in Stage 4 in data.js: ' + stage4Count);
            ipoData = JSON.parse(JSON.stringify(IPO_DATA)); 
            
            // Auto-promote IPOs whose listing date has passed
            autoPromoteIPOs(ipoData);
        }

        // Step 2: Show initial state
        updateGradeFilterUI();
        renderIPOs(currentStage);
        setTimeout(() => { checkPriceAlerts(); }, 500);

        console.log('Sync Engine: Ready (Manual trigger only)');
        
        // Disable auto-sync on load to prevent CORS errors. 
        // User can still click "Force Refresh" if they need it.
        // fetchLiveUpdates(); 
        
    } catch(e) {
        console.error('Failed to initialize:', e);
    }
}

async function fetchLiveUpdates() {
    const proxy = 'https://api.allorigins.win/get?url=';
    const endpoints = {
        upcoming: 'https://www.isaham.my/ipo',
        stats: 'https://www.isaham.my/ipo/statistics',
        miti: 'https://www.isaham.my/ipo/miti'
    };

    const timeHeader = document.getElementById('update-time');
    if(timeHeader) timeHeader.innerHTML = `<span style="color:var(--primary-light);">Syncing with Bursa (v1.0.2)...</span>`;

    try {
        const [upRes, statRes, mitiRes] = await Promise.all([
            fetch(proxy + encodeURIComponent(endpoints.upcoming)).then(r => r.json()),
            fetch(proxy + encodeURIComponent(endpoints.stats)).then(r => r.json()),
            fetch(proxy + encodeURIComponent(endpoints.miti)).then(r => r.json())
        ]);

        const parser = new DOMParser();
        let liveIpos = [];

        // 1. Parse Stage 4: Statistics (Listed)
        if (statRes.contents) {
            const doc = parser.parseFromString(statRes.contents, 'text/html');
            const rows = doc.querySelectorAll('#statsTable tbody tr');
            
            const formatListingDate = (dateStr) => {
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
            };

            rows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if (cols.length >= 7) {
                    const date = cols[0].innerText.trim();
                    const symbol = cols[2].innerText.trim();
                    const listingDate = cols[3].innerText.trim();
                    
                    let year = 2026;
                    if (listingDate && listingDate !== 'TBA') {
                        const yr = parseInt(listingDate.split('-').pop());
                        if (yr) year = yr;
                    } else if (date) {
                        const yr = parseInt(date.split('-')[0]);
                        if (yr) year = yr;
                    }

                    const ipoPrice = parseFloat(cols[4].innerText) || parseFloat(cols[1].innerText) || 0;
                    const currentPrice = parseFloat(cols[5].innerText) || 0;
                    
                    const scPerfText = cols[7].innerText.trim().replace('%', '');
                    const scPerf = parseFloat(scPerfText) || 0;
                    
                    const soPerfText = cols[6].innerText.trim().replace('%', '');
                    const soPerf = parseFloat(soPerfText) || 0;
                    
                    const open = ipoPrice * (1 + soPerf / 100);
                    const close = ipoPrice * (1 + scPerf / 100);

                    liveIpos.push({
                        id: symbol.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        companyName: symbol,
                        symbol: symbol,
                        stage: 5,
                        price: ipoPrice,
                        openPrice: open,
                        currentPrice: currentPrice || close,
                        closePrice: close || currentPrice,
                        year: year,
                        status: 'Listed',
                        listingDate: formatListingDate(listingDate) || date
                    });
                }
            });
        }

        // 2. Parse Stage 3: Upcoming (Application Open)
        if (upRes.contents) {
            const doc = parser.parseFromString(upRes.contents, 'text/html');
            const cards = doc.querySelectorAll('.f-ipo-card');
            cards.forEach(card => {
                const title = card.querySelector('.card-title')?.innerText.trim() || '';
                const titleParts = title.split('|');
                const symbol = titleParts[0].trim();
                const name = titleParts[1] ? titleParts[1].trim() : symbol;
                
                let market = '', price = 0, closingDate = '', listingDate = '', shariah = false;
                const details = card.querySelectorAll('span.font-weight-bold');
                details.forEach(span => {
                    const label = span.innerText.toLowerCase();
                    const val = span.nextElementSibling?.innerText.trim() || '';
                    if (label === 'market:') market = val;
                    if (label.includes('listing price')) price = parseFloat(val);
                    if (label.includes('closing date')) closingDate = val;
                    if (label.includes('listing date')) listingDate = val;
                    if (label.includes('shariah')) shariah = val.toLowerCase().includes('yes');
                });

                let targetStage = 3;
                let targetStatus = 'Application Open';
                if (!price || price === 0 || !closingDate || closingDate.toLowerCase().includes('tba')) {
                    targetStage = 1;
                    targetStatus = 'Draft / Exposure Phase';
                }

                liveIpos.push({
                    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    symbol: symbol,
                    companyName: name,
                    market: market.includes('ACE') ? 'ACE Market' : (market.includes('Main') ? 'Main Market' : market),
                    price: price,
                    closingDate: closingDate,
                    listingDate: listingDate,
                    shariah: shariah,
                    stage: targetStage,
                    status: targetStatus
                });
            });
        }

        // 3. Parse Stage 2: MITI and Stage 1: Draft
        if (mitiRes.contents) {
            const doc = parser.parseFromString(mitiRes.contents, 'text/html');
            
            // iSaham uses h5 for company names in the MITI section
            const headers = doc.querySelectorAll('h4, h5');
            let currentSection = '';
            
            headers.forEach(el => {
                const text = el.innerText.trim();
                if (el.tagName.toLowerCase() === 'h4') {
                    if (text.includes('MITI IPO') || text.includes('Upcoming Listing')) currentSection = 'MITI';
                    else if (text.includes('Future IPO')) currentSection = 'Draft';
                } else if (el.tagName.toLowerCase() === 'h5' && currentSection) {
                    const name = text;
                    const stage = currentSection === 'MITI' ? 2 : 1;
                    const status = currentSection === 'MITI' ? 'MITI Stage' : 'Draft / Exposure';
                    
                    if (!liveIpos.some(i => i.companyName.toLowerCase().includes(name.toLowerCase().substring(0, 10)))) {
                        liveIpos.push({
                            id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                            companyName: name,
                            stage: stage,
                            status: status,
                            price: 0
                        });
                    }
                }
            });
        }

        // 4. HYBRID MERGE: Combine Live Data with Enrichment Data & Deduplicate
        const finalData = [];
        liveIpos.forEach(live => {
            const enrichment = IPO_DATA.find(e => {
                const cleanLive = live.companyName.toLowerCase().replace(/berhad|bhd|group|holdings|corp/g, '').replace(/[^a-z0-9]/g, '');
                const cleanEnrich = e.companyName.toLowerCase().replace(/berhad|bhd|group|holdings|corp/g, '').replace(/[^a-z0-9]/g, '');
                
                const symbolMatch = (live.symbol && e.symbol && live.symbol.toUpperCase() === e.symbol.toUpperCase()) ||
                                   (live.companyName.toUpperCase() === e.symbol?.toUpperCase());
                
                return cleanLive.includes(cleanEnrich) || cleanEnrich.includes(cleanLive) || symbolMatch;
            });

            let mergedItem = live;
            if (enrichment) {
                mergedItem = { 
                    ...enrichment, 
                    ...live, 
                    companyName: enrichment.companyName, // Keep the nice manual name
                    stage: enrichment.stage === 5 ? 5 : live.stage, 
                    closingDate: live.closingDate || enrichment.closingDate,
                    listingDate: live.listingDate || enrichment.listingDate,
                    currentPrice: live.currentPrice || enrichment.currentPrice 
                };
            }

            // Deduplicate in finalData: keep/merge and prioritize higher stage
            const existingIdx = finalData.findIndex(f => f.id === mergedItem.id);
            if (existingIdx !== -1) {
                const existing = finalData[existingIdx];
                const higherStage = Math.max(existing.stage || 0, mergedItem.stage || 0);
                finalData[existingIdx] = {
                    ...existing,
                    ...mergedItem,
                    stage: higherStage,
                    status: higherStage === 5 ? 'Listed' : (higherStage === 4 ? 'Closed' : existing.status)
                };
            } else {
                finalData.push(mergedItem);
            }
        });

        // Add leftovers from IPO_DATA that weren't in the live scrape
        IPO_DATA.forEach(e => {
            const alreadyIn = finalData.some(f => f.id === e.id);
            if (!alreadyIn) {
                finalData.push(e);
            }
        });

        autoPromoteIPOs(finalData);

        // 6. NOTIFICATION SYSTEM: Detect New Listings
        if (ipoData.length > 0) {
            const currentIds = new Set(ipoData.map(i => i.id));
            const newIpos = finalData.filter(f => !currentIds.has(f.id));
            if (newIpos.length > 0) {
                console.log('🔔 New IPOs detected!', newIpos);
                playNotificationSound();
                showToast(`New IPO Detected: ${newIpos[0].companyName}`);
            }
        }

        // Restore any local persistence
        const savedPrices = JSON.parse(localStorage.getItem('ipo_live_prices') || '{}');
        const huntedData = JSON.parse(localStorage.getItem('ipo_hunted_data') || '{}');

        finalData.forEach(ipo => {
            if (savedPrices[ipo.id]) {
                ipo.currentPrice = savedPrices[ipo.id].currentPrice || ipo.currentPrice;
            }
            if (huntedData[ipo.id]) {
                ipo.os = huntedData[ipo.id].os || ipo.os;
                ipo.avgTP = huntedData[ipo.id].avgTP || ipo.avgTP;
                ipo.pe = huntedData[ipo.id].pe || ipo.pe;
                ipo.research = huntedData[ipo.id].research || ipo.research;
            }
        });

        ipoData = finalData;
        renderIPOs(currentStage);
        setTimeout(() => { checkPriceAlerts(); }, 500);
        
        // Trigger deep sync for missing OS/TP
        triggerDeepSync();
        
        const timeStr = new Date().toLocaleTimeString();
        if(timeHeader) timeHeader.innerHTML = `<span style="color:#10b981; font-weight:bold;">LIVE SYNCED (${timeStr})</span>`;

    } catch (e) {
        console.error('Fetch failed:', e);
        if(timeHeader) timeHeader.innerHTML = `<span style="color:#ef4444;">Offline Mode</span>`;
    }
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.warn('Audio play failed', e);
    }
}

function showToast(message) {
    let toast = document.getElementById('ipo-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ipo-toast';
        toast.style.cssText = `
            position: fixed; bottom: 2rem; right: 2rem; 
            background: var(--primary); color: white; 
            padding: 1rem 2rem; border-radius: 0.5rem; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            z-index: 9999; transform: translateY(100px);
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex; align-items: center; gap: 0.75rem;
            border-left: 4px solid #10b981;
        `;
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `<i data-lucide="bell-ring"></i> <span>${message}</span>`;
    if(typeof lucide !== 'undefined') lucide.createIcons();
toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.transform = 'translateY(150px)';
    }, 5000);
}

async function triggerDeepSync() {
    const missing = ipoData.filter(ipo => ipo.stage >= 3 && (!ipo.os || !ipo.avgTP));
    if (missing.length === 0) return;
    
    console.log(`Deep Hunter: Probing ${missing.length} IPOs for missing data...`);
    
    // Process in batches of 3 to avoid rate limiting
    for (let i = 0; i < missing.length; i += 3) {
        const batch = missing.slice(i, i + 3);
        await Promise.all(batch.map(ipo => autoHuntData(ipo)));
    }
}

// --- SYNC HUB UI ---
function openSyncHub() {
    const hub = document.createElement('div');
    hub.id = 'sync-hub-modal';
    hub.className = 'modal-overlay';
    hub.innerHTML = `
        <div class="modal-content glass-card" style="max-width: 600px; padding: 2.5rem; border: 1px solid rgba(16, 185, 129, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: #10b981; padding: 0.5rem; border-radius: 0.5rem; color: white;">
                        <i data-lucide="refresh-cw"></i>
                    </div>
                    <h2 style="margin: 0;">Hunter <span>Sync Hub</span></h2>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" class="close-btn">&times;</button>
            </div>
            
            <div style="display: grid; gap: 1.5rem; margin-bottom: 2rem;">
                <div class="sync-item" id="sync-draft">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Stage 1: Draft / Exposure</span>
                        <span class="status-label">Checking...</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
                <div class="sync-item" id="sync-miti">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Stage 2: MITI Applications</span>
                        <span class="status-label">Checking...</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
                <div class="sync-item" id="sync-public">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Stage 3: Public Subscription</span>
                        <span class="status-label">Checking...</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
                <div class="sync-item" id="sync-deep">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Deep Hunter: OS & Fair Value</span>
                        <span class="status-label">Ready</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
            </div>

            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 1rem; border-radius: 0.75rem; font-size: 0.85rem; color: #f59e0b; margin-bottom: 2rem;">
                <i data-lucide="info" style="width: 16px; display: inline-block; vertical-align: middle;"></i>
                <strong>Note:</strong> Browser sync updates the UI temporarily. Run <code>node sync-isaham.js</code> in your terminal for permanent file updates.
            </div>

            <button onclick="runMasterSync(this)" class="btn-moomoo hero-cta" style="width: 100%; height: 3.5rem; font-size: 1.1rem;">
                <i data-lucide="zap"></i> Start Full Online Sync
            </button>
        </div>
    `;
    document.body.appendChild(hub);
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

async function runMasterSync(btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Syncing...`;
    if(typeof lucide !== 'undefined') lucide.createIcons();

    const stages = ['sync-draft', 'sync-miti', 'sync-public', 'sync-deep'];
    
    for (const id of stages) {
        const item = document.getElementById(id);
        item.querySelector('.status-label').innerText = 'Syncing...';
        item.querySelector('.progress').style.width = '50%';
        item.querySelector('.progress').style.background = '#6366f1';
        
        // Small delay to feel real
        await new Promise(r => setTimeout(r, 800));
        
        if (id === 'sync-deep') {
            await triggerDeepSync();
        } else {
            await fetchLiveUpdates();
        }

        item.querySelector('.status-label').innerText = 'Completed';
        item.querySelector('.progress').style.width = '100%';
        item.querySelector('.progress').style.background = '#10b981';
    }

    btn.innerHTML = `<i data-lucide="check-circle"></i> Sync Complete!`;
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="zap"></i> Start Full Online Sync`;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }, 3000);
}

async function autoHuntData(ipo) {
    if (!ipo.companyName) return;
    
    const proxy = 'https://api.allorigins.win/get?url=';
    const stem = ipo.companyName.toLowerCase().replace(/berhad|bhd|group|holdings/g, '').trim().replace(/\s+/g, '-');
    const ticker = ipo.symbol ? ipo.symbol.toLowerCase() : stem;
    
    const urls = [
        `https://www.isaham.my/ipo/${stem}`,
        `https://www.isaham.my/ipo-insights/${stem}`,
        `https://www.isaham.my/stock/${ticker}/insights`
    ];
    
    console.log(`🚀 Deep Hunter probing for ${ipo.companyName}...`);
    
    for (const url of urls) {
        try {
            const res = await fetch(proxy + encodeURIComponent(url));
            const json = await res.json();
            if (!json.contents) continue;

            const html = json.contents;
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const text = doc.body.innerText;

            // 1. Hunt for OS (Oversubscription)
            if (!ipo.os || ipo.os === 0) {
                const osMatch = text.match(/Oversubscription rate:\s*(\d+\.\d+)x/i) || 
                              text.match(/subscribed by\s*(\d+\.\d+)\s*times/i) ||
                              text.match(/OS Rate:\s*(\d+\.\d+)/i);
                if (osMatch) {
                    ipo.os = parseFloat(osMatch[1]);
                    ipo.isAutoOS = true;
                    console.log(`✨ OS Found: ${ipo.os}x for ${ipo.id}`);
                }
            }

            // 2. Hunt for Target Price / Fair Value
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

            if (foundTP && (!ipo.avgTP || ipo.avgTP === 0)) {
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
                console.log(`✨ TP Found: RM ${foundTP} for ${ipo.id}`);
            }

            // 3. Hunt for P/E Ratio
            if (!ipo.pe || ipo.pe === 0) {
                const peMatch = text.match(/P\/E Ratio:\s*(\d+\.\d+)/i) || text.match(/PE:\s*(\d+\.\d+)/i);
                if (peMatch) {
                    ipo.pe = parseFloat(peMatch[1]);
                    ipo.isAutoPE = true;
                    console.log(`✨ PE Found: ${ipo.pe} for ${ipo.id}`);
                }
            }

            // Sync with Persistence
            const savedData = JSON.parse(localStorage.getItem('ipo_hunted_data') || '{}');
            savedData[ipo.id] = {
                os: ipo.os,
                avgTP: ipo.avgTP,
                pe: ipo.pe,
                research: ipo.research,
                isAutoOS: ipo.isAutoOS,
                isAutoTP: ipo.isAutoTP,
                isAutoPE: ipo.isAutoPE
            };
            localStorage.setItem('ipo_hunted_data', JSON.stringify(savedData));

        } catch (e) {
            console.warn(`Deep hunt failed for ${url}`, e);
        }
    }
    
    // Refresh UI if data was found
    renderIPOs(currentStage);
}

// Global Trigger: Run deep hunt on any Stage 3 or 4 IPO missing OS/TP
function triggerDeepSync() {
    console.log('🔍 Starting Global Deep Sync...');
    ipoData.forEach(ipo => {
        if ((ipo.stage === 3 || ipo.stage === 5) && (!ipo.os || !ipo.avgTP)) {
            autoHuntData(ipo);
        }
    });
}

// Robust date parser - handles all formats from iSaham and data.js
// "08-May-2026", "13-Feb-2026", "2026-05-08", "08 May 2026", "06 May", ISO strings
function parseFlexDate(str) {
    if (!str) return null;
    // Already a valid ISO/JS date string like "2026-05-08" or "2026-05-08T17:00:00"
    const iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso;
    // Handle "08-May-2026" or "13-Feb-2026" (DD-MMM-YYYY)
    const dashMonth = str.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
    if (dashMonth) return new Date(`${dashMonth[2]} ${dashMonth[1]}, ${dashMonth[3]}`);
    // Handle "08 May 2026" (DD MMM YYYY) - iSaham format
    const fullDate = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (fullDate) return new Date(`${fullDate[2]} ${fullDate[1]}, ${fullDate[3]}`);
    // Handle "06 May" (no year — assume current year)
    const shortMonth = str.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
    if (shortMonth) return new Date(`${shortMonth[2]} ${shortMonth[1]}, ${new Date().getFullYear()}`);
    return null;
}

function autoPromoteIPOs(finalData) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    finalData.forEach(ipo => {
        // Skip auto-promotion if manually set to Stage 5 (Listed)
        if (ipo.stage === 5) return;
        
        if (ipo.year && ipo.year < 2026) {
            ipo.stage = 5;
            ipo.status = 'Listed';
        }

        if (ipo.stage >= 3) {
            // Auto-promote to Listed if listingDate has passed
            if (ipo.listingDate) {
                const listDate = parseFlexDate(ipo.listingDate);
                if (listDate) {
                    listDate.setHours(0, 0, 0, 0);
                    if (listDate <= today) {
                        ipo.stage = 5;
                        ipo.status = 'Listed';
                    } else if (ipo.closingDate) {
                        const closeDate = parseFlexDate(ipo.closingDate);
                        if (closeDate && closeDate < now) {
                            ipo.stage = 4;
                            ipo.status = 'Pre-Listing';
                        } else if (closeDate) {
                            ipo.stage = 3;
                            ipo.status = 'Application Open';
                        }
                    }
                }
            } else if (ipo.closingDate) {
                const closeDate = parseFlexDate(ipo.closingDate);
                if (closeDate && closeDate < now) {
                    ipo.stage = 4;
                    ipo.status = 'Pre-Listing';
                }
            }
        }
    });
}


const ipoGrid = document.getElementById('ipo-grid');
const tabBtns = document.querySelectorAll('.tab-btn');

// Helper: compute opening performance dynamically
function getOpenPerformance(ipo) {
    if (!ipo.openPrice || !ipo.price || ipo.price === 0) return 0;
    return ((ipo.openPrice - ipo.price) / ipo.price) * 100;
}

function getBestSortDate(ipo) {
    let dateStr = ipo.listingDate || ipo.closingDate || ipo.openingDate;
    if (dateStr) {
        const parsed = parseFlexDate(dateStr);
        if (parsed && !isNaN(parsed.getTime())) {
            return parsed.getTime();
        }
    }
    if (ipo.year) {
        return new Date(ipo.year, 0, 1).getTime();
    }
    return 0;
}

function getOpenPerfString(ipo) {
    const perf = getOpenPerformance(ipo);
    return (perf >= 0 ? '+' : '') + perf.toFixed(1) + '%';
}

// Helper: tolerance-based float comparison
function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

// Update tab counts
function updateTabCounts() {
    tabBtns.forEach(btn => {
        const stage = parseInt(btn.dataset.stage);
        const count = ipoData.filter(ipo => ipo.stage === stage).length;
        let countEl = btn.querySelector('.tab-count');
        if (!countEl) {
            countEl = document.createElement('span');
            countEl.className = 'tab-count';
            btn.querySelector('.tab-label').appendChild(countEl);
        }
        countEl.textContent = count + ' IPO' + (count !== 1 ? 's' : '');
    });
}

function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated', reason: 'Market classification unknown.' };
    
    // If it's listed (Stage 5) but does not have an open price yet (still listing morning / data pending),
    // treat its stage as Stage 4 (subscription results in, waiting for debut).
    const effectiveStage = (ipo.stage === 5 && !ipo.openPrice) ? 4 : ipo.stage;
    
    const os = ipo.os || 0;
    const hasOsData = ipo.os !== undefined && ipo.os !== null && ipo.os > 0; 
    
    // PRIORITY 1: Respect manual Predicted Grade from data.js if it exists (only pre-listing before subscription results)
    if (ipo.predictedGrade && effectiveStage < 4) {
        return { 
            grade: ipo.predictedGrade, 
            reason: ipo.analystInsight || 'Manual rating applied.' 
        };
    }

    const perf = ipo.performance || '';
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
    
    const isPositiveOpen = ipo.openPrice && ipo.price && ipo.openPrice > ipo.price;
    const openPremium = (ipo.openPrice && ipo.price) ? ((ipo.openPrice - ipo.price) / ipo.price) * 100 : 0;
    const isStrongGreen = openPremium >= 5.0;
    const isFlat = ipo.openPrice && ipo.price && floatEquals(ipo.openPrice, ipo.price);
    const isHighPE = pe > 18.0;
    const isAttractivePE = pe > 0 && pe < 12.0;
    const isRed = (ipo.openPrice && ipo.price) ? (ipo.openPrice < ipo.price) : false;

    const isMainMarket = ipo.market && ipo.market.toLowerCase().includes('main');
    const isAceMarket = !isMainMarket;

    if (effectiveStage < 5 && os === 0) {
        // Calculate Pre-OS Grade
        let score = 0;
        if (isSuperHero) score += 50;
        else if (isHero) score += 40;
        else if (isTopTier) score += 30;
        else if (isMomentum) score += 20;
        
        if (isFlatSkew) score -= 15;
        
        if (isTrendingSector) score += 30;
        if (isExpansionFund) score += 20;
        
        if (isMainMarket) score += 10;
        else if (isAceMarket) score += 5;

        // Price sweet spot scoring
        if (ipo.price >= 0.30 && ipo.price <= 0.50) {
            score += 15; // Retail sweet spot
        } else if (ipo.price >= 0.75 && ipo.price <= 1.00) {
            score += 15; // Growth sweet spot
        } else if (ipo.price > 0 && ipo.price < 0.20) {
            score -= 15; // Penny stock penalty
        } else if (ipo.price > 1.00) {
            score -= 15; // High-ticket stock penalty
        }

        // Geography premium scoring
        const geo = (ipo.geography || '').toLowerCase();
        if (geo === 'penang' && isTrendingSector) {
            score += 20; // Penang Silicon Valley Premium for Tech/Semicon
        } else if (geo === 'johor' || geo === 'melaka') {
            score -= 5; // Dorman geography penalty
        }

        // OFS and PE Valuation Adjustments
        if (ipo.ofs === true) {
            score -= 15; // OFS risk penalty
        }
        if (pe > 0 && pe < 13.0) {
            score += 15; // Cheap/Attractive valuation bonus
        } else if (pe > 0 && pe < 18.0) {
            score += 5;  // Reasonable valuation bonus
        } else if (pe > 22.0) {
            score -= 10; // Expensive valuation penalty
        }

        let predGrade = 'C';
        if (score >= 70) predGrade = 'A';
        else if (score >= 40) predGrade = 'B';

        // Special case for Automation
        if (sector.includes('automation') && predGrade === 'B') {
            return { 
                grade: `Pred: B`, 
                reason: `<b>Pre-OS Grade B</b> (Score: ${score})<br>💡 Note: If classified as Tech/Semi, jumps to Grade A.<br>⏳ Waiting for OS data.` 
            };
        }

        return { 
            grade: `Pred: ${predGrade}`, 
            reason: `<b>Pre-OS Grade ${predGrade}</b> (Score: ${score}/100)<br>⏳ Waiting for OS data.` 
        };
    }
    
    // Stage 3 & 4 - Subscription Results In
    if ((effectiveStage === 3 || effectiveStage === 4) && os > 0) {
        if (isMainMarket) {
            const isTopIB = heroIBs.some(tier => ib.includes(tier));
            if (os >= 20 && isTopIB) return { grade: 'A', reason: '<b>Grade A (The Giants):</b><br>🚀 Institutional interest (OS > 20x)<br>🏛️ Top-tier IB backing' };
            if (os >= 20) return { grade: 'B', reason: '<b>Strong Demand:</b><br>✅ Institutional interest (OS > 20x)' };
            if (os >= 5) return { grade: 'B', reason: '<b>Moderate Interest:</b><br>✅ Main Market stability' };
            return { grade: 'C', reason: '<b>Low Momentum:</b><br>⚠️ Low subscription interest' };
        }

        if (isAceMarket) {
            const reasonParts = [];
            if (os >= 50) reasonParts.push(`🚀 Exceptional Demand (${os}x)`);
            else if (os >= 20) reasonParts.push(`✅ High Demand (${os}x)`);
            else reasonParts.push(`⚠️ Low Demand (${os}x)`);

            if (isMomentum || isTopTier || isHero) reasonParts.push(`⚡ ${ipo.ib} (Momentum IB)`);
            if (isTrendingSector) reasonParts.push(`🔥 Trending Sector (${ipo.sector})`);
            if (isAttractivePE) reasonParts.push(`💎 Attractive P/E (${pe}x)`);
            if (isExpansionFund) reasonParts.push(`📈 Expansion Fund Use`);

            if (os >= 20) return { grade: 'B', reason: reasonParts.join('<br>') };
            return { grade: 'C', reason: '<b>Low Momentum:</b><br>⚠️ Low oversubscription (< 20x)' };
        }
    }

    if (isMainMarket) {
        if (isHero && (isStrongGreen || isFlat)) return { grade: 'A', reason: '<b>Elite Setup:</b><br>🏛️ Hero IB Support<br>✅ Positive Day 1 Debut' };
        
        if (effectiveStage === 5 && !hasOsData && isStrongGreen) {
            if ((isTopTier || isMomentum) && !isHighPE) return { grade: 'A', reason: '<b>Momentum Setup:</b><br>✅ Strong Open<br>📊 Healthy Valuation' };
            if (pe > 0 && pe < 15 && isStrongGreen) return { grade: 'A', reason: '<b>Value Pick:</b><br>💎 Low PE (${pe}x)<br>🚀 Strong Momentum' };
        }
        
        if (isHighPE && isRed) return { grade: 'C', reason: '<b>High Risk:</b><br>❌ Expensive Valuation<br>📉 Negative Performance' };
        if (isFlat && !isHero) return { grade: 'C', reason: '<b>Lack of Support:</b><br>⚠️ Flat debut without Hero IB' };
        
        if (isStrongGreen && pe > 0 && pe < 15 && (isTopTier || isMomentum)) return { grade: 'A', reason: '<b>Solid Performance:</b><br>🚀 Strong Debut<br>💎 Attractive PE' };
        
        if (isPositiveOpen && pe > 0 && pe < 15 && (isTopTier || isMomentum || isHero)) return { grade: 'B', reason: '<b>Safe Entry:</b><br>📊 Good Valuation<br>🏛️ Reputable IB' };
        
        if (hasOsData && os < 10 && !isHero && !isStrongGreen) return { grade: 'C', reason: '<b>Weak Setup:</b><br>⚠️ Low Demand<br>❌ Poor Opening' };
        if (isHighPE) return { grade: 'C', reason: '<b>Premium Risk:</b><br>⚠️ PE > 18x' };
        if (isRed) return { grade: 'C', reason: '<b>Sentiment Risk:</b><br>📉 Negative Market Reaction' };
        
        if (os >= 20 && (isTopTier || isHero) && isStrongGreen) return { grade: 'A', reason: '<b>High Demand:</b><br>🚀 OS > 20x<br>🏛️ Strong Support' };
        if (isStrongGreen && !isHighPE) return { grade: 'A', reason: '<b>Positive Debut:</b><br>✅ Healthy setup' };
        return { grade: 'C', reason: '<b>Caution:</b><br>⚠️ Moderate demand/valuation' };
    }

    if (isAceMarket) {

        const reasonParts = [];
        if (os >= 50) reasonParts.push(`🚀 Exceptional Demand (${os}x)`);
        else if (os >= 20) reasonParts.push(`✅ High Demand (${os}x)`);
        
        if (isMomentum || isTopTier || isHero) reasonParts.push(`⚡ ${ipo.ib} Backing`);
        if (isTrendingSector) reasonParts.push(`🔥 Trending Sector`);
        if (isAttractivePE) reasonParts.push(`💎 Attractive P/E (${pe}x)`);
        if (isExpansionFund) reasonParts.push(`📈 Expansion Fund Use`);
        if (isStrongGreen) reasonParts.push(`🚀 Strong Opening`);

        if (os >= 50 && isStrongGreen) return { grade: 'A', reason: '<b>Grade A (Exceptional Demand):</b><br>' + reasonParts.join('<br>') };
        if (isHero && isStrongGreen && os >= 3) return { grade: 'B', reason: reasonParts.join('<br>') };
        
        if (effectiveStage === 5 && !hasOsData && isStrongGreen) {
            if ((isMomentum || isTopTier || isHero) && !isHighPE) return { grade: 'B', reason: reasonParts.join('<br>') };
        }
        
        if (isHighPE) {
            if (os >= 50 && (isMomentum || isTopTier || isHero)) return { grade: 'B', reason: '<b>Demand Rescue:</b><br>' + reasonParts.join('<br>') };
            if (pe > 28.0) return { grade: 'C', reason: '<b>Extreme Risk:</b><br>❌ PE > 28x' };
            if (os < 20) return { grade: 'C', reason: '<b>Valuation Risk:</b><br>⚠️ High PE + Low Demand' };
        }
        
        if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return { grade: 'B', reason: reasonParts.join('<br>') };
        if (os >= 20 && isStrongGreen) return { grade: 'B', reason: reasonParts.join('<br>') };
        
        if (isFlat && os < 20) return { grade: 'C', reason: '<b>No Momentum:</b><br>⚠️ Flat open + Low Demand' };
        if (hasOsData && os < 10 && !isHero) return { grade: 'C', reason: '<b>Weak Appetite:</b><br>⚠️ Low OS' };
        if (!hasOsData && !isStrongGreen) return { grade: 'C', reason: '<b>Unknown Setup:</b><br>⚠️ Missing data' };
        
        if (isStrongGreen && !isHighPE) return { grade: 'B', reason: reasonParts.join('<br>') };
        return { grade: 'C', reason: '<b>Avoid:</b><br>❌ Lack of momentum' };
    }
    return { grade: 'Unrated', reason: 'Insufficient data for grading.' };
}

function getIpoStrategy(ipo) {
    // Dynamic Strategy Update: If the stock is currently crashing, override the initial strategy
    const holdPerf = (ipo.currentPrice && ipo.price) ? ((ipo.currentPrice - ipo.price) / ipo.price) * 100 : 0;
    if (ipo.stage === 5 && holdPerf < -10) return 'Wait / Exit (Risk)';

    const gradeObj = getIpoGrade(ipo);
    const grade = gradeObj.grade;
    if (grade === 'Pending') return 'Wait for OS';
    
    if (grade === 'C') {
        const perf = ipo.performance || '';
        const isGreenOpen = !perf.includes('-') && ipo.openPrice > ipo.price;
        if (isGreenOpen) return 'Scalp Only';
        return 'Skip / Elak';
    }
    
    if (grade === 'A') {
        const os = ipo.os || 0;
        const hasOsData = ipo.os !== undefined && ipo.os !== null;
        // Grade A with low OS (rescued) is safer for Scalp than Swing
        if (hasOsData && os < 15) return 'Scalp (Take Profit)';
        return 'Swing (Strong Setup)';
    }
    
    if (grade === 'B') {
        const os = ipo.os || 0;
        const pe = ipo.pe || 0;
        const ib = (ipo.ib || '').toLowerCase();
        const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
        const isTopIB = topTierIBs.some(tier => ib.includes(tier));

        if (os > 40 && pe < 15 && isTopIB) return 'Swing (High Conviction)';
        if (os > 20) return 'Scalping (9:00 - 9:30 AM)';
        return 'Scalp Only';
    }
    
    return ipo.strategy || 'N/A';
}

function getBoomPrediction(ipo) {
    if ((ipo.stage !== 3 && ipo.stage !== 4)) return null;

    let score = 0;
    const os = ipo.os || 0;
    const pe = ipo.pe || 0;
    const market = (ipo.market || '').toLowerCase();
    const ib = (ipo.ib || '').toLowerCase();
    const sector = (ipo.sector || '').toLowerCase();
    const insight = (ipo.analystInsight || '').toLowerCase();

    // 1. Oversubscription (OS) - Max 40%
    if (os >= 100) score += 40;
    else if (os >= 50) score += 30;
    else if (os >= 20) score += 15;

    // 2. IB Backing - Max 20%
    const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
    const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
    const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];

    if (heroIBs.some(t => ib.includes(t))) score += 20;
    else if (topTierIBs.some(t => ib.includes(t))) score += 15;
    else if (momentumIBs.some(t => ib.includes(t))) score += 10;

    // 3. Sector Trending - Max 20%
    const trending = ["data centre", "data center", "solar", "ai", "technology", "semiconductor", "renewable", "ev", "digital", "power", "energy", "infrastructure"];
    if (trending.some(s => sector.includes(s) || insight.includes(s))) score += 20;

    // 4. Valuation - Max 20%
    if (pe > 0 && pe < 12) score += 20;
    else if (pe > 0 && pe < 18) score += 10;

    // Market Multiplier
    if (market.includes('ace')) score += 5;
    
    // Final Tweak: Main Market giants are stable but rarely "boom" >100% on day 1
    if (market.includes('main') && score > 70) score = 70;

    score = Math.min(score, 99);

    let label = 'Moderate';
    let color = '#a5b4fc';
    if (score >= 70) { label = 'High (Boom Potential)'; color = '#10b981'; }
    else if (score >= 40) { label = 'Strong Momentum'; color = '#f59e0b'; }
    else if (score < 30) { label = 'Low Confidence'; color = '#ef4444'; }

    return { score, label, color, isPreliminary: os === 0 };
}
function checkMissingListings() {
    const bannerContainer = document.getElementById('reminder-banner-container');
    if (!bannerContainer) return;
    
    // Disabled per user request: user prefers not to do manual entry for scalping
    bannerContainer.innerHTML = '';
    return;
    
    const now = new Date();
    // Look for Stage 4 IPOs with a listing date that is <= today, but no openPrice
    const missing = ipoData.filter(ipo => {
        // Must be stage 5 (Listed stage)
        if (ipo.stage === 5 && ipo.listingDate && typeof ipo.openPrice === 'undefined') {
            const listDate = new Date(ipo.listingDate);
            const today = new Date();
            
            // Set both times to midnight for fair comparison
            listDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);

            // Calculate the difference in days
            const diffTime = today - listDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Only alert if the listing was in the last 7 days
            return listDate <= today && diffDays <= 7;
        }
        return false;
    });

    if (missing.length > 0) {
        const names = missing.map(m => m.companyName).join(', ');
        bannerContainer.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-left: 4px solid #ef4444; padding: 1rem 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; margin-top: 2rem;">
                <i data-lucide="alert-triangle" style="color: #ef4444; width: 24px; height: 24px; flex-shrink: 0;"></i>
                <div>
                    <h4 style="color: #ef4444; margin: 0 0 0.25rem 0; font-size: 1.05rem;">Listing Day Action Required!</h4>
                    <p style="margin: 0; color: var(--text-main); font-size: 0.95rem;">Please update the opening price for: <strong>${names}</strong> in <code style="background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px;">data.js</code></p>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        bannerContainer.innerHTML = '';
    }
}


function renderIPOs(stage) {
    ipoGrid.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Fetching real-time data...</p>
        </div>
    `;

    // Update tab counts whenever we render
    if (ipoData.length > 0) updateTabCounts();

    setTimeout(() => {
        try {
            const stageNum = parseInt(currentStage || stage || 1);
            const filtered = ipoData.filter(ipo => ipo.stage === stageNum);

            if (filtered.length === 0) {
                updateIpoCount(0, 0);
                ipoGrid.innerHTML = `
                    <div class="loading-state">
                        <i data-lucide="inbox" style="width: 48px; height: 48px; color: var(--primary-light); margin-bottom: 0.5rem;"></i>
                        <p>No IPOs currently in this stage.</p>
                    </div>
                `;
                if(typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            let displayData = filtered;
            if (typeof selectedGrades !== 'undefined') {
                displayData = displayData.filter(ipo => {
                    const cleanGrade = getIpoGrade(ipo).grade.replace('Pred: ', '').trim();
                    return selectedGrades.includes(cleanGrade);
                });
            }
            
            if (typeof currentYear !== 'undefined' && currentYear !== 'all') {
                displayData = displayData.filter(ipo => ipo.year === parseInt(currentYear));
            }

            if (currentSearch) {
                const searchLower = currentSearch.toLowerCase();
                displayData = displayData.filter(ipo => 
                    ipo.companyName.toLowerCase().includes(searchLower) || 
                    ipo.sector.toLowerCase().includes(searchLower)
                );
            }

            // Sorting Logic — use computed performance for sorting
            displayData.sort((a, b) => {
                if (currentSort === 'performance-desc') {
                    const perfA = getOpenPerformance(a) || -999;
                    const perfB = getOpenPerformance(b) || -999;
                    return perfB - perfA;
                } else if (currentSort === 'performance-asc') {
                    const perfA = getOpenPerformance(a) || 999;
                    const perfB = getOpenPerformance(b) || 999;
                    return perfA - perfB;
                } else if (currentSort === 'name-asc') {
                    return a.companyName.localeCompare(b.companyName);
                } else {
                    const dateA = getBestSortDate(a);
                    const dateB = getBestSortDate(b);
                    if (dateA !== dateB) return dateB - dateA;
                    return a.companyName.localeCompare(b.companyName);
                }
            });

            // Update IPO count display
            updateIpoCount(displayData.length, filtered.length);

            if (displayData.length === 0) {
                ipoGrid.innerHTML = `
                    <div class="loading-state">
                        <i data-lucide="search-x" style="width: 48px; height: 48px; color: var(--primary-light); margin-bottom: 0.5rem;"></i>
                        <p>No IPOs match the selected filters.</p>
                    </div>
                `;
                if(typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            ipoGrid.innerHTML = `
                <div class="table-responsive" style="width: 100%; overflow-x: auto; overflow-y: auto; max-height: 70vh; grid-column: 1 / -1; border-radius: 1rem; border: 1px solid var(--glass-border); background: var(--card-bg); backdrop-filter: blur(16px);">
                    <table class="ipo-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead style="position: sticky; top: 0; z-index: 10; background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <tr style="font-size: 0.72rem; white-space: nowrap;">
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">Company</th>
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">Date</th>
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">OS</th>
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">Price</th>
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">IPO Perf.</th>
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">Open Perf.</th>
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">Grade</th>
                                <th style="padding: 0.5rem 0.6rem; font-weight: 600; color: var(--text-dim);">Verdict</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayData.map((ipo, index) => {
                                try {
                                    return createIPOCard(ipo, index);
                                } catch(cardErr) {
                                    console.error('Error rendering card for:', ipo.companyName, cardErr);
                                    return '';
                                }
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            if(typeof lucide !== 'undefined') lucide.createIcons();
            checkMissingListings();
            renderListedSidebar();
        } catch(err) {
            console.error('renderIPOs error:', err);
            ipoGrid.innerHTML = `
                <div class="loading-state">
                    <p>Error rendering IPOs. Check console for details.</p>
                </div>
            `;
        }
    }, 400);
}

// IPO count display
function updateIpoCount(showing, total) {
    let countBar = document.getElementById('ipo-count-bar');
    if (!countBar) {
        countBar = document.createElement('div');
        countBar.id = 'ipo-count-bar';
        countBar.className = 'ipo-count-bar';
        ipoGrid.parentNode.insertBefore(countBar, ipoGrid);
    }
    if (total === 0) {
        countBar.innerHTML = '';
        return;
    }
    countBar.innerHTML = `
        <i data-lucide="layout-grid" style="width: 16px; color: var(--primary-light);"></i>
        <span>Showing <strong>${showing}</strong> of <strong>${total}</strong> IPO${total !== 1 ? 's' : ''}</span>
    `;
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function getPredictedGrade(ipo) {
    if (ipo.predictedGrade) return ipo.predictedGrade;
    if (ipo.stage !== 5) return null; // Only show predictions for listed IPOs
    
    // Simulate Stage 3 grading logic to see what it was predicted as
    const tempIpo = { ...ipo, stage: 3 };
    const gradeObj = getIpoGrade(tempIpo);
    
    if (gradeObj && gradeObj.grade && gradeObj.grade !== 'Pending' && gradeObj.grade !== 'Unrated') {
        return gradeObj.grade;
    }
    return null;
}

function renderStyledVerdict(reason, grade, ipo) {
    if (!reason) return '<span style="color: var(--text-dim);">No verdict available</span>';

    let verdictType = 'PENDING';
    let badgeText = 'PRE-OS EVALUATION';
    let badgeColor = '#818cf8'; // Indigo
    let badgeBg = 'rgba(99, 102, 241, 0.1)';
    let badgeBorder = 'rgba(99, 102, 241, 0.2)';
    let badgeIcon = 'clock';

    const reasonUpper = reason.toUpperCase();
    
    if (reasonUpper.includes('MUST BUY') || reasonUpper.includes('ELITE SETUP') || reasonUpper.includes('MUST APPLY')) {
        verdictType = 'MUST_BUY';
        badgeText = 'MUST BUY';
        badgeColor = '#c084fc'; // Purple
        badgeBg = 'rgba(139, 92, 246, 0.15)';
        badgeBorder = 'rgba(139, 92, 246, 0.3)';
        badgeIcon = 'crown';
    } else if (reasonUpper.includes('WORTH IT') || reasonUpper.includes('STRONG SETUP') || reasonUpper.includes('STRONG DEMAND') || reasonUpper.includes('SAFE ENTRY') || reasonUpper.includes('SOLID PERFORMANCE') || reasonUpper.includes('VALUE PICK')) {
        verdictType = 'WORTH_IT';
        badgeText = 'WORTH IT';
        badgeColor = '#34d399'; // Emerald
        badgeBg = 'rgba(16, 185, 129, 0.15)';
        badgeBorder = 'rgba(16, 185, 129, 0.3)';
        badgeIcon = 'shield-check';
    } else if (reasonUpper.includes('AVOID') || reasonUpper.includes('HIGH RISK') || reasonUpper.includes('EXTREME RISK') || reasonUpper.includes('WEAK SETUP')) {
        verdictType = 'AVOID';
        badgeText = 'AVOID';
        badgeColor = '#f87171'; // Red
        badgeBg = 'rgba(239, 68, 68, 0.15)';
        badgeBorder = 'rgba(239, 68, 68, 0.3)';
        badgeIcon = 'alert-triangle';
    } else if (reasonUpper.includes('OUTLIER')) {
        verdictType = 'OUTLIER';
        badgeText = 'OUTLIER';
        badgeColor = '#fbbf24'; // Amber
        badgeBg = 'rgba(245, 158, 11, 0.15)';
        badgeBorder = 'rgba(245, 158, 11, 0.3)';
        badgeIcon = 'zap';
    } else if (reasonUpper.includes('SCALP') || reasonUpper.includes('MOMENTUM')) {
        verdictType = 'SCALP';
        badgeText = 'SCALP';
        badgeColor = '#38bdf8'; // Sky Blue
        badgeBg = 'rgba(56, 189, 248, 0.15)';
        badgeBorder = 'rgba(56, 189, 248, 0.3)';
        badgeIcon = 'trending-up';
    }

    // Clean up the verdict title from the reason text so it isn't redundant
    let cleanText = reason
        .replace(/^[✅⚠️🌟🚀💎🔥⚡📈📈❌💡⏳\s\-\•\*\(\)]+/, '') // strip starting emojis
        .replace(/^<b>(WORTH IT|AVOID|MUST BUY|REMAINS A|PRE-OS GRADE|Elite Setup|Value Pick|Momentum Setup|Solid Performance|Safe Entry|Weak Setup|High Risk|Lack of Support|Extreme Risk|Demand Rescue|No Momentum|Caution)[^<]*<\/b>/i, '') // strip title tags
        .replace(/^<br\s*\/?>/i, '') // strip starting break
        .trim();

    // Split text by lines
    const lines = cleanText.split(/<br\s*\/?>|\n/i).map(l => l.trim()).filter(Boolean);

    let listHtml = '';
    let noteHtml = '';

    lines.forEach(line => {
        // If line is a note
        if (line.includes('💡') || line.toLowerCase().startsWith('note:')) {
            const noteText = line.replace(/^[💡\s\-\•]+/, '').replace(/^note:/i, '').trim();
            noteHtml = `
                <div style="margin-top: 0.4rem; padding: 0.35rem 0.5rem; background: rgba(245, 158, 11, 0.08); border-left: 2px solid #f59e0b; border-radius: 2px 4px 4px 2px; font-size: 0.7rem; color: #fde047; line-height: 1.3;">
                    ${noteText}
                </div>
            `;
        } else {
            // Render line as a stylized list item
            let lineIcon = 'check';
            let iconColor = '#34d399';
            let content = line;

            if (line.includes('❌') || line.includes('⚠️')) {
                lineIcon = 'alert-circle';
                iconColor = '#f87171';
                content = line.replace(/^[❌⚠️\s\-\•]+/, '');
            } else if (line.includes('🚀') || line.includes('🔥') || line.includes('⚡')) {
                lineIcon = 'zap';
                iconColor = '#fbbf24';
                content = line.replace(/^[🚀🔥⚡\s\-\•]+/, '');
            } else if (line.includes('💎') || line.includes('💰')) {
                lineIcon = 'sparkles';
                iconColor = '#38bdf8';
                content = line.replace(/^[💎💰\s\-\•]+/, '');
            } else if (line.includes('⏳')) {
                lineIcon = 'clock';
                iconColor = '#a5b4fc';
                content = line.replace(/^[⏳\s\-\•]+/, '');
            } else {
                content = line.replace(/^[\s\-\•]+/, '');
            }

            listHtml += `
                <div style="display: flex; align-items: flex-start; gap: 0.35rem; margin-bottom: 0.25rem; line-height: 1.3;">
                    <i data-lucide="${lineIcon}" style="width: 11px; height: 11px; color: ${iconColor}; margin-top: 2px; flex-shrink: 0;"></i>
                    <span style="color: var(--text-main); font-size: 0.75rem;">${content}</span>
                </div>
            `;
        }
    });

    if (!listHtml && !noteHtml) {
        // Fallback if cleaning removed everything
        return `
            <div style="display: flex; flex-direction: column; gap: 0.4rem; max-width: 320px;">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i data-lucide="${badgeIcon}" style="width: 10px; height: 10px;"></i> ${badgeText}
                    </span>
                </div>
                <div style="color: var(--text-dim); font-size: 0.75rem;">${reason}</div>
            </div>
        `;
    }

    return `
        <div class="verdict-card" style="display: flex; flex-direction: column; gap: 0.4rem; max-width: 320px; text-align: left;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="${badgeIcon}" style="width: 10px; height: 10px;"></i> ${badgeText}
                </span>
            </div>
            <div style="display: flex; flex-direction: column;">
                ${listHtml}
                ${noteHtml}
            </div>
        </div>
    `;
}

function createIPOCard(ipo, index = 0) {
    let specificDetails = '';
    const statusClass = ipo.status?.toLowerCase().includes('live') ? 'live' : (ipo.status?.toLowerCase().includes('open') ? 'open' : 'pending');
    const animDelay = Math.min(index * 0.06, 0.6); // staggered animation, cap at 600ms
    const perfString = getOpenPerfString(ipo);
    const perfValue = getOpenPerformance(ipo);

    const gradeObj = getIpoGrade(ipo);
    const grade = gradeObj.grade;
    const prediction = getBoomPrediction(ipo);
    const baseGrade = grade.replace('Pred: ', '');
    const gradeColor = baseGrade === 'A' ? '#10b981' : baseGrade === 'B' ? '#f59e0b' : (baseGrade === 'Pending' ? '#a5b4fc' : '#ef4444');

    let dateDisplay = '<span style="color: var(--text-dim);">TBA</span>';
    if (ipo.stage === 3 || ipo.stage === 4) {
        const closing = ipo.closingDate ? new Date(ipo.closingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBA';
        const listing = ipo.listingDate ? (isNaN(new Date(ipo.listingDate).getTime()) ? ipo.listingDate : new Date(ipo.listingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })) : 'TBA';
        dateDisplay = `
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.8rem;">Last Date: ${closing}</div>
            <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 2px;">Listing: ${listing}</div>
        `;
    } else if (ipo.stage === 5) {
        dateDisplay = ipo.listingDate || ipo.year || 'Listed';
    }

    let priceDisplay = ipo.price > 0 ? 'RM ' + ipo.price.toFixed(2) : 'TBA';
    
    let currentOpenPrice = 'TBA';
    if (ipo.currentPrice) currentOpenPrice = 'RM ' + ipo.currentPrice.toFixed(2);
    else if (ipo.openPrice) currentOpenPrice = 'RM ' + ipo.openPrice.toFixed(2);

    let perfDisplay = '-';
    let openToNowDisplay = '-';
    if (ipo.stage === 5) {
        if (ipo.currentPrice) {
            const holdPerf = ((ipo.currentPrice - ipo.price) / ipo.price * 100);
            const isProfit = holdPerf >= 0;
            const perfColor = isProfit ? '#10b981' : '#ef4444';
            perfDisplay = `<span style="color: ${perfColor}; font-weight: 600;">${holdPerf > 0 ? '+' : ''}${holdPerf.toFixed(1)}%</span>`;
        } else if (ipo.openPrice) {
            perfDisplay = `<span style="color: ${perfValue >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${perfString}</span>`;
        }

        if (ipo.currentPrice && ipo.openPrice) {
            const openToNow = ((ipo.currentPrice - ipo.openPrice) / ipo.openPrice * 100);
            const isProfit = openToNow >= 0;
            const perfColor = isProfit ? '#10b981' : '#ef4444';
            openToNowDisplay = `<span style="color: ${perfColor}; font-weight: 600;">${openToNow > 0 ? '+' : ''}${openToNow.toFixed(1)}%</span>`;
        }
    }

    const detailsBtn = `<button onclick="showDetails('${ipo.id}')" class="btn-primary" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); border-radius: 6px; transition: 0.3s;" onmouseover="this.style.background='rgba(99, 102, 241, 0.2)'; this.style.borderColor='rgba(99, 102, 241, 0.4)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)';">Details AI</button>`;

    let actionBtn = '';
    if (ipo.stage === 3) {
        actionBtn = `
            <div style="display: flex; gap: 0.4rem; align-items: center;">
                <button onclick="alert('Apply via your Online Banking (e-IPO) menu e.g. Maybank2u, CIMB Clicks, etc.')" class="btn-primary" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; cursor: pointer; border: none; background: var(--primary);">Apply</button>
                ${detailsBtn}
            </div>`;
    } else if (ipo.stage === 2) {
        actionBtn = `
            <div style="display: flex; gap: 0.4rem; align-items: center;">
                <a href="https://sahamonline.miti.gov.my/" target="_blank" class="btn-primary" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; text-decoration: none; display: inline-block; background: #059669; border: none;">MITI</a>
                ${detailsBtn}
            </div>`;
    } else if (ipo.stage === 1) {
        actionBtn = detailsBtn;
    } else if (ipo.stage === 4) {
        actionBtn = detailsBtn;
    } else {
        actionBtn = `
            <div style="display: flex; gap: 0.4rem; align-items: center;">
                <span style="font-size: 0.75rem; color: var(--text-dim); margin-right: 0.25rem;">${getIpoStrategy(ipo)}</span>
                ${detailsBtn}
            </div>`;
    }

    // Wrap in a flex container with the price alert button for listed stocks (stage 5)
    let finalActionCol = actionBtn;

    const isSurging = ipo.price > 0 && ipo.avgTP > (ipo.price * 1.5);

    return `
        <tr class="card-animate ipo-table-row" style="animation-delay: ${animDelay}s; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            <td style="padding: 0.75rem 0.6rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <span class="badge ${ipo.market?.includes('Main') ? 'main-market' : 'ace-market'}" style="padding: 0.15rem 0.4rem; font-size: 0.65rem; min-width: 35px; text-align: center;">${ipo.market === 'Main Market' ? 'MAIN' : 'ACE'}</span>
                    ${isSurging ? '<span class="badge surge-badge" style="padding: 0.15rem 0.4rem; font-size: 0.65rem;"><i data-lucide="flame" style="width: 10px; height: 10px; margin-right: 2px;"></i> HOT SURGE</span>' : ''}
                    ${ipo.outlier ? '<span class="badge outlier-badge" style="padding: 0.15rem 0.4rem; font-size: 0.65rem;"><i data-lucide="zap" style="width: 10px; height: 10px; margin-right: 2px;"></i> Outlier Watch</span>' : ''}
                    <div style="font-weight: 600; font-size: 0.9rem;">
                        ${ipo.stage === 5 ? `<a href="https://www.tradingview.com/chart/?symbol=MYX:${ipo.symbol || ipo.id.toUpperCase().replace(/[^A-Z0-9]/g, '')}&interval=5" target="_blank" title="Buka chart TradingView (5M)" style="color: inherit; text-decoration: none; border-bottom: 1px dashed rgba(255,255,255,0.3); padding-bottom: 1px; transition: color 0.3s;" onmouseover="this.style.color='#60a5fa'" onmouseout="this.style.color='inherit'">${ipo.companyName} 🔗</a>` : ipo.companyName} 
                        ${ipo.shariah ? '<span style="color: #10b981; font-size: 0.75rem;" title="Shariah-Compliant">[S]</span>' : ''}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; margin-top: 0.3rem; color: var(--text-dim); padding-left: 2.8rem;">
                    <span class="status-dot ${statusClass}" style="width: 6px; height: 6px; display: inline-block; border-radius: 50%;"></span>
                    ${ipo.sector} • ${ipo.ib || 'TBA'}
                </div>
            </td>
            <td style="padding: 0.75rem 0.6rem; font-size: 0.85rem; color: var(--text-dim); white-space: nowrap;">${dateDisplay}</td>
            <td style="padding: 0.75rem 0.6rem; font-size: 0.85rem; white-space: nowrap;">
                <div style="font-weight: 600; color: ${ipo.os >= 20 ? '#10b981' : 'var(--text-main)'}; display: flex; align-items: center; gap: 0.3rem;">
                    ${ipo.os ? ipo.os.toFixed(1) + 'x' : (ipo.predictedOS ? '<span style="color: var(--accent-primary);">' + ipo.predictedOS + '</span>' : 'TBA')}
                    ${ipo.isAutoOS ? '<i data-lucide="cpu" style="width: 12px; color: #10b981;" title="Auto-Hunted"></i>' : ''}
                </div>
                <div style="font-size: 0.65rem; color: var(--text-dim);">Subscription</div>
            </td>
            <td style="padding: 0.75rem 0.6rem; font-size: 0.85rem; white-space: nowrap;">
                ${(ipo.stage === 5 && ipo.currentPrice) ? `
                    <div style="font-weight: 700; color: #60a5fa; margin-bottom: 2px;">Current: RM ${ipo.currentPrice.toFixed(2)}</div>
                ` : `
                    <div style="font-weight: 600;">${currentOpenPrice}</div>
                `}
                <div style="font-size: 0.65rem; color: var(--text-dim);">IPO: ${priceDisplay}</div>
                ${(ipo.stage === 5 && ipo.openPrice) ? `<div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 2px;">Open: RM ${ipo.openPrice.toFixed(2)}</div>` : ''}
                ${ipo.highPrice ? `<div style="font-size: 0.65rem; color: #f59e0b; margin-top: 2px;">High: RM ${ipo.highPrice.toFixed(2)}</div>` : ''}
                ${ipo.stage === 3 && ipo.estOpen ? `<div style="font-size: 0.65rem; color: #10b981; margin-top: 2px; font-weight: 600;">Est. Open: RM ${ipo.estOpen.toFixed(2)}</div>` : ''}
                ${(typeof ipo.sifuTargetPrice === 'number') ? (
                    (() => {
                        const gradeObj = getIpoGrade(ipo);
                        const cleanGrade = gradeObj.grade.replace('Pred: ', '').trim();
                        const currentVal = ipo.currentPrice || ipo.price || 0;
                        const passesTapis1 = currentVal <= ipo.sifuTargetPrice;
                        const passesTapis2 = (cleanGrade === 'A' || cleanGrade === 'B');
                        
                        if (passesTapis1 && passesTapis2) {
                            return `<div class="pulse-green-text" style="font-size: 0.65rem; color: #10b981; margin-top: 2px; font-weight: 800;">Sifu Buy: RM ${ipo.sifuTargetPrice.toFixed(2)} ✅</div>`;
                        } else {
                            return `<div style="font-size: 0.65rem; color: #a5b4fc; margin-top: 2px; font-weight: 600;">Sifu Target: RM ${ipo.sifuTargetPrice.toFixed(2)}</div>`;
                        }
                    })()
                ) : ''}
            </td>
            <td style="padding: 0.75rem 0.6rem; font-size: 0.85rem; white-space: nowrap;">${perfDisplay}</td>
            <td style="padding: 0.75rem 0.6rem; font-size: 0.85rem; white-space: nowrap;">${openToNowDisplay}</td>
            <td style="padding: 0.75rem 0.6rem; white-space: nowrap;">
                <span style="color: ${gradeColor}; font-weight: bold; font-size: 0.8rem; padding: 0.15rem 0.4rem; border: 1px solid ${gradeColor}40; border-radius: 4px; background: ${gradeColor}10;">
                    ${grade === 'Pending' ? 'Pending' : grade}
                </span>
                ${(function() {
                    const predGrade = getPredictedGrade(ipo);
                    if (predGrade && (ipo.stage === 5 || (ipo.stage === 4 && predGrade !== grade))) {
                        return `
                        <div style="margin-top: 0.4rem; font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.2rem;">
                            Pred: <strong style="color: ${predGrade === grade ? '#10b981' : '#f59e0b'};">${predGrade}</strong>
                            ${predGrade === grade ? '<i data-lucide="check-circle" style="width: 12px; color: #10b981;"></i>' : ''}
                        </div>
                        `;
                    }
                    return '';
                })()}
                ${prediction ? `
                <div style="margin-top: 0.4rem; width: 80px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.6rem; margin-bottom: 2px;">
                        <span style="color: var(--text-dim);">Boom</span>
                        <span style="color: ${prediction.color}; font-weight: 700;">${prediction.score}%</span>
                    </div>
                    <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                        <div style="width: ${prediction.score}%; height: 100%; background: ${prediction.color}; box-shadow: 0 0 5px ${prediction.color};"></div>
                    </div>
                </div>
                ` : ''}
            </td>
            <td style="padding: 0.75rem 0.6rem; min-width: 180px; max-width: 280px; font-size: 0.75rem; line-height: 1.3; vertical-align: top;">
                ${renderStyledVerdict(gradeObj.reason, grade, ipo)}
                <div style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid rgba(255,255,255,0.06);">${finalActionCol}</div>
            </td>
        </tr>
    `;
}



tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStage = parseInt(btn.dataset.stage);
        // Reset filters on tab switch
        resetFilters();
        renderIPOs();
    });
});

function resetFilters() {
    selectedGrades = ['A', 'B', 'C', 'Pending'];
    currentYear = 'all';
    currentSearch = '';
    currentSort = 'newest';
    updateGradeFilterUI();
    // Reset year buttons
    document.querySelectorAll('.year-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-main)';
        b.style.borderColor = 'rgba(255,255,255,0.2)';
    });
    const allYearBtn = document.querySelector('.year-btn[data-year="all"]');
    if (allYearBtn) {
        allYearBtn.classList.add('active');
        allYearBtn.style.background = 'var(--primary)';
        allYearBtn.style.color = 'white';
        allYearBtn.style.borderColor = 'var(--primary)';
    }
    // Reset search input
    const searchInput = document.getElementById('ipo-search');
    if (searchInput) searchInput.value = '';
    // Reset sort
    const sortSelect = document.getElementById('ipo-sort');
    if (sortSelect) sortSelect.value = 'newest';
}

function updateGradeFilterUI() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const isAllSelected = ['A', 'B', 'C', 'Pending'].every(g => selectedGrades.includes(g));
    const isNoneSelected = selectedGrades.length === 0;

    filterBtns.forEach(btn => {
        const grade = btn.dataset.grade;
        if (grade === 'all') {
            if (isAllSelected || isNoneSelected) {
                btn.classList.add('active');
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
                btn.style.borderColor = 'var(--primary)';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text-main)';
                btn.style.borderColor = 'rgba(255,255,255,0.2)';
            }
        } else {
            const isActive = selectedGrades.includes(grade);
            if (isActive) {
                btn.classList.add('active');
                if (grade === 'A') {
                    btn.style.background = 'rgba(16, 185, 129, 0.15)';
                    btn.style.color = '#10b981';
                    btn.style.borderColor = '#10b981';
                } else if (grade === 'B') {
                    btn.style.background = 'rgba(245, 158, 11, 0.15)';
                    btn.style.color = '#f59e0b';
                    btn.style.borderColor = '#f59e0b';
                } else if (grade === 'C') {
                    btn.style.background = 'rgba(239, 68, 68, 0.15)';
                    btn.style.color = '#ef4444';
                    btn.style.borderColor = '#ef4444';
                } else if (grade === 'Pending') {
                    btn.style.background = 'rgba(165, 180, 252, 0.15)';
                    btn.style.color = '#a5b4fc';
                    btn.style.borderColor = '#a5b4fc';
                }
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text-dim)';
                btn.style.borderColor = 'rgba(255,255,255,0.1)';
            }
        }
    });
}

// Initialize button UI
setTimeout(updateGradeFilterUI, 50);

const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const grade = btn.dataset.grade;
        if (grade === 'all') {
            selectedGrades = ['A', 'B', 'C', 'Pending'];
        } else {
            if (selectedGrades.includes(grade)) {
                selectedGrades = selectedGrades.filter(g => g !== grade);
            } else {
                selectedGrades.push(grade);
            }
        }
        updateGradeFilterUI();
        renderIPOs();
    });
});

const yearBtns = document.querySelectorAll('.year-btn');
yearBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        yearBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-main)';
            b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--primary)';
        currentYear = btn.dataset.year;
        renderIPOs();
    });
});

const searchInput = document.getElementById('ipo-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderIPOs();
    });
}

const sortSelect = document.getElementById('ipo-sort');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderIPOs();
    });
}

// renderIPOs(1) is now called inside the fetch promise
// Modal Logic
const modal = document.getElementById('ipo-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

window.showDetails = function(id) {
    const ipo = ipoData.find(item => item.id === id);
    if (!ipo) return;

    modalBody.innerHTML = `
        <h2>${ipo.companyName}</h2>
        <p><strong>Sector:</strong> ${ipo.sector} &nbsp;|&nbsp; <strong>Market:</strong> ${ipo.market}</p>
        <div class="modal-details">
            <div class="detail-item">
                <span class="label">Stage</span>
                <span class="value" style="color: #f59e0b;">${ipo.status}</span>
            </div>
            <div class="detail-item">
                <span class="label">Est. Price</span>
                <span class="value">${ipo.price > 0 ? 'RM ' + ipo.price.toFixed(2) : 'TBA'}</span>
            </div>
        </div>
        
        <div class="ai-analysis-container" style="margin-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem;">
            <h4 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.4rem; font-family: 'Outfit', sans-serif; color: #a78bfa; font-size: 0.9rem;">
                <i data-lucide="sparkles" style="width: 14px; height: 14px; color: #a78bfa;"></i>
                <span>Groq AI Smart Analysis</span>
            </h4>
            <div id="ai-verdict-box" style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.5rem; padding: 0.85rem; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <button onclick="generateModalAIAnalysis('${ipo.id}')" class="btn-moomoo" style="background: linear-gradient(135deg, #a78bfa, #8b5cf6); border: none; color: white; padding: 0.45rem 1.1rem; border-radius: 2rem; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; box-shadow: 0 4px 15px rgba(167, 139, 250, 0.2); transition: all 0.3s;">
                    <i data-lucide="zap" style="width: 13px; height: 13px;"></i> Generate AI Verdict
                </button>
                <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.4rem; text-align: center;">Menggunakan Llama-3.3-70b-versatile untuk ulasan fundamental & valuation segera.</div>
            </div>
        </div>

        <p style="font-size: 0.8rem; margin-top: 1.25rem; padding: 0.75rem; background: rgba(99, 102, 241, 0.08); border-radius: 0.5rem; border: 1px dashed rgba(165, 180, 252, 0.3); color: var(--text-dim);">
            <strong>Notice:</strong> This is a Draft Prospectus phase. Information is for reference only and not an offer to buy shares.
        </p>
    `;
    
    modal.style.display = 'flex';
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.generateModalAIAnalysis = async function(id) {
    const ipo = ipoData.find(item => item.id === id);
    if (!ipo) return;

    const verdictBox = document.getElementById('ai-verdict-box');
    if (!verdictBox) return;

    // Rate Limit Cooldown (client-side check to prevent rapid clicking)
    const now = Date.now();
    const lastClick = window._lastAnalysisClick || 0;
    const cooldownMs = 15000; // 15 seconds cooldown
    if (now - lastClick < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - (now - lastClick)) / 1000);
        alert(`Sila tunggu ${remaining} saat sebelum membuat analisis baru.`);
        return;
    }
    window._lastAnalysisClick = now;

    // Show loading state
    verdictBox.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 0.75rem;">
            <div class="spinner" style="width: 22px; height: 22px; border: 2px solid rgba(167, 139, 250, 0.2); border-top-color: #a78bfa; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span style="font-size: 0.8rem; color: #a78bfa; font-weight: 600;">Menganalisis Prospektus & Sektor...</span>
        </div>
    `;

    try {
        const systemPrompt = `You are "Hunter AI Verdict", a professional stock analyst specializing in Malaysian IPOs on Bursa Malaysia.
You evaluate IPOs across 4 pillars:
1. Valuation (P/E ratio compared to peer averages of ~20x-25x for tech, ~12x-15x for industrial, cash flow, and market cap).
2. Sponsor/Investment Bank (IB) quality (Maybank/M&A/KAF are elite Tier 1, TA/Kenanga/Malacca/UOB are mid Tier 2, others are Tier 3).
3. Sector Momentum (High-growth tech, solar, AI, semiconductors, cleanroom are super hot; standard fabrication, trading, services are neutral/boring).
4. Structure & Risks (OFS components decrease retail listing performance, lock-up terms, utilization of funds like debt paying vs R&D/Expansion).

Format your response in professional Malay/Manglish mixed style, using the following exact structure:
### 🌟 AI VERDICT: [MUST BUY / WORTH IT / SCALP / AVOID / PENDING]
Provide a concise 1-sentence verdict on whether to subscribe or skip.

### 📊 Valuation & Financial Health
Give a brief critique of the valuation (is it cheap, fair, or overpriced? PE value) and fund utilization.

### ⚡ Catalysts (Pemangkin)
List 2-3 positive catalysts (e.g. sponsor record, industry trends, orderbook, growth strategy) as bullet points.

### ⚠️ Risk Factors (Faktor Risiko)
List 1-2 major risks (e.g. OFS percentage, customer concentration, competitor pricing, shariah status if non-shariah) as bullet points.

### ⚓ Action Strategy
Tell the user exactly how to trade it (e.g., "Apply maximum and hold for target price", "Apply for listing day scalp", "Skip completely").`;

        const prompt = `Please evaluate the following IPO detail:
- Company Name: ${ipo.companyName}
- Sector: ${ipo.sector}
- Market: ${ipo.market}
- Price: RM ${ipo.price ? ipo.price.toFixed(3) : 'TBA'}
- PE Ratio: ${ipo.pe || 'TBA'}
- Investment Bank / Sponsor: ${ipo.ib || 'TBA'}
- Use of Funds: ${ipo.fundUse || 'TBA'}
- Oversubscription Rate: ${ipo.os || 'TBA'}
- Offer For Sale (OFS): ${ipo.ofs === true ? 'Yes (Has existing shares sold by promoters)' : 'No (Pure public issue)'}
- Sifu Target Price: RM ${ipo.sifuTargetPrice ? ipo.sifuTargetPrice.toFixed(3) : 'TBA'}
- Shariah Compliant: ${ipo.shariah ? 'Yes' : 'No'}
- Analyst Insight Summary: ${ipo.analystInsight || 'TBA'}`;

        const savedKey = getGroqKey();
        let responseText = '';

        if (savedKey) {
            // Direct browser call with manual key
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${savedKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 1024,
                    temperature: 0.5
                })
            });
            const groqData = await response.json();
            responseText = groqData?.choices?.[0]?.message?.content || '';
        } else {
            // Production Vercel mode
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    systemPrompt: systemPrompt,
                    model: 'llama-3.1-8b-instant',
                    max_tokens: 1024,
                    temperature: 0.5
                })
            });
            const data = await response.json();
            responseText = data.text || '';
        }

        if (!responseText) {
            throw new Error('No analysis generated.');
        }

        // Format markdown to HTML
        let formattedHtml = responseText
            .replace(/\n/g, '<br>')
            .replace(/### (.*?)(<br>|$)/g, '<h5 style="color:#a78bfa; font-family:\'Outfit\',sans-serif; font-size:0.9rem; margin: 0.8rem 0 0.35rem 0;">$1</h5>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/- (.*?)(<br>|$)/g, '<div style="display:flex; align-items:flex-start; gap:0.4rem; font-size:0.78rem; margin-bottom:0.25rem;"><span style="color:#a78bfa;">•</span><span>$1</span></div>');

        // Style the top level verdict headers nicely
        formattedHtml = formattedHtml.replace(/🌟 AI VERDICT: (.*?)(<\/h5>|<br>|$)/gi, (match, p1) => {
            let color = '#818cf8';
            let bg = 'rgba(99, 102, 241, 0.1)';
            const verdictUpper = p1.toUpperCase();
            if (verdictUpper.includes('MUST BUY') || verdictUpper.includes('MUST APPLY')) {
                color = '#c084fc';
                bg = 'rgba(139, 92, 246, 0.15)';
            } else if (verdictUpper.includes('WORTH IT')) {
                color = '#34d399';
                bg = 'rgba(16, 185, 129, 0.15)';
            } else if (verdictUpper.includes('AVOID')) {
                color = '#f87171';
                bg = 'rgba(239, 68, 68, 0.15)';
            } else if (verdictUpper.includes('SCALP')) {
                color = '#38bdf8';
                bg = 'rgba(56, 189, 248, 0.15)';
            }
            return `🌟 AI VERDICT: <span style="background:${bg}; color:${color}; font-weight:800; padding:0.2rem 0.6rem; border-radius:4px; border:1px solid ${color}40; font-size:0.75rem;">${p1}</span>`;
        });

        verdictBox.style.alignItems = 'stretch';
        verdictBox.style.textAlign = 'left';
        verdictBox.innerHTML = `
            <div style="font-size:0.78rem; color:var(--text-main); line-height:1.5; padding: 0.1rem;">
                ${formattedHtml}
            </div>
            <div style="margin-top:0.5rem; padding:0.35rem 0.5rem; background:rgba(245,158,11,0.07); border:1px solid rgba(245,158,11,0.18); border-radius:5px; font-size:0.65rem; color:#f59e0b; line-height:1.4;">
                ⚠️ AI verdict adalah panduan sahaja — bukan nasihat kewangan. Semak prospektus & Bursa rasmi sebelum buat keputusan.
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.05); margin-top:0.6rem; padding-top:0.4rem; text-align:right;">
                <button onclick="generateModalAIAnalysis('${ipo.id}')" class="btn-moomoo" style="background:transparent; border:1px solid rgba(255,255,255,0.15); color:var(--text-dim); padding:0.2rem 0.6rem; border-radius:4px; font-size:0.65rem; cursor:pointer; transition:0.3s;" onmouseover="this.style.borderColor='#a78bfa'; this.style.color='#a78bfa';" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)'; this.style.color='var(--text-dim)';">
                    <i data-lucide="refresh-cw" style="width: 9px; height: 9px; display:inline-block; margin-bottom:-1px;"></i> Recalculate
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (err) {
        console.error('AI Analysis failed:', err);
        verdictBox.innerHTML = `
            <div style="color:#ef4444; font-size:0.75rem; text-align:center; padding: 0.75rem;">
                ⚠️ Gagal menjana analisis. Sila semak sambungan internet atau tetapan API Key anda.
                <button onclick="generateModalAIAnalysis('${ipo.id}')" class="btn-primary" style="margin-top:0.5rem; padding:0.35rem 0.75rem; font-size:0.75rem; cursor:pointer; border:none;">Retry</button>
            </div>
        `;
    }
};

function showResearch(ipoId) {
    const ipo = ipoData.find(item => item.id === ipoId);
    if (!ipo || !ipo.research) return;

    modalBody.innerHTML = `
        <div class="research-hub">
            <h2 style="color: var(--primary-light); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                <i data-lucide="microscope" style="width: 24px;"></i> Analyst Research Lab
            </h2>
            
            <div class="comparison-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                ${ipo.research.map(note => `
                    <div class="lab-card glass-card" style="padding: 1.25rem; border: 1px solid rgba(99, 102, 241, 0.2);">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #a5b4fc; font-weight: 700; margin-bottom: 0.5rem;">${note.house}</div>
                        <div style="font-size: 1.25rem; font-weight: 800; color: white; margin-bottom: 0.25rem;">RM ${note.tp.toFixed(2)}</div>
                        <div style="font-size: 0.8rem; color: #10b981; font-weight: 600; margin-bottom: 1rem;">${note.view}</div>
                        
                        <div class="note-preview" style="background: rgba(0,0,0,0.3); border-radius: 0.5rem; overflow: hidden; height: 180px; position: relative; cursor: pointer;" onclick="window.open('${note.img}', '_blank')">
                            <img src="${note.img}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.7; transition: 0.3s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 0.75rem; font-size: 0.7rem; color: white; text-align: center;">
                                Click to View Full Note
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="padding: 1rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 0.75rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #10b981;">Hunter Strategy Analysis:</h4>
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-main); line-height: 1.5;">
                    The consensus from major research houses confirms a strong upside potential of ${((ipo.avgTP - ipo.price) / ipo.price * 100).toFixed(1)}% compared to the retail price. 
                    While some analysts are more conservative, others project a higher "Fair Value" target. 
                    <strong>Our Take:</strong> Accumulate for Step 3, but prioritize taking partial profits at ${ipo.avgTP}.
                </p>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

window.showResearch = showResearch;
window.showDetails = showDetails;
window.initializeData = initializeData;
window.playNotificationSound = playNotificationSound;
window.showToast = showToast;
window.fetchLiveUpdates = fetchLiveUpdates;

// --- Ballot Calculator Logic ---

// --- Hunter Pro Tier & Financing Hub Logic ---

const IPO_TIERS = [
    { units: 100, tier: 1 },
    { units: 300, tier: 2 },
    { units: 1100, tier: 3 },
    { units: 2100, tier: 4 },
    { units: 3100, tier: 5 },
    { units: 4100, tier: 6 },
    { units: 6100, tier: 7 },
    { units: 11100, tier: 8 },
    { units: 20100, tier: 9 },
    { units: 50100, tier: 10 },
    { units: 100100, tier: 11 },
    { units: 200100, tier: 12 },
    { units: 500100, tier: 13 },
    { units: 1000100, tier: 14 },
    { units: 2000100, tier: 15 },
    { units: 5000100, tier: 16 },
    { units: 10000100, tier: 17 }
];

function openCalculatorModal() {
    const modal = document.getElementById('calculator-modal');
    if (!modal) return;
    
    // Populate dropdown with Stage 3 IPOs
    const select = document.getElementById('calc-ipo-select');
    if (select) {
        select.innerHTML = '<option value="">-- Select IPO --</option>';
        const stage3Ipos = ipoData.filter(ipo => ipo.stage === 3);
        stage3Ipos.forEach(ipo => {
            select.innerHTML += `<option value="${ipo.id}" data-price="${ipo.price}">${ipo.companyName} (RM ${ipo.price})</option>`;
        });
    }
    
    // Default values
    document.getElementById('calc-capital').value = 10000;
    document.getElementById('calc-leverage').value = 2;
    document.getElementById('calc-cds-num').value = 1;
    
    syncHunterProCalculator();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeCalculatorModal() {
    const modal = document.getElementById('calculator-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function switchProTab(tabId) {
    document.querySelectorAll('.pro-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(tabId)) btn.classList.add('active');
    });
    document.querySelectorAll('.pro-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('pro-tab-' + tabId).classList.add('active');
}

function syncHunterProCalculator() {
    const ipoId = document.getElementById('calc-ipo-select').value;
    const capital = parseFloat(document.getElementById('calc-capital').value) || 0;
    const leverage = parseInt(document.getElementById('calc-leverage').value) || 1;
    const cdsNum = parseInt(document.getElementById('calc-cds-num').value) || 1;

    const ipo = ipoData.find(i => i.id === ipoId);
    if (!ipo || !ipo.price) {
        resetProCalculatorUI();
        return;
    }

    const price = ipo.price;
    const totalCapital = capital * cdsNum;
    const financingFactor = leverage - 1; // 1 for 2x, 0 for 1x
    const financingAmount = totalCapital * financingFactor;
    const totalPower = totalCapital + financingAmount;

    // 1. Tier Logic
    let bestTier = IPO_TIERS[0];
    for (const tier of IPO_TIERS) {
        if (tier.units * price <= totalPower) {
            bestTier = tier;
        } else {
            break;
        }
    }

    const actualCost = bestTier.units * price;
    const unitsPerCds = Math.floor(bestTier.units / cdsNum);
    
    // UI Update: Summary
    document.getElementById('res-total-power').innerText = 'RM ' + totalPower.toLocaleString();
    document.getElementById('res-principal').innerText = 'Cash: RM ' + totalCapital.toLocaleString();
    document.getElementById('res-loan').innerText = 'Loan: RM ' + financingAmount.toLocaleString();
    
    document.getElementById('res-tier-badge').innerText = 'Tier ' + bestTier.tier;
    document.getElementById('res-recommended-units').innerText = bestTier.units.toLocaleString() + ' units';
    document.getElementById('res-recommended-cost').innerText = 'Cost: RM ' + actualCost.toLocaleString();

    // 2. Financing Logic
    // Estimate days: closingDate to listingDate
    let days = 15;
    if (ipo.closingDate && ipo.listingDate) {
        const start = new Date(ipo.closingDate);
        const end = new Date(ipo.listingDate);
        if (!isNaN(start) && !isNaN(end)) {
            days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        }
    }
    
    const interestRate = 0.068; // 6.8%
    const interest = (financingAmount * interestRate * days) / 365;
    const sst = interest * 0.08; // 8% SST
    const totalFinCost = interest + sst;

    document.getElementById('res-interest').innerText = 'RM ' + interest.toFixed(2);
    document.getElementById('res-sst').innerText = 'RM ' + sst.toFixed(2);
    document.getElementById('res-total-cost').innerText = 'RM ' + totalFinCost.toFixed(2);
    document.getElementById('res-days').innerText = days + ' days';

    // Deposit Logic
    const depositReq = actualCost - totalCapital;
    const depositAlert = document.getElementById('res-additional-deposit');
    if (depositReq > 0 && leverage > 1) {
        depositAlert.style.display = 'flex';
        document.getElementById('res-deposit-val').innerText = 'RM ' + depositReq.toFixed(2);
    } else {
        depositAlert.style.display = 'none';
    }

    // 3. Tier Table Update
    const tableBody = document.getElementById('tier-table-body');
    tableBody.innerHTML = IPO_TIERS.map(t => {
        const cost = t.units * price;
        const isActive = t.tier === bestTier.tier;
        return `
            <tr class="${isActive ? 'active' : ''}">
                <td>${t.units.toLocaleString()}</td>
                <td>Tier ${t.tier}</td>
                <td>RM ${cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td>${cost <= totalPower ? '<span style="color:#10b981;">Affordable</span>' : '<span style="color:var(--text-dim);">Too high</span>'}</td>
            </tr>
        `;
    }).join('');

    // 4. Sell Calculator
    let sellPrice = parseFloat(document.getElementById('calc-sell-price').value);
    if (isNaN(sellPrice)) {
        sellPrice = ipo.estOpen || ipo.avgTP || (price * 1.5);
        document.getElementById('calc-sell-price').value = sellPrice.toFixed(2);
    }

    const grossProceeds = bestTier.units * sellPrice;
    
    // Brokerage: Standard cash upfront (0.08% or min RM8)
    const buyBrokerage = Math.max(8, actualCost * 0.0008);
    const sellBrokerage = Math.max(8, grossProceeds * 0.0008);
    
    const netProfit = grossProceeds - actualCost - buyBrokerage - sellBrokerage - totalFinCost;
    const roi = (netProfit / totalCapital) * 100;

    const profitEl = document.getElementById('res-net-profit');
    const roiEl = document.getElementById('res-roi');
    
    profitEl.innerText = 'RM ' + netProfit.toLocaleString(undefined, {minimumFractionDigits: 2});
    roiEl.innerText = (roi >= 0 ? '+' : '') + roi.toFixed(2) + '%';
    
    profitEl.style.color = netProfit >= 0 ? '#10b981' : '#ef4444';
    roiEl.style.color = roi >= 0 ? '#10b981' : '#ef4444';
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function resetProCalculatorUI() {
    document.getElementById('res-total-power').innerText = 'RM 0.00';
    document.getElementById('res-tier-badge').innerText = 'Tier -';
    document.getElementById('res-recommended-units').innerText = '0 units';
    document.getElementById('tier-table-body').innerHTML = '';
}

window.openCalculatorModal = openCalculatorModal;
window.closeCalculatorModal = closeCalculatorModal;
window.syncHunterProCalculator = syncHunterProCalculator;
window.switchProTab = switchProTab;

// --- Hunter AI Assistant Logic ---

function toggleChat() {
    const window = document.getElementById('ai-window');
    const iconOpen = document.getElementById('toggle-icon-open');
    const iconClose = document.getElementById('toggle-icon-close');
    const badge = document.querySelector('.notification-badge');

    if (window.style.display === 'none') {
        window.style.display = 'flex';
        iconOpen.style.display = 'none';
        iconClose.style.display = 'block';
        if(badge) badge.style.display = 'none';
    } else {
        window.style.display = 'none';
        iconOpen.style.display = 'block';
        iconClose.style.display = 'none';
    }
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const messageContainer = document.getElementById('ai-messages');
    const text = input.value.trim();

    if (!text) return;

    // Add User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.textContent = text;
    messageContainer.appendChild(userMsg);
    
    input.value = '';
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Show Typing Indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'message ai-message typing';
    typingMsg.innerHTML = '<span class="dot-typing"></span><span class="dot-typing"></span><span class="dot-typing"></span>';
    messageContainer.appendChild(typingMsg);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    try {
        // Keep only active IPOs (Stage 1-4) + 10 most recent listed IPOs (Stage 5) to save tokens
        const activeIpos = ipoData.filter(i => i.stage < 5);
        const listedIpos = ipoData.filter(i => i.stage === 5)
            .sort((a, b) => {
                const dateA = a.listingDate ? new Date(a.listingDate) : new Date(0);
                const dateB = b.listingDate ? new Date(b.listingDate) : new Date(0);
                return dateB - dateA; // newest first
            })
            .slice(0, 10);
        const filteredIpos = [...activeIpos, ...listedIpos];

        const compactIpoData = filteredIpos.map(i => {
            const gradeObj = getIpoGrade(i);
            const grade = gradeObj ? gradeObj.grade : 'Unrated';
            const symb = i.symbol || i.id || 'N/A';
            const priceVal = i.price ? `RM${i.price.toFixed(3)}` : 'TBA';
            const osVal = i.os ? `${i.os}x` : 'TBA';
            const mkt = i.market && i.market.toLowerCase().includes('main') ? 'Main' : 'ACE';
            const name = (i.companyName || i.id || 'Unknown').substring(0, 30);
            const sect = (i.sector || 'N/A').substring(0, 25);
            return `${name} (${symb})|${mkt}|Stage ${i.stage}|${priceVal}|OS:${osVal}|PE:${i.pe || 'TBA'}|Grade:${grade}|${sect}`;
        }).join('\n');

        const systemPrompt = `You are "Hunter AI", a professional Malaysian IPO assistant for the IPO Hunter website.
You help users understand IPOs listed on Bursa Malaysia.
CURRENT IPO DATABASE (Format: Name (Symbol)|Market|Stage|Price|OS|PE|Grade|Sector):
${compactIpoData}
Keep answers short, helpful, and use emojis. Mention Grade (A=strong swing, B=scalp, C=avoid) when relevant. Respond in Malay/English mix where appropriate.`;



        const savedKey = getGroqKey();
        let response;

        if (savedKey) {
            // Direct browser call with manual key
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${savedKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    max_tokens: 512,
                    temperature: 0.7
                })
            });
            const groqData = await response.json();
            if (!response.ok) {
                const errMsg = groqData?.error?.message || 'Groq API returned an error.';
                response = { ok: false, _groqText: `⚠️ Error: ${errMsg}` };
            } else {
                const groqText = groqData?.choices?.[0]?.message?.content || '';
                response = { ok: true, _groqText: groqText };
            }
        } else {
            // Production: secure proxy on Vercel (key hidden in env vars)
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: 'User question: ' + text,
                    systemPrompt: systemPrompt,
                    model: 'llama-3.1-8b-instant',
                    max_tokens: 512,
                    temperature: 0.7
                })
            });
        }

        // Handle both local (Groq direct) and production (proxy) responses
        let rawText = '';
        if (response._groqText !== undefined) {
            rawText = response._groqText; // local mode — already extracted
        } else {
            let data;
            try {
                data = await response.json();
            } catch (jsonErr) {
                rawText = `⚠️ Proxy parse error: ${response.status} ${response.statusText}`;
            }
            if (data) {
                rawText = data.text || '';
                if (!rawText && data.error) {
                    rawText = `⚠️ Error: ${data.error}`;
                }
            }
        }

        messageContainer.removeChild(typingMsg);
        const aiMsg = document.createElement('div');
        aiMsg.className = 'message ai-message';

        if (rawText) {
            aiMsg.innerHTML = rawText
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>');
        } else {
            aiMsg.innerHTML = "Sorry, I couldn't get a response. Please try again!";
        }

        messageContainer.appendChild(aiMsg);
    } catch (err) {
        console.error('Chat Error:', err);
        messageContainer.removeChild(typingMsg);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message ai-message';
        errorMsg.textContent = `⚠️ Error: ${err.message || err}`;
        messageContainer.appendChild(errorMsg);
    }
    
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

window.toggleChat = toggleChat;
window.sendAIMessage = sendAIMessage;

// Price Alert System
function promptPriceAlert(id, companyName, currentPrice) {
    const ipo = ipoData.find(x => x.id === id);
    if (!ipo || typeof ipo.sifuTargetPrice !== 'number') {
        showToast("Tiada harga sasaran Sifu untuk kaunter ini.");
        return;
    }
    
    const targetPrice = ipo.sifuTargetPrice;
    const isTriggered = currentPrice > 0 && currentPrice <= targetPrice;
    
    if (isTriggered) {
        const dismissed = JSON.parse(localStorage.getItem('dismissedPriceAlerts') || '[]');
        const index = dismissed.indexOf(id);
        
        if (index !== -1) {
            // Unmute / Undismiss
            dismissed.splice(index, 1);
            localStorage.setItem('dismissedPriceAlerts', JSON.stringify(dismissed));
            showToast(`Alert diaktifkan semula untuk ${companyName}!`);
        } else {
            // Mute / Dismiss
            dismissed.push(id);
            localStorage.setItem('dismissedPriceAlerts', JSON.stringify(dismissed));
            showToast(`Alert dipadam untuk ${companyName}.`);
        }
    } else {
        showToast(`Alert Beli Aktif: Sistem akan memberitahu jika harga turun ke RM ${targetPrice.toFixed(2)} (semasa: RM ${currentPrice.toFixed(2)}).`);
    }
    
    renderIPOs(currentStage);
    checkPriceAlerts();
}

function clearPriceAlert(id) {
    const dismissed = JSON.parse(localStorage.getItem('dismissedPriceAlerts') || '[]');
    if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem('dismissedPriceAlerts', JSON.stringify(dismissed));
    }
    renderIPOs(currentStage);
    checkPriceAlerts();
    showToast("Alert harga dipadam.");
}

function checkPriceAlerts() {
    const container = document.getElementById('active-price-alerts-container');
    if (!container) return;
    
    const dismissed = JSON.parse(localStorage.getItem('dismissedPriceAlerts') || '[]');
    const activeAlerts = [];
    
    ipoData.forEach(ipo => {
        if (ipo.stage === 5 && typeof ipo.sifuTargetPrice === 'number' && ipo.shariah === true) {
            const curPrice = ipo.currentPrice || ipo.price || 0;
            const targetPrice = ipo.sifuTargetPrice;
            
            if (curPrice > 0 && curPrice <= targetPrice) {
                if (!dismissed.includes(ipo.id)) {
                    activeAlerts.push({
                        id: ipo.id,
                        companyName: ipo.companyName,
                        curPrice,
                        targetPrice
                    });
                }
            } else {
                // Auto-cleanup from dismissed state if price rises back above target
                const index = dismissed.indexOf(ipo.id);
                if (index !== -1) {
                    dismissed.splice(index, 1);
                    localStorage.setItem('dismissedPriceAlerts', JSON.stringify(dismissed));
                }
            }
        }
    });
    
    if (activeAlerts.length > 0) {
        container.style.display = 'block';
        container.innerHTML = `
            <div class="glass-card" style="border: 1px solid rgba(245, 158, 11, 0.4); background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.5)); padding: 1rem 1.5rem; border-radius: 1rem; box-shadow: 0 8px 32px rgba(245, 158, 11, 0.12); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <span style="font-size: 0.9rem; color: #f8fafc; font-family: 'Outfit', sans-serif; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="bell-ring" class="pulse-green-text" style="width: 18px; color: #f59e0b;"></i> 
                    Kita ada <strong style="color: #f59e0b; font-size: 1.05rem;">${activeAlerts.length}</strong> alert harga sasaran Zon Beli yang dipicu sekarang!
                </span>
                <a href="alerts.html" class="btn-moomoo" style="background: #f59e0b; border: none; color: white; font-weight: 700; text-decoration: none; padding: 0.4rem 1rem; border-radius: 0.5rem; font-size: 0.8rem; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); display: flex; align-items: center; gap: 0.4rem;">
                    Lihat & Urus Alert <i data-lucide="arrow-right" style="width:14px; height:14px;"></i>
                </a>
            </div>
        `;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

window.promptPriceAlert = promptPriceAlert;
window.clearPriceAlert = clearPriceAlert;
window.checkPriceAlerts = checkPriceAlerts;

function renderListedSidebar() {
    const sidebarEl = document.getElementById('listed-sidebar');
    const sidebarListEl = document.getElementById('listed-sidebar-list');
    const sidebarCountEl = document.getElementById('sidebar-count');
    
    if (!sidebarEl || !sidebarListEl) return;
    
    const stageNum = parseInt(currentStage || 1);
    if (stageNum === 5) {
        sidebarEl.style.display = 'none';
        return;
    }
    
    sidebarEl.style.display = 'flex';
    
    // Get all listed IPOs
    const listedIpos = ipoData.filter(ipo => ipo.stage === 5);
    
    // Sort by listing date newest first
    listedIpos.sort((a, b) => getBestSortDate(b) - getBestSortDate(a));
    
    if (sidebarCountEl) {
        sidebarCountEl.textContent = listedIpos.length;
    }
    
    if (listedIpos.length === 0) {
        sidebarListEl.innerHTML = `
            <div style="color: var(--text-dim); font-size: 0.85rem; text-align: center; padding: 1rem;">
                No listed IPOs found.
            </div>
        `;
        return;
    }
    
    sidebarListEl.innerHTML = listedIpos.map(ipo => {
        const gradeObj = getIpoGrade(ipo);
        const grade = gradeObj.grade;
        const baseGrade = grade.replace('Pred: ', '');
        const gradeColor = baseGrade === 'A' ? '#10b981' : baseGrade === 'B' ? '#f59e0b' : (baseGrade === 'Pending' ? '#a5b4fc' : '#ef4444');
        
        const curPrice = ipo.currentPrice || ipo.price || 0;
        const openPrice = ipo.openPrice || ipo.price || 0;
        
        let holdPerf = 0;
        let perfColor = 'var(--text-main)';
        if (ipo.currentPrice) {
            holdPerf = ((ipo.currentPrice - ipo.price) / ipo.price * 100);
            perfColor = holdPerf >= 0 ? '#10b981' : '#ef4444';
        }
        
        let openToNow = 0;
        let openToNowColor = 'var(--text-main)';
        let hasOpenToNow = false;
        if (ipo.currentPrice && ipo.openPrice) {
            openToNow = ((ipo.currentPrice - ipo.openPrice) / ipo.openPrice * 100);
            openToNowColor = openToNow >= 0 ? '#10b981' : '#ef4444';
            hasOpenToNow = true;
        }
        
        return `
            <div class="sidebar-ipo-card" style="padding: 1rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(99,102,241,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(255,255,255,0.05)';">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); line-height: 1.3;">
                        <a href="https://www.tradingview.com/chart/?symbol=MYX:${ipo.symbol || ipo.id.toUpperCase().replace(/[^A-Z0-9]/g, '')}&interval=5" target="_blank" style="color: inherit; text-decoration: none; border-bottom: 1px dashed rgba(255,255,255,0.3); transition: color 0.2s;" onmouseover="this.style.color='#60a5fa'" onmouseout="this.style.color='inherit'">
                            ${ipo.companyName} 🔗
                        </a>
                        ${ipo.shariah ? '<span style="color: #10b981; font-size: 0.75rem;" title="Shariah-Compliant">[S]</span>' : ''}
                    </div>
                    <span style="color: ${gradeColor}; font-weight: bold; font-size: 0.7rem; padding: 0.1rem 0.35rem; border: 1px solid ${gradeColor}40; border-radius: 4px; background: ${gradeColor}10; flex-shrink: 0;">
                        ${baseGrade}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-dim);">
                    <span>${ipo.sector} • ${ipo.symbol || 'TBA'}</span>
                    <span>${ipo.listingDate || ipo.year}</span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem; font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.4rem; border-radius: 0.35rem; text-align: center; margin: 0.25rem 0;">
                    <div>
                        <div style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase;">IPO</div>
                        <div style="font-weight: 600;">RM ${ipo.price.toFixed(3)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase;">Open</div>
                        <div style="font-weight: 600;">RM ${openPrice.toFixed(3)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase;">Current</div>
                        <div style="font-weight: 600; color: #60a5fa;">RM ${curPrice.toFixed(3)}</div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; gap: 0.5rem; margin-top: 0.25rem;">
                    <div style="flex: 1; background: rgba(255,255,255,0.01); padding: 0.35rem; border-radius: 0.25rem; text-align: center; border: 1px solid rgba(255,255,255,0.04);">
                        <div style="font-size: 0.6rem; color: var(--text-dim);">IPO to Now</div>
                        <div style="font-weight: 700; color: ${perfColor};">${holdPerf > 0 ? '+' : ''}${holdPerf.toFixed(1)}%</div>
                    </div>
                    <div style="flex: 1; background: rgba(255,255,255,0.01); padding: 0.35rem; border-radius: 0.25rem; text-align: center; border: 1px solid rgba(255,255,255,0.04);">
                        <div style="font-size: 0.6rem; color: var(--text-dim);">Open to Now</div>
                        <div style="font-weight: 700; color: ${openToNowColor};">${hasOpenToNow ? (openToNow > 0 ? '+' : '') + openToNow.toFixed(1) + '%' : '-'}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.renderListedSidebar = renderListedSidebar;
