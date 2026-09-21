#!/usr/bin/env node
/**
 * sync-miti-applicants-login.js
 *
 * Auto-sync data IPO MITI (Portal Filament Baru) menggunakan Puppeteer:
 *
 *   1. Buka https://sahamonline.miti.gov.my/login
 *   2. Masukkan #data.username & #data.password
 *   3. Navigasi ke https://sahamonline.miti.gov.my/dashboard/maklumat-saham
 *   4. Ekstrak JSON data saham dari atribut wire:snapshot
 *
 * Kredential dibaca dari persekitaran (.env atau env vars):
 *   MITI_USERNAME, MITI_PASSWORD
 *
 * Sesuai untuk GitHub Actions — laptop tidak perlu on.
 * NOTA: Data "Jumlah Pelabur Mohon Saham" telah dibuang oleh MITI di portal baru.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_EXPORT_JS = path.join(ROOT, 'data_export.js');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');
const LOGIN_URL = 'https://sahamonline.miti.gov.my/login';
const MAKLUMAT_URL = 'https://sahamonline.miti.gov.my/dashboard/maklumat-saham';

// ---------------------------------------------------------------------------
// Telegram alert
// ---------------------------------------------------------------------------
async function sendTelegram(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return false;
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const body = JSON.stringify({ chat_id: chatId, text });
        await new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            }, (res) => {
                let s = '';
                res.on('data', d => s += d);
                res.on('end', () => { try { const j = JSON.parse(s); j.ok ? resolve() : reject(new Error(JSON.stringify(j))); } catch (e) { reject(e); } });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
        console.log('📢 Telegram alert dihantar.');
        return true;
    } catch (e) {
        console.error('❌ Telegram alert gagal:', e.message);
        return false;
    }
}

async function alertMitiDegraded(reason) {
    const stamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const msg = [
        '🚨 IPO HUNTER: MITI Sync GAGAL (Puppeteer)',
        '',
        `⏰ ${stamp}`,
        `⚠️ ${reason}`,
        '',
        '➡️ Semak: sahamonline.miti.gov.my (portal up?)',
        '➡️ Semak: MITI_USERNAME/MITI_PASSWORD dalam GitHub Secrets',
    ].join('\n');
    await sendTelegram(msg);
}

// ---------------------------------------------------------------------------
// Load .env manual
// ---------------------------------------------------------------------------
function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        lines.forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                if (!(key in process.env)) process.env[key] = val;
            }
        });
    }
}

function formatMitiDate(dateObj) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = months[dateObj.getMonth()];
    const y = dateObj.getFullYear();
    return `${d}-${m}-${y}`;
}

function matchEntry(data, companyName) {
    const name = companyName.toLowerCase().trim();
    return data.find(x => {
        const cn = (x.companyName || '').toLowerCase().trim();
        return cn.includes(name) || name.includes(cn);
    });
}

function parseMaklumatJSON(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('[wire\\:snapshot]').each((i, el) => {
        try {
            const snap = JSON.parse($(el).attr('wire:snapshot'));
            if (snap.data && snap.data.profiles) {
                const profilesArr = snap.data.profiles;
                if (Array.isArray(profilesArr) && Array.isArray(profilesArr[0])) {
                    const actualProfiles = profilesArr[0][0];
                    if (Array.isArray(actualProfiles)) {
                        const profilesData = actualProfiles.filter(p => !p.s);
                        
                        profilesData.forEach(p => {
                            if (!p.name) return;
                            
                            const row = { 
                                company: p.name.trim(), 
                                applicants: null, // Tiada lagi di portal baru
                                offerShares: null, 
                                daysLeft: p.countdownDays !== undefined ? parseInt(p.countdownDays, 10) : null,
                                price: null,
                                mitiCloseDate: p.tarikh_akhir_tiers || p.tarikh || null
                            };
                            
                            if (p.rating) {
                                row.offerShares = parseInt(String(p.rating).replace(/,/g, ''), 10);
                            }
                            
                            if (p.stockIndication) {
                                const priceM = String(p.stockIndication).match(/RM\s*([\d\.]+)/i);
                                if (priceM) row.price = parseFloat(priceM[1]);
                            }
                            
                            results.push(row);
                        });
                    }
                }
            }
        } catch(e) {}
    });
    
    return results;
}

function applyResults(found) {
    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const changes = [];

    for (const f of found) {
        const ipo = matchEntry(data, f.company);
        if (!ipo) {
            console.log(`   ⚠️  ${f.company} ada di portal tapi TIADA dalam data — skip.`);
            continue;
        }

        // Auto-promote Stage 1 -> Stage 2 (MITI Allocation Phase)
        if (ipo.stage < 2) {
            console.log(`   🚀 ${ipo.companyName}: Stage ${ipo.stage} → Stage 2 (MITI Allocation Phase)`);
            ipo.stage = 2;
            ipo.status = 'MITI Allocation Phase';
            ipo.hasMitiTranche = true;
            changes.push({ id: ipo.id, key: 'stage', value: 2 });
            changes.push({ id: ipo.id, key: 'status', value: 'MITI Allocation Phase' });
            changes.push({ id: ipo.id, key: 'hasMitiTranche', value: true });
        }

        if (f.price != null && ipo.price !== f.price) {
            console.log(`   ${ipo.companyName}: harga RM ${ipo.price != null ? ipo.price : 'TBA'} → RM ${f.price}`);
            ipo.price = f.price;
            changes.push({ id: ipo.id, key: 'price', value: f.price });
        }

        if (f.mitiCloseDate) {
            // "29 October 2026"
            let formattedClose = f.mitiCloseDate;
            try {
                formattedClose = formatMitiDate(new Date(f.mitiCloseDate));
            } catch (e) {}
            
            if (ipo.mitiCloseDate !== formattedClose) {
                console.log(`   ${ipo.companyName}: mitiCloseDate ${ipo.mitiCloseDate || '-'} → ${formattedClose} (${f.daysLeft} hari lagi)`);
                ipo.mitiCloseDate = formattedClose;
                changes.push({ id: ipo.id, key: 'mitiCloseDate', value: formattedClose });
            }
            if (!ipo.mitiOpenDate) {
                const openStr = formatMitiDate(new Date());
                ipo.mitiOpenDate = openStr;
                changes.push({ id: ipo.id, key: 'mitiOpenDate', value: openStr });
            }
        }

        if (f.offerShares != null && ipo.mitiOfferShares !== f.offerShares) {
            console.log(`   ${ipo.companyName}: tawaran ${ipo.mitiOfferShares != null ? ipo.mitiOfferShares.toLocaleString() : '-'} → ${f.offerShares.toLocaleString()}`);
            ipo.mitiOfferShares = f.offerShares;
            changes.push({ id: ipo.id, key: 'mitiOfferShares', value: f.offerShares });
        }
    }

    if (changes.length === 0) {
        console.log('ℹ️  Tiada perubahan.');
        return false;
    }

    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(DATA_JS, js, 'utf8');
    fs.writeFileSync(DATA_EXPORT_JS, js, 'utf8');

    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));
    changes.forEach(c => {
        if (!overrides[c.id]) overrides[c.id] = {};
        overrides[c.id][c.key] = c.value;
    });
    fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`✅ Dikemas kini (${changes.length} perubahan) → data.json, data.js, data_export.js, overrides.json`);
    return true;
}

function gitPush() {
    console.log('🚀 Push ke GitHub...');
    try {
        const status = execSync('git status --porcelain').toString();
        if (!status) {
            console.log('   Tiada perubahan untuk di-commit.');
            return;
        }
        execSync('git add data.json data.js data_export.js overrides.json');
        execSync('git commit -m "Automated update: Sync MITI Data (Puppeteer)"');
        execSync('git push origin main');
        console.log('   Push BERJAYA.');
    } catch (e) {
        console.error('❌ GAGAL push:', e.message);
    }
}

// ---------------------------------------------------------------------------
// Main Flow (Puppeteer)
// ---------------------------------------------------------------------------
async function main() {
    const isQuiet = process.argv.includes('--quiet');
    const noPush = process.argv.includes('--no-push');
    if (!isQuiet) console.log('🔄 Memulakan auto-sync MITI (Puppeteer)...');

    loadEnv();
    const username = process.env.MITI_USERNAME;
    const password = process.env.MITI_PASSWORD;
    if (!username || !password) {
        console.error('❌ MITI_USERNAME dan MITI_PASSWORD tidak dijumpai dalam persekitaran atau .env');
        process.exit(1);
    }

    let browser;
    try {
        if (!isQuiet) console.log('   Membuka browser headless...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
        });
        
        const page = await browser.newPage();
        
        if (!isQuiet) console.log('   Navigasi ke login...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
        
        if (!isQuiet) console.log('   Memasukkan kredential...');
        await page.type('#data\\.username', username);
        await page.type('#data\\.password', password);
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);
        
        if (!isQuiet) console.log('   Navigasi ke maklumat-saham...');
        await page.goto(MAKLUMAT_URL, { waitUntil: 'networkidle2' });
        
        const html = await page.content();
        await browser.close();
        
        if (!isQuiet) console.log('   Mengekstrak data JSON...');
        const found = parseMaklumatJSON(html);
        
        if (found.length === 0) {
            console.log('⚠️ Tiada tawaran saham ditemui di portal MITI.');
            process.exit(0);
        }

        if (!isQuiet) console.log(`   Dijumpai ${found.length} saham di MITI.`);
        found.forEach(f => {
            if (!isQuiet) console.log(`   - ${f.company} (Tawaran: ${f.offerShares || '-'}, RM${f.price})`);
        });

        const changed = applyResults(found);
        if (changed && !noPush) gitPush();

    } catch (e) {
        if (browser) await browser.close();
        console.error('❌ Ralat:', e.message);
        await alertMitiDegraded(e.message);
        process.exit(1);
    }
}

main();