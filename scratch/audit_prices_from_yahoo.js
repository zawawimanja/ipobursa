const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
const DATA_JS_FILE = path.join(__dirname, '../data.js');

const tickerOverrides = {
  'SUM': '0459.KL',
  'ELSA': '0458.KL',
  'PENTECH': '0457.KL',
  'MMCS': '0328.KL',
  'BUSCAP': '0455.KL',
  '5ER': '0397.KL',
  'NE': '0396.KL',
  'AMBEST': '0391.KL',
  'AMS': '0399.KL',
  'EIPOWER': '0453.KL',
  'EMPIRE': '5351.KL',
  'GDGROUP': '0398.KL',
  'GOLDLI': '0452.KL',
  'HOCKSOON': '5346.KL',
  'INSPACE': '0451.KL',
  'ISF': '0390.KL',
  'KEEMING': '0392.KL',
  'MFGROUP': '0450.KL',
  'MTTSL': '5352.KL',
  'OGM': '0389.KL',
  'OGX': '0395.KL',
  'SBS': '0386.KL',
  'SKYECHIP': '5357.KL',
  'SUNMED': '5555.KL',
  'TEAMSTR': '0393.KL',
  'CBHB': '0337.KL'
};

async function run() {
  if (!fs.existsSync(DATA_JSON_FILE)) {
    console.error('data.json not found!');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));
  
  // Filter for listed IPOs (stage 5) from 2024, 2025, 2026
  const targetIpos = data.filter(ipo => {
    return ipo.stage === 5 && ipo.year >= 2024 && ipo.symbol;
  });
  
  console.log(`Auditing ${targetIpos.length} listed IPOs from 2024-2026...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  // Disable images, css, etc. to make it fast
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if(['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())){
      req.abort();
    } else {
      req.continue();
    }
  });

  let updatedCount = 0;
  
  for (let ipo of targetIpos) {
    const symbolClean = ipo.symbol.replace(/\[.*?\]/g, '').trim().toUpperCase();
    const yahooSymbol = tickerOverrides[symbolClean] || `${symbolClean}.KL`;
    const url = `https://finance.yahoo.com/quote/${yahooSymbol}`;
    
    console.log(`[${ipo.symbol}] Fetching from ${url}...`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      // Check if consent redirect happened
      if (page.url().includes('consent.yahoo.com')) {
        console.log('  -> Consent screen detected. Skipping consent...');
        await page.waitForSelector('button.accept-all', { timeout: 3000 });
        await page.click('button.accept-all');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      }
      
      // Wait 1.5 seconds for Yahoo dynamic content
      await new Promise(r => setTimeout(r, 1500));
      
      const scraped = await page.evaluate((sym) => {
        let priceEl = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="regularMarketPrice"]`)
                   || document.querySelector(`fin-streamer[data-symbol="${sym.toUpperCase()}"][data-field="regularMarketPrice"]`)
                   || document.querySelector(`fin-streamer[data-symbol="${sym.toLowerCase()}"][data-field="regularMarketPrice"]`);
        let rangeTd = Array.from(document.querySelectorAll('td')).find(td => td.innerText && td.innerText.includes('52 Week Range'));
        let rangeVal = rangeTd && rangeTd.nextElementSibling ? rangeTd.nextElementSibling.innerText : null;
        let dayRangeTd = Array.from(document.querySelectorAll('td')).find(td => td.innerText && td.innerText.includes("Day's Range"));
        let dayRangeVal = dayRangeTd && dayRangeTd.nextElementSibling ? dayRangeTd.nextElementSibling.innerText : null;
        
        return {
          priceStr: priceEl ? priceEl.innerText || priceEl.getAttribute('value') : null,
          range52Week: rangeVal,
          dayRange: dayRangeVal
        };
      }, yahooSymbol);
      
      if (scraped.priceStr) {
        const currentPrice = parseFloat(scraped.priceStr.replace(/,/g, ''));
        let highPrice = ipo.highPrice || 0;
        
        // Parse 52 Week High if available
        if (scraped.range52Week) {
          const parts = scraped.range52Week.split('-').map(p => parseFloat(p.trim().replace(/,/g, '')));
          if (parts.length === 2 && !isNaN(parts[1])) {
            highPrice = parts[1];
          }
        }
        
        // Also check if currentPrice is higher than highPrice
        if (currentPrice > highPrice) {
          highPrice = currentPrice;
        }
        
        // Recalculate performance
        const ipoPrice = ipo.price || 0;
        let performance = ipo.performance;
        if (ipoPrice > 0) {
          const perfNum = ((currentPrice - ipoPrice) / ipoPrice) * 100;
          performance = (perfNum >= 0 ? '+' : '') + perfNum.toFixed(2) + '%';
        }
        
        let changed = false;
        const changes = [];
        
        if (Math.abs(ipo.currentPrice - currentPrice) > 0.001) {
          changes.push(`Cur: ${ipo.currentPrice} -> ${currentPrice}`);
          ipo.currentPrice = currentPrice;
          changed = true;
        }
        if (Math.abs(ipo.highPrice - highPrice) > 0.001) {
          changes.push(`High: ${ipo.highPrice} -> ${highPrice}`);
          ipo.highPrice = highPrice;
          changed = true;
        }
        if (ipo.performance !== performance) {
          changes.push(`Perf: ${ipo.performance} -> ${performance}`);
          ipo.performance = performance;
          changed = true;
        }
        
        if (changed) {
          console.log(`  -> ✅ UPDATED: ${changes.join(' | ')}`);
          updatedCount++;
        } else {
          console.log(`  -> Consistent (Cur=${currentPrice}, High=${highPrice})`);
        }
      } else {
        console.log(`  -> ⚠️ FAILED: Price element not found for ${yahooSymbol}.`);
      }
      
    } catch (e) {
      console.log(`  -> ❌ ERROR: ${e.message}`);
    }
    
    // Tiny delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await browser.close();
  
  if (updatedCount > 0) {
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 4), 'utf8');
    
    // Sync with data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 4)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
    fs.writeFileSync(DATA_JS_FILE, jsContent, 'utf8');
    
    console.log(`\nSuccessfully updated ${updatedCount} records in data.json and data.js!`);
  } else {
    console.log('\nAll prices are fully audited and consistent with Yahoo Finance.');
  }
}

run();
