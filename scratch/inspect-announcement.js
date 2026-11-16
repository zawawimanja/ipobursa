const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const res = await axios.get('https://www.klsescreener.com/v2/announcements/view/11697775', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const $ = cheerio.load(res.data);
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && (href.includes('pdf') || href.includes('attachment') || href.includes('FileAccess'))) {
      console.log('PDF link:', href, $(el).text().trim());
    }
  });
}
test();
