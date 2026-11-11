const axios = require('axios');
const cheerio = require('cheerio');
const { parseIndex } = require('../sync-balloting');

async function searchAnnouncements() {
  const dates = ['2026-11-12', '2026-11-10', '2026-11-06', '2026-11-04'];
  for (const d of dates) {
    const url = `https://www.klsescreener.com/v2/announcements?category=SA%2CSACO&date_to=${d}`;
    try {
      const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const notices = parseIndex(res.data);
      console.log(`\n=== Notices on ${d} (total ${notices.length}) ===`);
      for (const n of notices) {
        if (/keb|impact|mydcd|dcd|caring|ska|initial public offering/i.test(n.title)) {
          console.log(`[${n.url}] ${n.title}`);
        }
      }
    } catch (e) {
      console.error(`Error for ${d}:`, e.message);
    }
  }
}
searchAnnouncements();

