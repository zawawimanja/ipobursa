const axios = require('axios');
const cheerio = require('cheerio');

async function testLinks() {
  const urls = [
    'https://klse.i3investor.com/jsp/ipo/listing.jsp',
    'https://klse.i3investor.com/web/ipo/calendar',
    'https://klse.i3investor.com/web/ipo/view'
  ];
  for (const u of urls) {
    try {
      const res = await axios.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 });
      const $ = cheerio.load(res.data);
      console.log(u, '-> Status:', res.status, '| Tables:', $('table').length, '| Title:', $('title').text());
    } catch(e) {
      console.log(u, '-> Error:', e.message);
    }
  }
}

testLinks();
