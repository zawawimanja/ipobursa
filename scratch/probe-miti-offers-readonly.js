#!/usr/bin/env node
// Read-only: log in to SahamOnline and print the live SKB offer list (company, close date,
// indicative price). Does NOT touch data.json/overrides.json and does NOT push.
// Credentials come from .env via the existing sync module; they are never printed.
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const { readAuthenticatedOffers, loadEnv } = require('../scratch/sync-miti-applicants-login');
const { parsePublicOffers } = require('../lib/miti-sync');

(async () => {
    const env = {};
    loadEnv(ROOT, env);
    if (!env.MITI_USERNAME || !env.MITI_PASSWORD) throw new Error('MITI_USERNAME/MITI_PASSWORD not configured in .env');
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const rows = await readAuthenticatedOffers(browser, env.MITI_USERNAME, env.MITI_PASSWORD);
        console.log(`Authenticated MITI offers: ${rows.length}\n`);
        for (const r of rows) {
            console.log(`- ${r.company} | close: ${r.mitiCloseDate || 'TBA'} | shares: ${r.offerShares ?? 'n/a'} | price: ${r.price ?? 'n/a'}`);
        }
        const rules = require('../lib/ipo-rules');
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
        const closesToday = r => {
            const p = rules.dateParts(r.mitiCloseDate);
            if (!p) return false;
            return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` === today;
        };
        const hits = rows.filter(closesToday);
        console.log(`\nTutup hari ini (${today}): ${hits.length ? hits.map(h => h.company).join(', ') : '(tiada)'}`);
        const pub = await fetch('https://sahamonline.miti.gov.my/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(30000) });
        console.log(`Public homepage offers (${pub.status}):`);
        for (const o of parsePublicOffers(await pub.text())) console.log(`- ${o.company}: ${o.open} -> ${o.close}`);
    } finally {
        await browser.close().catch(() => {});
    }
})().catch(e => { console.error('PROBE GAGAL:', e.message); process.exitCode = 1; });
