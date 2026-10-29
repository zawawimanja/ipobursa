const axios = require('axios');
const cheerio = require('cheerio');

async function inspectKlseIpos() {
  const res = await axios.get('https://www.klsescreener.com/v2/ipos', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const $ = cheerio.load(res.data);
  
  // Find all links to IPO or stock pages
  console.log('--- Links ---');
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && (href.includes('/ipo/') || href.includes('/ipos/'))) {
      console.log($(el).text().replace(/\s+/g, ' ').trim(), '->', href);
    }
  });

  // Find any elements with dates or prices
  $('.card, .item, .row, .list-group-item, tr, div').each((i, el) => {
    const t = $(el).text();
    if (t.includes('EcoSys') || t.includes('RedPlanet') || t.includes('EGH') || t.includes('Evocom')) {
      if ($(el).children().length <= 4 && $(el).children().length > 0) {
        console.log('--- Match ---');
        console.log($(el).text().replace(/\s+/g, ' ').trim().substring(0, 200));
      }
    }
  });
}

inspectKlseIpos();
