const cheerio = require('cheerio');
const axios = require('axios');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8'
};

(async () => {
    try {
        const { data } = await axios.get('https://www.isaham.my/ipo/miti', { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        
        // Try different selectors
        console.log('=== Title ===');
        console.log($('title').text().trim());
        
        console.log('\n=== All h4 tags ===');
        $('h4').each((i, el) => console.log('  ', $(el).text().trim().substring(0, 150)));
        
        console.log('\n=== All h5 tags ===');
        $('h5').each((i, el) => {
            console.log('  H5:', $(el).text().trim().substring(0, 120));
            let next = $(el).next();
            let details = '';
            let count = 0;
            while(next.length && !['h5','h4','h3'].includes(next[0].tagName.toLowerCase()) && count < 8) {
                details += next.text().trim().substring(0, 120) + ' || ';
                next = next.next();
                count++;
            }
            if (details) console.log('    details:', details.substring(0, 400));
        });
        
        console.log('\n=== Any date-like text ===');
        const body = $('body').text();
        const dateMatches = body.match(/\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}/g);
        if (dateMatches) console.log('Dates found:', [...new Set(dateMatches)].join(', '));
        else console.log('No date patterns found');
        
    } catch(e) { 
        console.log('Error:', e.message);
        if (e.response) console.log('Status:', e.response.status);
    }
})();
