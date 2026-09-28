const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scratch/ipo.html', 'utf8');
const $ = cheerio.load(html);
$('table').each((i, t) => {
    const text = $(t).text();
    if(text.includes('Evocom') || text.includes('Pioneer')) {
        console.log('FOUND in table', i);
        console.log($(t).find('tr').first().text());
        console.log($(t).text().substring(0, 200));
    }
});
