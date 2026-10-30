// verify-check: read the LIVE ipobursa.my data.js and confirm the year-slip repair shipped.
const rules = require('../lib/ipo-rules');

(async () => {
    const res = await fetch('https://www.ipobursa.my/data.js?nocache=' + Date.now());
    const text = await res.text();
    const start = text.indexOf('[', text.indexOf('IPO_DATA'));
    const data = JSON.parse(text.slice(start, text.lastIndexOf('];') + 1));

    const violations = data.filter(ipo =>
        ['openingDate', 'closingDate', 'mitiOpenDate', 'mitiCloseDate']
            .some(value => rules.isAfterListing(ipo, rules.dayKey(value)))
    );
    const famiera = data.find(ipo => ipo.symbol === 'FAMIERA');
    const aquawalk = data.find(ipo => ipo.symbol === 'AQUAWALK');

    console.log('live rekaman:', data.length);
    console.log('FAMIERA tutup:', famiera && famiera.closingDate, '| listing:', famiera && famiera.listingDate);
    console.log('AQUAWALK buka:', aquawalk && aquawalk.openingDate, '| listing:', aquawalk && aquawalk.listingDate);
    console.log('pelanggaran tarikh selepas listing:', violations.length);
    console.log('saat bayar MITI direkod:', data.filter(ipo => ipo.mitiPaymentDeadline).map(ipo => `${ipo.symbol}=${ipo.mitiPaymentDeadline}`).join(', ') || 'tiada');
})().catch(e => { console.error('GAGAL:', e.message); process.exitCode = 1; });
