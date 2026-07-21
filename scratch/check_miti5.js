const axios = require('axios');

const proxy = 'https://api.allorigins.win/get?url=';

(async () => {
    try {
        const res = await axios.get(proxy + encodeURIComponent('https://www.isaham.my/ipo/miti'), { timeout: 20000 });
        const data = typeof res.data === 'string' ? res.data : res.data.contents;
        
        // Find date patterns
        const dates = data.match(/\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}/g);
        console.log('Dates:', dates ? [...new Set(dates)].join(', ') : 'none');
        
        // Find company names near dates
        const lines = data.split('\n').filter(l => l.includes('h5') || l.includes('h4') || l.includes('MITI') || l.includes('Open') || l.includes('Close'));
        lines.slice(0, 40).forEach(l => console.log(l.trim().substring(0, 200)));
        
    } catch(e) {
        console.log('Error:', e.message);
        if (e.response) console.log('Status:', e.response.status);
    }
})();
