const axios = require('axios');
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

(async () => {
    for (const symbol of process.argv.slice(2)) {
        try {
            const r = await axios.get(`https://klse.i3investor.com/web/stock/overview/${symbol}`, { headers: H, timeout: 15000 });
            const title = (r.data.match(/<title>([^<]*)<\/title>/i) || [])[1];
            const hist = (r.data.match(/href="(\/web\/stock\/historical-chart\/[^"]+)"/) || [])[1];
            console.log(symbol, '| status', r.status, '| title:', title, '| hist:', hist);
            if (hist) {
                const h = await axios.get(`https://klse.i3investor.com${hist}`, { headers: H, timeout: 15000 });
                const row = (h.data.match(/var\s+dtdata\s*=\s*(\[[^\]]*\])/) || [])[1];
                console.log('   dtdata first row:', row && row.slice(0, 160));
            }
        } catch (e) {
            console.log(symbol, 'ERR', e.message);
        }
        await new Promise(r => setTimeout(r, 4000));
    }
})().catch(e => console.log('FATAL', e.message));
