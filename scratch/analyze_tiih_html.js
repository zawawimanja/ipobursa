const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scratch/tiih_press.html', 'utf8');
const $ = cheerio.load(html);

console.log('Total .news items:', $('.news').length);

const matches = [];
$('.news').each((i, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text.toLowerCase().includes('stratus') || text.toLowerCase().includes('rng') || text.toLowerCase().includes('eckem')) {
        matches.push(text);
    }
});

console.log('Matches:', matches);

// Print the first 10 latest news items
console.log('\nFirst 10 items:');
$('.news').slice(0, 10).each((i, el) => {
    console.log(`${i}: ${$(el).text().trim().replace(/\s+/g, ' ')}`);
});
