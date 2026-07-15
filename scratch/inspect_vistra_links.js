const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function main() {
    try {
        const response = await axios.get('https://srmy.vistra.com/', { headers: HEADERS });
        const $ = cheerio.load(response.data);
        
        console.log('Links found:');
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href) {
                console.log(`- ${text}: ${href}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

main();
