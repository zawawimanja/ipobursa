// Read-only: what the MITI SahamOnline public page publishes right now.
const axios = require('axios');
const { parsePublicOffers } = require('../lib/miti-sync');

(async () => {
    const resp = await axios.get('https://sahamonline.miti.gov.my/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' },
        timeout: 25000
    });
    const offers = parsePublicOffers(resp.data);
    console.log('HTTP', resp.status, '| tawaran awam di portal MITI:', offers.length);
    offers.forEach(o => console.log(' -', o.companyName || o.company || '?', '|', o.openDate || '?', '→', o.closeDate || '?'));
})().catch(e => { console.error('GAGAL:', e.response ? `HTTP ${e.response.status}` : e.message); process.exitCode = 1; });
