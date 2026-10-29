const axios = require('axios');
const cheerio = require('cheerio');

async function parseAllKlseIpos() {
  const res = await axios.get('https://www.klsescreener.com/v2/ipos', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const $ = cheerio.load(res.data);
  
  // Find all items
  const items = [];
  $('div').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Open:') && text.includes('Close:') && $(el).children().length > 1 && $(el).children().length < 15) {
      const t = text.replace(/\s+/g, ' ').trim();
      if (!items.some(x => x.text === t)) {
        items.push({ text: t, html: $(el).html() });
      }
    }
  });

  console.log(`Found ${items.length} IPO items on KLSE Screener:`);
  items.forEach((item, idx) => {
    console.log(`\n[${idx + 1}] ${item.text.substring(0, 250)}`);
  });
}

parseAllKlseIpos();
