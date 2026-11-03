// Read-only: what does a MORATORIUM actually cost? Compares debut-day exit vs
// being forced to hold ~6 months, for IPOs that carried a Bumiputera/MITI tranche.
const data = require('../data.json');

const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const med = a => (a.length ? a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)] : null);
const pct = v => (v === null ? '-' : `${(v * 100).toFixed(1)}%`);
const summary = (label, rets) => {
    const ok = rets.filter(v => Number.isFinite(v));
    if (!ok.length) return console.log(label.padEnd(46), 'tiada data');
    console.log(label.padEnd(46),
        `n=${String(ok.length).padEnd(4)}`,
        `medan ${pct(med(ok))}`.padEnd(16),
        `menang ${((ok.filter(v => v > 0).length / ok.length) * 100).toFixed(0)}%`);
};

const listed = data.filter(x => x.stage === 5 && num(x.price));

// Debut exit vs "today" exit (proxy for holding past the moratorium window)
summary('Keluar pada harga debut (tanpa mora)',
    listed.filter(x => num(x.openPrice)).map(x => (x.openPrice - x.price) / x.price));
summary('Pegang sampai sekarang (macam kena mora)',
    listed.filter(x => num(x.currentPrice)).map(x => (x.currentPrice - x.price) / x.price));

// Same two numbers, restricted to MITI-tranche counters and to 2026 listings
const miti = listed.filter(x => x.hasMitiTranche);
console.log('\n--- Khas rekaman bertranche MITI ---');
summary('MITI: keluar di debut',
    miti.filter(x => num(x.openPrice)).map(x => (x.openPrice - x.price) / x.price));
summary('MITI: pegang sampai sekarang',
    miti.filter(x => num(x.currentPrice)).map(x => (x.currentPrice - x.price) / x.price));

const y26 = listed.filter(x => x.year >= 2026);
console.log('\n--- Khas penyenaraian 2026 ---');
summary('2026: keluar di debut',
    y26.filter(x => num(x.openPrice)).map(x => (x.openPrice - x.price) / x.price));
summary('2026: pegang sampai sekarang',
    y26.filter(x => num(x.currentPrice)).map(x => (x.currentPrice - x.price) / x.price));

// The closest analogues to BCG: expensive (PE>=35) or large consumer/healthcare names
console.log('\n--- Analogi BCG (PE >= 35, atau farmasi/kesihatan/konsumer besar) ---');
const peers = listed.filter(x => ((num(x.ipoPe) ?? num(x.pe)) >= 35)
    || /pharma|healthcare|farmasi|consumer/i.test(String(x.sector)));
peers.forEach(x => {
    const debut = num(x.openPrice) ? (x.openPrice - x.price) / x.price : null;
    const now = num(x.currentPrice) ? (x.currentPrice - x.price) / x.price : null;
    console.log(String(x.symbol || x.companyName).slice(0, 16).padEnd(17),
        `PE ${num(x.ipoPe) ?? num(x.pe) ?? '-'}`.padEnd(9),
        `RM${x.price}`.padEnd(9),
        `debut ${pct(debut)}`.padEnd(14),
        `kini ${pct(now)}`.padEnd(13),
        `→ RM3,780 jadi RM${num(x.openPrice) ? (3780 * x.openPrice / x.price).toFixed(0) : '?'} di debut / RM${num(x.currentPrice) ? (3780 * x.currentPrice / x.price).toFixed(0) : '?'} kini`);
});
