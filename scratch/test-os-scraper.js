const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    try {
        const { data } = await axios.get('https://www.malaysiastock.biz/IPO.aspx');
        const $ = cheerio.load(data);
        $('table tr').each((i, el) => {
            const text = $(el).text().replace(/\s+/g, ' ');
            if (text.includes('Evocom') || text.includes('Pioneer')) {
                console.log(text);
            }
        });
    } catch(e) {
        console.log('Error:', e.message);
    }
}
test();
