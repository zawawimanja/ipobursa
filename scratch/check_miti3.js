const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.isaham.my/ipo/miti', { waitUntil: 'networkidle0', timeout: 30000 });
        
        const result = await page.evaluate(() => {
            const lines = [];
            
            document.querySelectorAll('h4, h5').forEach(el => {
                const tag = el.tagName.toLowerCase();
                const text = el.textContent.trim().substring(0, 120);
                if (tag === 'h4') {
                    lines.push('H4: ' + text);
                } else if (tag === 'h5') {
                    lines.push('H5: ' + text);
                    let next = el.nextElementSibling;
                    let details = '';
                    let count = 0;
                    while(next && !['H5','H4','H3'].includes(next.tagName) && count < 8) {
                        details += next.textContent.trim().substring(0, 120) + ' || ';
                        next = next.nextElementSibling;
                        count++;
                    }
                    if (details) lines.push('  details: ' + details.substring(0, 400));
                }
            });
            
            // Also look for date patterns
            const bodyText = document.body.innerText;
            const dateRegex = /\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}/g;
            const dates = bodyText.match(dateRegex);
            if (dates) lines.push('Dates found: ' + [...new Set(dates)].join(', '));
            
            return lines.join('\n');
        });
        
        console.log(result);
    } catch(e) {
        console.log('Error:', e.message);
    } finally {
        if (browser) await browser.close();
    }
})();
