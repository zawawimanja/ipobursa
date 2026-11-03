// Read-only: list every UPCOMING IPO card on KLSE Screener (ticker, board, sector, dates, price).
// Nothing is written — this is for checking what is coming next in a given theme.
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function iso(day, month, year) {
    const m = MONTHS[String(month).slice(0, 3)];
    const d = parseInt(day, 10);
    if (m === undefined || !Number.isFinite(d)) return null;
    return `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

(async () => {
    const axios = require('axios');
    const cheerio = require('cheerio');
    const resp = await axios.get('https://www.klsescreener.com/v2/ipos', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-MY,en;q=0.9'
        },
        timeout: 25000
    });
    const $ = cheerio.load(resp.data);

    $('div.card.mb-3.p-0').each((i, card) => {
        const cardEl = $(card);
        const dateBlock = cardEl.find('div[style*="width:100px"]').first();
        const styleStr = dateBlock.attr('style') || '';
        if (styleStr.includes('color:inherit') || styleStr.includes('background-color:inherit')) return;

        const year = dateBlock.attr('title') || String(new Date().getFullYear());
        const listing = iso(dateBlock.find('h3').text().trim(), dateBlock.find('div.pt-2').text().trim(), year);
        const ticker = cardEl.find('h4 a').first().text().trim();
        const company = cardEl.find('h4').first().next('span').text().trim() || cardEl.find('span.ml-3').first().text().trim();

        let board = null, sector = null, open = null, close = null, price = null;
        cardEl.find('span').each((j, el) => {
            const label = $(el).children('.text-muted').first().text().replace(/[:\s]+$/g, '').trim().toLowerCase();
            const value = $(el).text().replace($(el).children('.text-muted').first().text(), '').trim();
            if (label === 'board') board = board || value;
            if (label === 'sector') sector = sector || value;
        });
        const text = cardEl.text().replace(/\s+/g, ' ');
        const pick = re => (text.match(re) || [])[1] || null;
        open = pick(/Open:\s*(\d{1,2}\s+\w{3})/);
        close = pick(/Close:\s*(\d{1,2}\s+\w{3})/);
        price = pick(/IPO Price:\s*(RM[\d.,]+)/i) || pick(/(RM[\d.,]+)/);
        const fmt = v => (v ? `${v} ${String(year).slice(-2)}` : '-');
        console.log([
            String(ticker || '-').padEnd(10),
            String(company).slice(0, 36).padEnd(36),
            String(board || '-').padEnd(11),
            String(sector || '-').slice(0, 44).padEnd(44),
            `RM${price || '?'}`.padEnd(8),
            `open ${fmt(open)}`, `close ${fmt(close)}`, `listing ${listing || '-'}`
        ].join(' | '));
    });
})().catch(e => { console.error('GAGAL:', e.message); process.exitCode = 1; });
