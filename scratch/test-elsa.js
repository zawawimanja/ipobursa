const axios = require('axios');
const cheerio = require('cheerio');

async function testStats() {
    try {
        console.log('Fetching https://www.isaham.my/ipo/statistics...');
        const res = await axios.get('https://www.isaham.my/ipo/statistics', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        console.log('Table found:', $('#statsTable').length > 0);
        
        let foundElsa = false;
        $('#statsTable tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            const symbol = $(cols[2]).text().trim();
            const company = $(cols[1]).text().trim();
            if (symbol.toUpperCase().includes('ELSA') || company.toUpperCase().includes('ELSA')) {
                foundElsa = true;
                console.log('Found Elsa row:');
                cols.each((j, td) => {
                    console.log(`  Col ${j}: "${$(td).text().trim()}"`);
                });
            }
        });
        
        if (!foundElsa) {
            console.log('Elsa NOT found in the statistics table. Let\'s print the first 5 rows:');
            $('#statsTable tbody tr').slice(0, 5).each((i, el) => {
                const cols = $(el).find('td');
                const rowText = [];
                cols.each((j, td) => {
                    rowText.push(`${j}: ${$(td).text().trim()}`);
                });
                console.log(`  Row ${i}: ${rowText.join(' | ')}`);
            });
        }
    } catch(e) {
        console.error('Error:', e.message);
    }
}

testStats();
