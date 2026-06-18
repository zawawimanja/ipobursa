const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  const symbol = "0459.KL"; // Bursa stock code for SUM is 0459, so we can try 0459.KL or SUM.KL
  const url = `https://finance.yahoo.com/quote/${symbol}`;
  console.log(`Navigating to ${url}...`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Accept consent if redirect/pop-up happens
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    if (finalUrl.includes('consent.yahoo.com')) {
      console.log('Consent screen detected. Clicking accept...');
      // Wait for consent button and click it
      await page.waitForSelector('button.accept-all', { timeout: 5000 });
      await page.click('button.accept-all');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      console.log('Bypassed consent. Now at:', page.url());
    }

    // Wait a bit for JS to render price
    await new Promise(r => setTimeout(r, 2000));
    
    const data = await page.evaluate((sym) => {
      let priceEl = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="regularMarketPrice"]`)
                 || document.querySelector(`fin-streamer[data-field="regularMarketPrice"]`);
      let prevCloseEl = document.querySelector(`td[data-test="PREV_CLOSE-value"]`) || document.querySelector('td[data-field="prevClose"]');
      let rangeTd = Array.from(document.querySelectorAll('td')).find(td => td.innerText && td.innerText.includes('52 Week Range'));
      let rangeVal = rangeTd ? rangeTd.nextElementSibling.innerText : null;
      let dayRangeTd = Array.from(document.querySelectorAll('td')).find(td => td.innerText && td.innerText.includes("Day's Range"));
      let dayRangeVal = dayRangeTd ? dayRangeTd.nextElementSibling.innerText : null;

      return {
        price: priceEl ? priceEl.innerText || priceEl.getAttribute('value') : null,
        prevClose: prevCloseEl ? prevCloseEl.innerText : null,
        range52Week: rangeVal,
        dayRange: dayRangeVal,
        bodyText: document.body.innerText.substring(0, 1000)
      };
    }, symbol);
    
    console.log('Scraped Data for 0459.KL:', data);
  } catch (e) {
    console.error('Error fetching:', e);
  } finally {
    await browser.close();
  }
}

run();
