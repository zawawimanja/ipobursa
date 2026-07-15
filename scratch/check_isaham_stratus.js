const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function main() {
    const urls = [
        'https://www.isaham.my/ipo/stratus-global',
        'https://www.isaham.my/ipo-insights/stratus-global',
        'https://www.isaham.my/stock/stratus/insights',
        'https://www.isaham.my/ipo/stratus'
    ];

    for (const url of urls) {
        try {
            const response = await axios.get(url, { headers: HEADERS });
            const $ = cheerio.load(response.data);
            const text = $('body').text();
            
            console.log(`URL: ${url}`);
            const osMatch = text.match(/Oversubscription rate:\s*(\d+\.\d+)x/i) || 
                          text.match(/subscribed by\s*(\d+\.\d+)\s*times/i) ||
                          text.match(/OS Rate:\s*(\d+\.\d+)/i) ||
                          text.match(/oversubscribed by\s*(\d+\.\d+)x/i);
            
            if (osMatch) {
                console.log(`  Found OS: ${osMatch[0]} -> value: ${osMatch[1]}`);
            } else {
                console.log(`  No OS found. Body snippet: ${text.replace(/\s+/g, ' ').substring(0, 300)}`);
            }
        } catch (e) {
            console.log(`URL: ${url} failed with: ${e.message}`);
        }
    }
}

main();
