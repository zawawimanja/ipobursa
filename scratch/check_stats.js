const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
    console.log('Fetching isaham stats...');
    const response = await axios.get('https://www.isaham.my/ipo/statistics', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    const $ = cheerio.load(response.data);
    $('#statsTable tbody tr').each((i, el) => {
        const cols = $(el).find('td');
        if (cols.length >= 7) {
            const date = $(cols[0]).text().trim();
            const company = $(cols[1]).text().trim();
            const symbol = $(cols[2]).text().trim();
            const listingDate = $(cols[3]).text().trim();
            const ipoPrice = $(cols[4]).text().trim();
            if (symbol.includes('MMCS') || company.includes('MM Computer') || i < 10) {
                console.log(`Row ${i}: date=${date}, company=${company}, symbol=${symbol}, listingDate=${listingDate}, ipoPrice=${ipoPrice}`);
            }
        }
    });
}
main().catch(console.error);
