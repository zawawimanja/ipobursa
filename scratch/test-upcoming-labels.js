const axios = require('axios');
const cheerio = require('cheerio');

async function testUpcoming() {
    try {
        console.log('Fetching https://www.isaham.my/ipo...');
        const res = await axios.get('https://www.isaham.my/ipo', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        
        $('.f-ipo-card').slice(0, 3).each((i, el) => {
            console.log(`Card ${i}: ${$(el).find('.card-title').text().trim()}`);
            $(el).find('span.font-weight-bold').each((_, span) => {
                const label = $(span).text().trim();
                const val = $(span).next('span').text().trim();
                console.log(`  Label: "${label}" | Value: "${val}"`);
            });
            console.log('-'.repeat(40));
        });
    } catch(e) {
        console.error('Error:', e.message);
    }
}

testUpcoming();
