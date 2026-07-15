const axios = require('axios');
const cheerio = require('cheerio');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

axios.get('https://www.isaham.my/ipo/insights/stratus-global-holdings-berhad', { headers: HEADERS }).then(r => {
    const $ = cheerio.load(r.data);
    
    // Find all links
    console.log('Links found on the page:');
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && (href.toLowerCase().includes('prospectus') || text.toLowerCase().includes('prospectus') || href.toLowerCase().includes('bursamalaysia.com'))) {
            console.log(` - Text: "${text}" | Href: ${href}`);
        }
    });
}).catch(e => console.error(e.message));
