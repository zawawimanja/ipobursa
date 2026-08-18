#!/usr/bin/env node
/* Diagnostic sementara — untuk debug Cloudflare challenge di isaham.my */
const puppeteer = require('puppeteer');
const path = require('path');

const PROFILE = path.join(__dirname, '.isaham-profile');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        channel: 'chrome',
        userDataDir: PROFILE,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,900'],
        defaultViewport: { width: 1280, height: 900 },
    });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = window.chrome || { runtime: {} };
    });
    await page.setUserAgent(UA);

    const client = await page.createCDPSession();
    await client.send('Network.enable');
    // Baca cookie domain isaham.my
    const { cookies } = await client.send('Network.getCookies', { urls: ['https://www.isaham.my/'] });
    console.log('COOKIES isaham.my:');
    cookies.forEach(c => {
        const exp = c.expires ? new Date(c.expires * 1000).toISOString() : '(session)';
        console.log(`  ${c.name} (exp ${exp})`);
    });

    try { await page.goto('https://www.isaham.my/ipo', { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { console.log('goto warn:', e.message); }

    // Poll 30s — JS challenge auto-solve sering ambil masa
    let state = '';
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
            state = (await page.evaluate(() => document.body ? document.body.innerText.slice(0, 200) : '')).replace(/\s+/g, ' ');
        } catch (e) { state = '(frame detached)'; }
        console.log(`[${i * 2}s] ${state}`);
        if (state.includes('f-ipo-card') || (await page.$('.f-ipo-card'))) break;
    }

    const frames = page.frames().map(f => f.url().slice(0, 80)).join('\n');
    console.log('FRAMES:\n' + frames);

    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });