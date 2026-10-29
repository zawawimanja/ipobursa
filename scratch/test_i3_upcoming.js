const axios = require('axios');
const cheerio = require('cheerio');

async function checkI3Upcoming() {
  const res = await axios.get('https://klse.i3investor.com/web/ipo/upcoming', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const $ = cheerio.load(res.data);
  console.log('Tables:', $('table').length);
  $('table').each((i, tbl) => {
    console.log(`\n--- Table ${i} ---`);
    $(tbl).find('tr').each((j, tr) => {
      const cells = [];
      $(tr).find('th, td').each((k, td) => {
        cells.push($(td).text().replace(/\s+/g, ' ').trim());
      });
      console.log(`Row ${j}:`, cells.join(' | '));
    });
  });
}

checkI3Upcoming();
