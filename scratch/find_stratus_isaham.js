const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function main() {
    try {
        const response = await axios.get('https://www.isaham.my/ipo', { headers: HEADERS });
        const $ = cheerio.load(response.data);
        
        console.log('Searching for Stratus on main IPO page:');
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim().replace(/\s+/g, ' ');
            if (href && (href.toLowerCase().includes('stratus') || text.toLowerCase().includes('stratus'))) {
                console.log(`- ${text}: ${href}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

main();
