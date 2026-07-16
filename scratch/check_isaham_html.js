const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://www.isaham.my/ipo/insights/adnex-group-berhad';

axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  .then(res => {
     const $ = cheerio.load(res.data);
     console.log('=== PAGE SCRAPE ===\n');
     
     // 1. Check if there are tables
     console.log('Tables found:', $('table').length);
     $('table').each((i, el) => {
         console.log(`\n--- Table ${i} ---`);
         console.log($(el).text().trim().replace(/\s+/g, ' ').substring(0, 400));
     });
     
     // 2. Check the entire text context to see what details are provided (e.g. market cap, PE, proceeds, SWOT)
     console.log('\n--- Card Bodies / Content ---');
     $('.card-body').each((i, el) => {
         const txt = $(el).text().replace(/\s+/g, ' ').trim();
         if (txt.includes('Financials') || txt.includes('Revenue') || txt.includes('Profit') || txt.includes('Valuation')) {
             console.log(`Card ${i} (${txt.substring(0, 100)}...):`);
             console.log(txt.substring(0, 500));
             console.log('-------------------------');
         }
     });
  })
  .catch(err => console.error(err));
