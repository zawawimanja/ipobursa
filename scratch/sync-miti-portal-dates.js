#!/usr/bin/env node
/**
 * sync-miti-portal-dates.js
 *
 * Auto-sync tarikh buka/tutup MITI terus dari halaman AWAM portal SahamOnline
 * (https://sahamonline.miti.gov.my/portal/index) — TIADA login diperlukan.
 *
 * Kemas kini data.js/data.json/data_export.js + overrides.json HANYA jika
 * tarikh berubah (elak tulis fail sia-sia setiap kali). Dijalankan oleh
 * auto_runner.js setiap 30 minit waktu bekerja.
 *
 * Guna: node scratch/sync-miti-portal-dates.js
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORTAL = 'https://sahamonline.miti.gov.my/portal/index';

const MONTHS = {
    'januari': 'Jan', 'februari': 'Feb', 'mac': 'Mar', 'april': 'Apr', 'mei': 'May',
    'jun': 'Jun', 'julai': 'Jul', 'ogos': 'Aug', 'september': 'Sep', 'oktober': 'Oct',
    'november': 'Nov', 'disember': 'Dec'
};

const TARGETS = [
    { id: 'big-caring-group-bhd', match: /big caring/i },
    { id: 'ioipg-malaysia-reit',   match: /ioipg/i },
    { id: 'mydcd-berhad',          match: /mydcd/i },
];

function fmt(d, mon, y) {
    const m = MONTHS[String(mon).toLowerCase()];
    if (!m) return null;
    return `${String(d).padStart(2, '0')}-${m}-${y}`;
}

async function main() {
    let resp;
    try {
        resp = await axios.get(PORTAL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8',
            },
            timeout: 15000,
        });
    } catch (e) {
        console.log(`⚠️  Gagal fetch portal: ${e.message}`);
        process.exit(1);
    }

    const $ = cheerio.load(resp.data);
    const text = $('body').text();

    // Corak: "Makluman pembukaan saham bagi syarikat BIG CARING GROUP BHD
    //         adalah bermula pada 14 Ogos 2026 sehingga 23 Ogos 2026"
    const re = /bagi syarikat\s+(.+?)\s*\n\s*adalah bermula pada\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+sehingga\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/g;
    const found = {};
    let m;
    while ((m = re.exec(text))) {
        const company = m[1].trim();
        const t = TARGETS.find(x => x.match.test(company));
        if (!t) continue;
        const open = fmt(m[2], m[3], m[4]);
        const close = fmt(m[5], m[6], m[7]);
        if (open && close) found[t.id] = { open, close, company };
    }

    if (Object.keys(found).length === 0) {
        console.log('⚠️  Tiada tawaran MITI dikesan pada halaman portal.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
    const changes = [];
    for (const [id, v] of Object.entries(found)) {
        const ipo = data.find(x => x.id === id);
        if (!ipo) { console.log(`⚠️  ${id} tiada dalam data — skip`); continue; }
        if (ipo.mitiOpenDate !== v.open || ipo.mitiCloseDate !== v.close) {
            console.log(`   ${v.company}: ${ipo.mitiOpenDate}→${v.open} | ${ipo.mitiCloseDate}→${v.close}`);
            ipo.mitiOpenDate = v.open;
            ipo.mitiCloseDate = v.close;
            changes.push(id);
        }
    }

    if (changes.length === 0) {
        console.log('✅ Tarikh MITI masih sama dengan portal rasmi — tiada perubahan.');
        return;
    }

    // Tulis data files + overrides
    fs.writeFileSync(path.join(ROOT, 'data.json'), JSON.stringify(data, null, 4), 'utf8');
    const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(path.join(ROOT, 'data.js'), js, 'utf8');
    fs.writeFileSync(path.join(ROOT, 'data_export.js'), js, 'utf8');

    const ovPath = path.join(ROOT, 'overrides.json');
    const overrides = JSON.parse(fs.readFileSync(ovPath, 'utf8'));
    for (const id of changes) {
        if (!overrides[id]) overrides[id] = {};
        overrides[id].mitiOpenDate = found[id].open;
        overrides[id].mitiCloseDate = found[id].close;
    }
    fs.writeFileSync(ovPath, JSON.stringify(overrides, null, 4), 'utf8');

    console.log(`\n📅 Tarikh MITI dikemas kini (${changes.length} IPO) — ikut portal rasmi:`);
    console.log('   Fail: data.json, data.js, data_export.js, overrides.json');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
