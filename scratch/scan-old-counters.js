const puppeteer = require('puppeteer');

const counters = [
    { name: 'DNEX', sym: '4456.KL' },
    { name: 'MYEG', sym: '0138.KL' },
    { name: 'INARI', sym: '0166.KL' },
    { name: 'FRONTKN', sym: '0128.KL' },
    { name: 'GREATEC', sym: '0208.KL' },
    { name: 'GAMUDA', sym: '5398.KL' },
    { name: 'YTLPOWR', sym: '6742.KL' },
    { name: 'TENAGA', sym: '5347.KL' },
    { name: 'PBBANK', sym: '1295.KL' },
    { name: 'MAYBANK', sym: '1155.KL' }
];

async function scanCounters() {
    console.log('🚀 Memulakan imbasan pantas kaunter lama (non-IPO) di Yahoo Finance...\n');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if(['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())){
            req.abort();
        } else {
            req.continue();
        }
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    for (let c of counters) {
        let url = `https://finance.yahoo.com/quote/${c.sym}`;
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Extract current price and 52-week high
            const data = await page.evaluate((sym) => {
                let current = null;
                let priceElement = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="regularMarketPrice"]`);
                if (priceElement) current = parseFloat(priceElement.getAttribute('value') || priceElement.innerText);
                
                let high52 = null;
                // Yahoo finance 52-week range is usually in a list item or td
                // We'll try to find the 52-week range row
                const labels = Array.from(document.querySelectorAll('span, td'));
                for (let el of labels) {
                    if (el.innerText && el.innerText.includes('52 Week Range')) {
                        let next = el.nextElementSibling || el.parentElement.nextElementSibling;
                        if (next) {
                            let rangeText = next.innerText.trim();
                            let parts = rangeText.split('-');
                            if (parts.length === 2) {
                                high52 = parseFloat(parts[1].replace(/,/g, '').trim());
                            }
                        }
                    }
                }
                
                // Fallback for fiftyTwoWeekHigh streamer if it exists
                let highElement = document.querySelector(`fin-streamer[data-symbol="${sym}"][data-field="fiftyTwoWeekHigh"]`);
                if (highElement) high52 = parseFloat(highElement.getAttribute('value') || highElement.innerText);

                return { current, high52 };
            }, c.sym);

            if (data && data.current && data.high52) {
                const pullback = ((data.high52 - data.current) / data.high52 * 100).toFixed(1);
                let status = '';
                if (pullback <= 5) status = '🔥 NEAR ATH (0-5% pullback)';
                else if (pullback <= 15) status = '📉 HEALTHY PULLBACK (5-15% dari ATH)';
                else if (pullback <= 30) status = '🔻 DEEP PULLBACK (>15% dari ATH)';
                else status = '🧊 JAUH DARI ATH (Downtrend)';

                console.log(`${c.name.padEnd(10)} | Semasa: RM ${data.current.toFixed(3)} | ATH 52w: RM ${data.high52.toFixed(3)} | Jarak: -${pullback}% | ${status}`);
            } else {
                console.log(`${c.name.padEnd(10)} | Data tidak lengkap.`);
            }
            await new Promise(r => setTimeout(r, 1000));
        } catch(e) {
            console.log(`${c.name.padEnd(10)} | Ralat fetching.`);
        }
    }

    await browser.close();
    console.log('\n✅ Siap scan.');
}

scanCounters();
