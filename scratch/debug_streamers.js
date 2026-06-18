const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  const symbol = "0459.KL";
  const url = `https://finance.yahoo.com/quote/${symbol}`;
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  console.log('Waiting for price selector...');
  try {
    await page.waitForSelector(`fin-streamer[data-symbol="${symbol}"][data-field="regularMarketPrice"]`, { timeout: 10000 });
    console.log('Price selector loaded!');
    
    const data = await page.evaluate((sym) => {
      let priceEl = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="regularMarketPrice"]`);
      return priceEl ? priceEl.innerText : null;
    }, symbol);
    
    console.log('Scraped Price:', data);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
