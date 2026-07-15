const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

function getSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

async function main() {
    const companyName = "Stratus Global Holdings Berhad";
    const slug = getSlug(companyName);
    const urls = [
        `https://www.isaham.my/ipo/insights/${slug}`,
        `https://www.isaham.my/ipo-insights/${slug}`,
        `https://www.isaham.my/ipo/insights/${slug.replace(/-berhad|-bhd|-group|-holdings|-corp/g, '')}`
    ];

    for (const url of urls) {
        try {
            console.log(`Trying URL: ${url}`);
            const response = await axios.get(url, { headers: HEADERS });
            const $ = cheerio.load(response.data);
            const text = $('body').text();
            
            const osMatch = text.match(/Oversubscription rate:\s*(\d+\.\d+)x/i) || 
                          text.match(/subscribed by\s*(\d+\.\d+)\s*times/i) ||
                          text.match(/OS Rate:\s*(\d+\.\d+)/i) ||
                          text.match(/oversubscribed by\s*(\d+\.\d+)x/i);
            
            if (osMatch) {
                console.log(`  Found OS: ${osMatch[0]} -> value: ${osMatch[1]}`);
                break;
            } else {
                console.log(`  No OS found.`);
            }
        } catch (e) {
            console.log(`  Failed: ${e.message}`);
        }
    }
}

main();
