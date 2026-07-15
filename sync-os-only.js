#!/usr/bin/env node
/**
 * sync-os-only.js
 * 
 * Lightweight daily OS hunter — only targets IPOs in Stage 3 & 4 
 * (ballot closed, not yet listed) that are missing OS rate.
 * 
 * Runs: Mon-Fri at 7pm (after ballot results typically published)
 * Cron: 0 19 * * 1-5 /home/awi/.nvm/versions/node/v25.9.0/bin/node /home/awi/Desktop/ipohunterv2/sync-os-only.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const DATA_JSON_FILE = path.join(__dirname, 'data.json');
const DATA_JS_FILE = path.join(__dirname, 'data.js');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

function getSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

async function fetchOS(companyName) {
    const fullSlug = getSlug(companyName);
    const shortSlug = fullSlug.replace(/-berhad|-bhd|-group|-holdings|-corp/g, '');

    const urls = [
        `https://www.isaham.my/ipo/insights/${fullSlug}`,
        `https://www.isaham.my/ipo-insights/${fullSlug}`,
        `https://www.isaham.my/ipo/insights/${shortSlug}`,
    ];

    for (const url of urls) {
        try {
            const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
            const $ = cheerio.load(response.data);
            const text = $('body').text();

            const osMatch = text.match(/Oversubscription rate:\s*(\d+[\.,]\d+)x/i) ||
                          text.match(/subscribed by\s*(\d+[\.,]\d+)\s*times/i) ||
                          text.match(/OS Rate:\s*(\d+[\.,]\d+)/i) ||
                          text.match(/oversubscribed by\s*(\d+[\.,]\d+)x/i);

            if (osMatch) {
                return parseFloat(osMatch[1].replace(',', '.'));
            }
        } catch (e) {
            // Silently continue to next URL
        }
    }
    return null;
}

async function main() {
    const now = new Date();
    const stamp = now.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    console.log(`\n=== IPO OS Auto-Hunter ===`);
    console.log(`Running at: ${stamp}`);

    const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));
    
    // Target: Stage 3 & 4 only (ballot closed / pre-listing) WITHOUT OS, Shariah only
    const targets = data.filter(ipo => 
        ipo.shariah === true &&
        (ipo.stage === 3 || ipo.stage === 4) && 
        (!ipo.os || ipo.os === 0)
    );

    if (targets.length === 0) {
        console.log('✅ No pre-listing IPOs missing OS data. Nothing to do.');
        return;
    }

    console.log(`🎯 Found ${targets.length} pre-listing IPO(s) to check for OS:\n`);
    
    let updatedCount = 0;

    for (const ipo of targets) {
        process.stdout.write(`  Checking: ${ipo.companyName} ... `);
        const os = await fetchOS(ipo.companyName);
        
        if (os !== null) {
            ipo.os = os;
            ipo.isAutoOS = true;
            updatedCount++;
            console.log(`✅ OS = ${os}x`);
        } else {
            console.log(`⏳ Not available yet`);
        }

        // Small delay to be polite
        await new Promise(r => setTimeout(r, 1000));
    }

    if (updatedCount > 0) {
        // Save back to data.json
        fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 2));

        // Apply overrides if they exist
        const overridesPath = path.join(__dirname, 'overrides.json');
        if (fs.existsSync(overridesPath)) {
            const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
            data.forEach(ipo => {
                const override = overrides[ipo.id];
                if (override) Object.assign(ipo, override);
            });
        }

        // Generate data.js
        const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}`;
        fs.writeFileSync(DATA_JS_FILE, jsContent);

        console.log(`\n✅ Updated ${updatedCount} IPO(s). data.json & data.js saved.`);

        // Auto git push
        try {
            const { execSync } = require('child_process');
            execSync('git add data.json data.js', { cwd: __dirname });
            execSync(`git commit -m "Auto OS update: ${stamp}"`, { cwd: __dirname });
            execSync('git push', { cwd: __dirname });
            console.log(`[Git] ✅ Pushed to GitHub.`);
        } catch (e) {
            console.error(`[Git] ❌ Push failed:`, e.message);
        }
    } else {
        console.log(`\n⏳ No OS data found yet. Will retry next scheduled run.`);
    }

    console.log(`=== Done ===\n`);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
