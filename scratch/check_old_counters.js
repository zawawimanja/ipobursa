const https = require('https');

const counters = [
    { name: 'DNeX', sym: '4456.KL' },
    { name: 'MYEG', sym: '0138.KL' },
    { name: 'INARI', sym: '0166.KL' },
    { name: 'FRONTKN', sym: '0128.KL' },
    { name: 'GREATEC', sym: '0208.KL' },
    { name: 'UWC', sym: '5292.KL' },
    { name: 'PENTA', sym: '7160.KL' },
    { name: 'GENTING', sym: '3182.KL' },
    { name: 'YTLPOWR', sym: '6742.KL' },
    { name: 'GAMUDA', sym: '5398.KL' }
];

let pending = counters.length;

console.log('Sedang membuat imbasan pantas kaunter lama (non-IPO) di Yahoo Finance...\n');

counters.forEach(c => {
    https.get(`https://query1.finance.yahoo.com/v8/finance/chart/${c.sym}?interval=1d`, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const j = JSON.parse(data);
                const meta = j.chart.result[0].meta;
                const curPrice = meta.regularMarketPrice;
                const high52 = meta.fiftyTwoWeekHigh;
                const pullback = ((high52 - curPrice)/high52*100).toFixed(1);
                
                let status = '';
                if (pullback <= 5) status = '🔥 NEAR ATH (0-5% pullback)';
                else if (pullback <= 15) status = '📉 HEALTHY PULLBACK (5-15% dari ATH)';
                else if (pullback <= 30) status = '🔻 DEEP PULLBACK (>15% dari ATH)';
                else status = '🧊 JAUH DARI ATH (Downtrend)';

                console.log(`${c.name.padEnd(10)} | Semasa: RM ${curPrice.toFixed(3)} | ATH 52w: RM ${high52.toFixed(3)} | Jarak: -${pullback}% | ${status}`);
            } catch(e) {
                console.log(`${c.name.padEnd(10)} | Gagal fetch data.`);
            }
            pending--;
            if(pending === 0) console.log('\nSiap scan.');
        });
    }).on('error', () => {
        console.log(`${c.name.padEnd(10)} | Error network.`);
        pending--;
        if(pending === 0) console.log('\nSiap scan.');
    });
});
