const fs = require('fs');
const html = fs.readFileSync('scratch/miti_home.html', 'utf8');
const links = [];
const regex = /href=['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(html)) !== null) {
  links.push(match[1]);
}
console.log(Array.from(new Set(links)).join('\n'));
