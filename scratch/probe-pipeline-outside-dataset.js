// Read-only: hunt the IPO pipeline OUTSIDE data.json using news RSS feeds
// (Google News + Bing News both answer HTTP 200 from this machine).
// Marks each headline [LUAR dataset] when the company is not in our records yet.
const axios = require('axios');

const known = require('../data.json')
    .map(x => `${x.companyName || ''} ${x.symbol || ''}`.toLowerCase().replace(/\[.*?\]/g, '').trim())
    .filter(Boolean);

const queries = [
    'IPO "data centre" Malaysia',
    'IPO semiconductor Bursa Malaysia',
    '"prospectus exposure" Malaysia IPO',
    'MITI Bumiputera shares IPO allocation',
    '"plans to list" OR "eyes listing" Bursa Malaysia',
    'IPO pipeline Malaysia fourth quarter 2026',
    'Bumiputera tranche IPO November 2026'
];

const feedUrl = (q, engine) => {
    const encoded = encodeURIComponent(`${q} when:60d`);
    return engine === 'bing'
        ? `https://www.bing.com/news/search?q=${encoded}&format=RSS&mkt=en-MY`
        : `https://news.google.com/rss/search?q=${encoded}&hl=en-MY&gl=MY&ceid=MY:en`;
};

const pick = (xml, tag) => (xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [])[1];

const parseItems = xml => {
    const out = [];
    xml.split(/<item[ >]/).slice(1).forEach(chunk => {
        chunk = `<item>${chunk}`;
        const title = (pick(chunk, 'title') || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const date = (pick(chunk, 'pubDate') || '').trim();
        const source = (pick(chunk, 'source') || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        if (title) out.push({ title, date, source });
    });
    return out;
};

const decode = s => s
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

(async () => {
    const seen = new Set();
    for (const q of queries) {
        for (const engine of ['google', 'bing']) {
            let items = [];
            try {
                const res = await axios.get(feedUrl(q, engine), {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' },
                    timeout: 20000
                });
                items = parseItems(res.data);
            } catch (e) {
                console.log(`!! ${engine} / "${q}" — ${e.response ? `HTTP ${e.response.status}` : e.message}`);
                continue;
            }
            for (const it of items.slice(0, 12)) {
                const title = decode(it.title);
                const key = title.toLowerCase().slice(0, 60);
                if (seen.has(key)) continue;
                seen.add(key);
                const lower = title.toLowerCase();
                const inData = known.some(name => {
                    const stem = name.split('berhad')[0].trim().slice(0, 12);
                    return stem.length >= 4 && lower.includes(stem);
                });
                console.log(`${inData ? '[dalam]' : '[LUAR]'} ${String(it.date).slice(5, 16)} | ${String(it.source).slice(0, 20).padEnd(20)} | ${title.slice(0, 118)}`);
            }
        }
    }
    console.log(`\nJumlah tajuk unik: ${seen.size}`);
})();
