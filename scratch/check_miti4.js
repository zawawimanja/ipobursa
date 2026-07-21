const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        console.log('Navigating to MITI page...');
        await page.goto('https://www.isaham.my/ipo/miti', { waitUntil: 'networkidle0', timeout: 45000 });
        console.log('Page loaded!');
        
        const title = await page.title();
        console.log('Title:', title);
        
        const h4s = await page.evaluate(() => Array.from(document.querySelectorAll('h4'), el => el.textContent.trim().substring(0, 100)));
        console.log('H4s:', h4s.join(' | '));
        
        const h5s = await page.evaluate(() => Array.from(document.querySelectorAll('h5'), el => el.textContent.trim().substring(0, 100)));
        console.log('H5s:', h5s.join(' | '));
        
        const bodyText = await page.evaluate(() => document.body.innerText);
        const matches = bodyText.match(/\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}/g);
        console.log('Dates:', matches ? [...new Set(matches)].join(', ') : 'none found');
        
    } catch(e) {
        console.log('Error:', e.message);
        console.log('Stack:', e.stack);
    } finally {
        if (browser) await browser.close();
    }
})();
