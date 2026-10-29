#!/usr/bin/env node
// Current SahamOnline uses Filament/Livewire. Credentials stay in .env or GitHub Secrets.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseMaklumatJSON, matchEntry, readData, saveData, updateFields } = require('../lib/miti-sync');
const { updateSourceStatus, safeMessage } = require('../lib/sync-health');

const ROOT = path.join(__dirname, '..');
const LOGIN_URL = 'https://sahamonline.miti.gov.my/dashboard/login';
const MAKLUMAT_URL = 'https://sahamonline.miti.gov.my/dashboard/maklumat-saham';

function loadEnv(root = ROOT, env = process.env) {
    const file = path.join(root, '.env');
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
}

function applyResults(found, root = ROOT) {
    const { data, overrides } = readData(root);
    let updated = 0;
    let unmatched = 0;
    for (const row of found) {
        const ipo = matchEntry(data, row.company);
        if (!ipo) { unmatched++; continue; }
        const fields = { hasMitiTranche: true };
        if (ipo.stage === 1) Object.assign(fields, { stage: 2, status: 'MITI Allocation Phase' });
        // The portal quotes an indicative price; do not replace an announced public IPO price.
        if ([1, 2, 6].includes(ipo.stage) && row.price != null) fields.price = row.price;
        if (row.mitiCloseDate) fields.mitiCloseDate = row.mitiCloseDate;
        if (row.offerShares != null) fields.mitiOfferShares = row.offerShares;
        if (row.applicants != null) fields.mitiApplicants = row.applicants;
        if (updateFields(ipo, fields, overrides)) updated++;
    }
    if (updated) saveData(root, data, overrides);
    return { updated, unmatched };
}

function checkResponse(response, phase) {
    if (!response) throw new Error(`MITI ${phase} returned no HTTP response; existing data retained.`);
    const status = response.status();
    if (status >= 400) throw new Error(`MITI ${phase} HTTP ${status}${status === 403 ? ' (access denied from this runner)' : ''}; existing data retained.`);
}

async function readAuthenticatedOffers(browser, username, password) {
    const page = await browser.newPage();
    checkResponse(await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }), 'login page');
    try {
        await page.waitForSelector('#data\\.username', { timeout: 10000 });
        await page.waitForSelector('#data\\.password', { timeout: 10000 });
    } catch {
        throw new Error('MITI login form was not recognized (access challenge or changed portal); existing data retained.');
    }
    await page.type('#data\\.username', username);
    await page.type('#data\\.password', password);
    // Livewire submits asynchronously: invalid credentials render errors without a navigation.
    await Promise.all([
        page.waitForFunction(() => !/\/login\/?$/.test(location.pathname) ||
            [...document.querySelectorAll('[data-validation-error], .fi-fo-field-wrp-error-message')]
                .some(el => el.textContent.trim() && el.getClientRects().length), { timeout: 45000 }),
        page.click('form[wire\\:submit="authenticate"] button[type="submit"]')
    ]).catch(() => { throw new Error('MITI login was not confirmed; check portal availability and configured credentials.'); });
    if (/\/login\/?(?:\?|$)/.test(page.url())) throw new Error('MITI login was rejected; check MITI_USERNAME/MITI_PASSWORD in GitHub Secrets.');
    checkResponse(await page.goto(MAKLUMAT_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }), 'share page');
    if (/\/login\/?(?:\?|$)/.test(page.url())) throw new Error('MITI session was not accepted for the share page.');
    return parseMaklumatJSON(await page.content());
}

async function alertFailure(message, env) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
    try {
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
            body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `MITI sync failed: ${message}` })
        });
    } catch { console.error('MITI failure notification could not be delivered.'); }
}

async function syncApplicants(options = {}) {
    const root = options.root || ROOT;
    const env = options.env || process.env;
    loadEnv(root, env);
    if (!env.MITI_USERNAME || !env.MITI_PASSWORD) {
        const message = 'MITI credentials are not configured; authenticated offer details were not checked.';
        updateSourceStatus('miti-applicants', { status: 'skipped', message }, root);
        return { skipped: true, updated: 0 };
    }
    let browser;
    try {
        const launch = options.launch || (async () => {
            const { default: puppeteer } = await import('puppeteer');
            return puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        });
        browser = await launch();
        const found = await readAuthenticatedOffers(browser, env.MITI_USERNAME, env.MITI_PASSWORD);
        const result = applyResults(found, root);
        const message = `${found.length} authenticated MITI offers verified; ${result.updated} updated; ${result.unmatched} unmatched.`;
        updateSourceStatus('miti-applicants', { status: result.unmatched ? 'partial' : 'success', message }, root);
        return { found: found.length, ...result };
    } catch (error) {
        const message = safeMessage(error.message).split(env.MITI_USERNAME).join('[redacted]').split(env.MITI_PASSWORD).join('[redacted]');
        updateSourceStatus('miti-applicants', { status: 'failed', message }, root);
        if (options.alerts) await alertFailure(message, env);
        throw new Error(message);
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

function gitPush() {
    const files = ['data.json', 'data.js', 'data_export.js', 'overrides.json', 'sync-status.js'];
    execFileSync('git', ['add', ...files], { cwd: ROOT, stdio: 'inherit' });
    if (!execFileSync('git', ['diff', '--cached', '--name-only', '--', ...files], { cwd: ROOT, encoding: 'utf8' }).trim()) return;
    execFileSync('git', ['commit', '-m', 'Automated update: MITI offer details', '--', ...files], { cwd: ROOT, stdio: 'inherit' });
    execFileSync('git', ['push', 'origin', 'main'], { cwd: ROOT, stdio: 'inherit' });
}

if (require.main === module) {
    syncApplicants({ alerts: !process.argv.includes('--no-alerts') }).then(result => {
        console.log(`MITI details: ${JSON.stringify(result)}`);
        if (result.updated && !process.argv.includes('--no-push')) gitPush();
        if (result.unmatched) process.exitCode = 1;
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { syncApplicants, applyResults, parseMaklumatJSON, readAuthenticatedOffers, checkResponse, loadEnv };
