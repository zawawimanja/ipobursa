const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const url = 'https://www.bursamalaysia.com/search?query=Evocom+oversubscribed';
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const text = $('body').text().replace(/\s+/g, ' ');
        console.log("Snippet match:", text.match(/oversubscribed by ([\d\.]+)/i));
    } catch(e) {
        console.log("Error:", e.message);
    }
}
test();
