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

async function checkOS(companyName) {
    const slug = getSlug(companyName);
    const urls = [
        `https://www.isaham.my/ipo/insights/${slug}`,
        `https://www.isaham.my/ipo-insights/${slug}`,
        `https://www.isaham.my/ipo/insights/${slug.replace(/-berhad|-bhd|-group|-holdings|-corp/g, '')}`
    ];

    for (const url of urls) {
        try {
            const response = await axios.get(url, { headers: HEADERS });
            const $ = cheerio.load(response.data);
            const text = $('body').text();
            
            const osMatch = text.match(/Oversubscription rate:\s*(\d+\.\d+)x/i) || 
                          text.match(/subscribed by\s*(\d+\.\d+)\s*times/i) ||
                          text.match(/OS Rate:\s*(\d+\.\d+)/i) ||
                          text.match(/oversubscribed by\s*(\d+\.\d+)x/i);
            
            if (osMatch) {
                console.log(`Company: ${companyName} -> Found OS: ${osMatch[0]} -> value: ${osMatch[1]}`);
                return parseFloat(osMatch[1]);
            }
        } catch (e) {
            // ignore
        }
    }
    console.log(`Company: ${companyName} -> OS NOT found`);
    return null;
}

async function main() {
    await checkOS("Eckem Holdings Berhad");
    await checkOS("RNG Tech Berhad");
    await checkOS("ENEST Group Berhad");
    await checkOS("SRKK AI Berhad");
}

main();
