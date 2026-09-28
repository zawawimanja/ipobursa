const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scratch/pickastock.html', 'utf8');
const $ = cheerio.load(html);
console.log($('body').text().substring(0, 500));
const matches = html.match(/evocom/i);
console.log("Evocom found?", !!matches);
