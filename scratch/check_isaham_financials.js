const axios = require('axios');
const cheerio = require('cheerio');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

axios.get('https://www.isaham.my/ipo/insights/stratus-global-holdings-berhad', { headers: HEADERS }).then(r => {
    const $ = cheerio.load(r.data);
    const text = $('body').text().replace(/\s+/g, ' ');

    console.log('=== Revenue ===');
    const revMatches = [...text.matchAll(/RM\s*([\d,\.]+)\s*million/gi)];
    revMatches.forEach(m => console.log(' -', m[0]));

    console.log('\n=== PAT Table ===');
    const patIdx = text.indexOf('Profit After Tax');
    if (patIdx !== -1) {
        console.log(text.substring(patIdx, patIdx + 500));
    }

    console.log('\n=== EPS ===');
    const epsMatches = [...text.matchAll(/EPS[:\s]*([\d\.]+)\s*sen/gi)];
    epsMatches.forEach(m => console.log(' -', m[0]));

    console.log('\n=== Total shares / market cap ===');
    const sharesMatch = text.match(/(\d[\d,\.]+)\s*shares/i);
    if (sharesMatch) console.log(' -', sharesMatch[0]);
    
    console.log('\n=== PE ===');
    const peMatch = text.match(/PE Ratio[\s:]*[\d\.]+/i);
    if (peMatch) console.log(' -', peMatch[0]);

    console.log('\n=== Full snippet (first 2000 chars of body) ===');
    console.log(text.substring(0, 2000));

}).catch(e => console.error(e.message));
