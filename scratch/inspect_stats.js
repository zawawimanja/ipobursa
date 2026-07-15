const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function main() {
    try {
        const response = await axios.get('https://www.isaham.my/ipo/statistics', { headers: HEADERS });
        const $ = cheerio.load(response.data);
        
        console.log('Headers:');
        $('#statsTable thead th').each((i, el) => {
            console.log(`Column ${i}: ${$(el).text().trim()}`);
        });

        console.log('\nFirst Row:');
        $('#statsTable tbody tr').first().find('td').each((i, el) => {
            console.log(`Col ${i}: ${$(el).text().trim()}`);
        });
    } catch (e) {
        console.error(e);
    }
}

main();
