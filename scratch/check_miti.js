const cheerio = require('cheerio');
const axios = require('axios');
(async () => {
    try {
        const { data } = await axios.get('https://www.isaham.my/ipo/miti');
        const $ = cheerio.load(data);
        $('h4, h5').each((i, el) => {
            const tag = el.tagName.toLowerCase();
            const text = $(el).text().trim().substring(0, 120);
            if (tag === 'h4') console.log('H4:', text);
            else if (tag === 'h5') {
                let next = $(el).next();
                let details = '';
                let count = 0;
                while(next.length && !['h5','h4','h3'].includes(next[0].tagName.toLowerCase()) && count < 10) {
                    details += next.text().trim().substring(0, 100) + ' | ';
                    next = next.next();
                    count++;
                }
                console.log('H5:', text, '→', details.substring(0, 300));
            }
        });
    } catch(e) { console.log('Error:', e.message); }
})();
