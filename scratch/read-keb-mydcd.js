const axios = require('axios');
const cheerio = require('cheerio');

async function readNotice(url, name) {
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(res.data);
  console.log(`\n=================== ${name} (${url}) ===================`);
  console.log('Heading:', $('#main h3').text().trim());
  $('table tr').each((i, el) => {
    console.log($(el).find('td').first().text().trim(), ':', $(el).find('td').last().text().trim());
  });
  console.log('--- Paragraphs ---');
  $('#main p').each((i, el) => {
    const t = $(el).text().trim().replace(/\s+/g, ' ');
    if (t) console.log(`[P${i}]`, t);
  });
}

async function run() {
  await readNotice('https://www.klsescreener.com/v2/announcements/view/11697819', 'KEB BERHAD');
  await readNotice('https://www.klsescreener.com/v2/announcements/view/11697639', 'MYDCD BERHAD');
}

run();

