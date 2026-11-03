// Read-only sweep of PUBLIC sources outside our dataset, looking for IPOs that are
// not in data.json yet (pipeline: approved, exposure, or launching soon).
// Prints HTTP status + candidate company mentions per source. Writes nothing.
const sources = [
    ['i3 IPO (www)', 'https://www.i3investor.com/malaysia-ipo-subscription-status-summary.htm'],
    ['KLSE Screener ipos', 'https://www.klsescreener.com/v2/ipos'],
    ['KLSE Screener announcements', 'https://www.klsescreener.com/v2/announcements'],
    ['Kenari IPO', 'https://kenari.com.my/ipo/'],
    ['Bursa newest securities', 'https://www.bursamalaysia.com/market_information/newest_securities'],
    ['DagangNews terkini', 'https://www.dagangnews.com/index.php/terkini'],
    ['Malay Mail IPO', 'https://www.malaymail.com/search?q=IPO'],
    ['Business Today IPO', 'https://www.businesstoday.com.my/?s=IPO'],
    ['NST IPO', 'https://www.nst.com.my/search?query=IPO']
];

// A loose "company announcing an IPO" pattern: capitalised name near IPO/listing words.
const CLUE = /(Berhad|Bhd|Sdn Bhd)[^.<]{0,80}(IPO|listing|penyenaraian|kumpul|raise|list\b)|(?:IPO|listing|penyenaraian)[^.<]{0,80}(Berhad|Bhd)/i;

const strip = html => html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');

const known = require('../data.json').map(x => `${x.companyName || ''} ${x.symbol || ''}`.toLowerCase());
const isInDataset = snippet => {
    const s = snippet.toLowerCase();
    return known.some(name => name.length > 3 && s.includes(name.split('berhad')[0].trim().slice(0, 12)));
};

(async () => {
    const axios = require('axios');
    for (const [label, url] of sources) {
        try {
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-MY,en;q=0.9,ms;q=0.8'
                },
                timeout: 20000, maxRedirects: 5
            });
            const text = strip(res.data);
            const hits = [...new Set((text.match(CLUE) || []).map(s => s.trim()))].slice(0, 8);
            console.log(`\n### ${label} — HTTP ${res.status}, ${text.length} aksara teks`);
            hits.forEach(h => console.log(`   ${isInDataset(h) ? '[dalam dataset]  ' : '[LUAR dataset]'} ${h.slice(0, 150)}`));
            if (!hits.length) console.log('   (tiada padanan) contoh teks:', text.slice(0, 220));
        } catch (e) {
            console.log(`\n### ${label} — GAGAL: ${e.response ? `HTTP ${e.response.status}` : e.message}`);
        }
    }
})();
