const axios = require('axios');
const cheerio = require('cheerio');

async function check() {
  const urls = [
    'https://klse.i3investor.com/web/stock/overview/0481',
    'https://klse.i3investor.com/web/stock/overview/KEB'
  ];
  for (const url of urls) {
    console.log('Fetching', url);
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000
      });
      const $ = cheerio.load(res.data);
      let priceText = null, openPriceText = null, high = null, low = null, vol = null;
      $('p').each((idx, el) => {
        const t = $(el).text().trim();
        if (t === 'Last Price') {
          priceText = $(el).next('p').text().trim();
        } else if (t === 'Open') {
          openPriceText = $(el).parent().next('.col-6').find('p').text().trim();
        } else if (t === 'High') {
          high = $(el).parent().next('.col-6').find('p').text().trim();
        } else if (t === 'Low') {
          low = $(el).parent().next('.col-6').find('p').text().trim();
        } else if (t === 'Volume') {
          vol = $(el).parent().next('.col-6').find('p').text().trim();
        }
      });
      console.log('Result for', url, { priceText, openPriceText, high, low, vol });
    } catch (e) {
      console.error(url, e.message);
    }
  }
}

check();
