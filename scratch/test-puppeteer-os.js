const puppeteer = require('puppeteer');

async function scrapeOS(companyName) {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
        
        const url = `https://www.bursamalaysia.com/search?query=${encodeURIComponent(companyName + ' oversubscribed')}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const bodyText = await page.evaluate(() => document.body.innerText);
        const match = bodyText.match(/oversubscribed by ([\d\.]+)/i);
        if (match) {
            console.log(`${companyName} OS found:`, match[1]);
        } else {
            console.log(`${companyName} OS not found in text.`);
        }
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

scrapeOS('Evocom');
scrapeOS('Pioneer Heat');
