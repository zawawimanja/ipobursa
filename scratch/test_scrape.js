const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function main() {
    const res = await axios.get('https://www.isaham.my/ipo/miti', { headers: HEADERS });
    const $ = cheerio.load(res.data);
    
    $('h3, h4, h5').each((i, el) => {
        const text = $(el).text().trim();
        const tag = el.tagName.toLowerCase();
        console.log(`${tag.toUpperCase()}: "${text}"`);
    });
}

main().catch(console.error);
