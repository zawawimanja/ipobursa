const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');

async function inspectMiti() {
  const res = await axios.get('https://sahamonline.miti.gov.my', {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const $ = cheerio.load(res.data);
  
  // Find all cards / elements containing company names or dates
  $('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('KK MART') || text.includes('PANDA') || text.includes('SCA')) {
      if ($(el).children().length > 0 && $(el).children().length <= 5) {
        console.log('--- Found Container ---');
        console.log($(el).html().substring(0, 500));
      }
    }
  });
}

inspectMiti();
