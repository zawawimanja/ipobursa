const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  const stocks = [
    { name: 'PENTECH', code: '0457.KL', ipo: 0.20, sifuTp: 0.28 },
    { name: 'ELSA', code: '0458.KL', ipo: 0.23, sifuTp: 0.31 }
  ];
  
  for (let s of stocks) {
    const url = `https://finance.yahoo.com/quote/${s.code}`;
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const data = await page.evaluate((sym) => {
        let priceEl = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="regularMarketPrice"]`)
                   || document.querySelector(`fin-streamer[data-field="regularMarketPrice"]`);
        let rangeTd = Array.from(document.querySelectorAll('td')).find(td => td.innerText && td.innerText.includes('52 Week Range'));
        let rangeVal = rangeTd ? rangeTd.nextElementSibling.innerText : null;
        let dayRangeTd = Array.from(document.querySelectorAll('td')).find(td => td.innerText && td.innerText.includes("Day's Range"));
        let dayRangeVal = dayRangeTd ? dayRangeTd.nextElementSibling.innerText : null;
        
        return {
          price: priceEl ? priceEl.innerText || priceEl.getAttribute('value') : null,
          range52Week: rangeVal,
          dayRange: dayRangeVal
        };
      }, s.code);
      
      console.log(`[${s.name}] Result:`, data);
    } catch (e) {
      console.error(`Error fetching ${s.name}:`, e.message);
    }
  }
  
  await browser.close();
}

run();
