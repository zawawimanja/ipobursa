const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scratch/tiih_press.html', 'utf8');
const $ = cheerio.load(html);

$('.news').each((i, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes('stratus')) {
        console.log('Stratus item HTML:');
        console.log($(el).html().trim());
    }
});
