#!/usr/bin/env node
/* Diagnostic: cuba auto-click Turnstile widget dalam iframe Cloudflare (headless) */
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

    try { await page.goto('https://www.isaham.my/ipo', { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { console.log('goto warn:', e.message); }

    // Tunggu frame Turnstile muncul
    await new Promise(r => setTimeout(r, 5000));
    const frames = page.frames();
    console.log(`Frames: ${frames.length}`);
    for (const f of frames) {
        if (f.url().includes('challenges.cloudflare.com')) {
            console.log('Turnstile frame:', f.url().slice(0, 120));
            try {
                const html = await f.content();
                console.log('Frame HTML (first 1500):\n', html.slice(0, 1500));
                const info = await f.evaluate(() => {
                    const inputs = [...document.querySelectorAll('input,button,div[role]')];
                    return inputs.slice(0, 15).map(i => ({
                        tag: i.tagName, type: i.type || '', role: i.getAttribute('role') || '',
                        id: i.id, cls: (i.className || '').toString().slice(0, 40),
                        name: i.name || ''
                    }));
                });
                console.log('Interactive elements:', JSON.stringify(info, null, 2));
            } catch (e) {
                console.log('Frame content error:', e.message);
            }
        }
    }
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });