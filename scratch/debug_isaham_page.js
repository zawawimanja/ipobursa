/**
 * debug_isaham_page.js
 * Check what text isaham actually shows on an insights page
 * to find the right MITI keywords to search for
 */
const puppeteer = require('puppeteer');

async function main() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    // Test with KEEMING - confirmed HAS MITI (40.625M shares for Bumiputera via MITI)
    const url = 'https://www.isaham.my/ipo/insights/keeming';
    console.log('Fetching:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== PAGE TEXT (KEEMING) ===\n');
    console.log(bodyText.substring(0, 5000));
    console.log('\n=== SEARCHING FOR MITI/BUMI KEYWORDS ===');

    const lines = bodyText.split('\n').filter(l => 
        /miti|bumi|ministry|saham|allocation|tranche|lot/i.test(l)
    );
    console.log('Relevant lines found:', lines.length);
    lines.forEach(l => console.log(' >>', l.trim()));

    await browser.close();
}
main().catch(console.error);
