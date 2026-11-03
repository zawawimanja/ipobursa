// Read-only evidence check: how did 2026 listed IPOs perform at debut and now,
// grouped by IPO PE band and grade — used to judge an expensive (PE ~41x) allocation.
const data = require('../data.json');

const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const rows = data.filter(x => x.stage === 5 && num(x.price) && num(x.openPrice));

const med = a => (a.length ? a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)] : null);
const pct = v => (v === null ? '-' : `${(v * 100).toFixed(1)}%`);

const bands = [
    { label: 'PE < 15', test: pe => pe !== null && pe < 15 },
    { label: 'PE 15-25', test: pe => pe !== null && pe >= 15 && pe < 25 },
    { label: 'PE 25-40', test: pe => pe !== null && pe >= 25 && pe < 40 },
    { label: 'PE >= 40', test: pe => pe !== null && pe >= 40 },
    { label: 'PE tak diketahui', test: pe => pe === null }
];

console.log(`Kohort: ${rows.length} IPO 2026 yang sudah disenaraikan & ada harga debut.\n`);
console.log('kumpulan'.padEnd(20), 'n'.padEnd(4), 'medan debut'.padEnd(13), 'medan kini'.padEnd(12), 'debut > IPO'.padEnd(12), 'kini > IPO');

for (const band of bands) {
    const set = rows.filter(x => band.test(num(x.ipoPe) ?? num(x.pe)));
    if (!set.length) continue;
    const debut = set.map(x => (x.openPrice - x.price) / x.price);
    const now = set.filter(x => num(x.currentPrice)).map(x => (x.currentPrice - x.price) / x.price);
    console.log([
        band.label.padEnd(20),
        String(set.length).padEnd(4),
        pct(med(debut)).padEnd(13),
        pct(med(now)).padEnd(12),
        `${((debut.filter(v => v > 0).length / debut.length) * 100).toFixed(0)}%`.padEnd(12),
        now.length ? `${((now.filter(v => v > 0).length / now.length) * 100).toFixed(0)}%` : '-'
    ].join(' '));
}

console.log('\n=== analogi BCG: PE >= 35 atau farmasi/konsumer besar ===');
rows.filter(x => ((num(x.ipoPe) ?? num(x.pe)) >= 35) || /pharma|healthcare|farmasi/i.test(String(x.sector)))
    .forEach(x => console.log([
        String(x.symbol || x.companyName).slice(0, 12).padEnd(13),
        `PE ${num(x.ipoPe) ?? num(x.pe) ?? '-'}`.padEnd(9),
        `IPO RM${x.price}`.padEnd(11),
        `debut RM${x.openPrice}`.padEnd(13),
        `kini RM${x.currentPrice || '-'}`.padEnd(13),
        `(${x.openPrice > x.price ? 'naik' : 'turun'} di debut)`.padEnd(17),
        String(x.sector).slice(0, 30)
    ].join(' ')));

console.log('\n=== MITI tranche: prestasi IPO yang ada tawaran Bumiputera ===');
const miti = rows.filter(x => x.hasMitiTranche);
const mDebut = miti.map(x => (x.openPrice - x.price) / x.price);
console.log(`n=${miti.length} | medan debut ${pct(med(mDebut))} | naik di debut ${((mDebut.filter(v => v > 0).length / mDebut.length) * 100).toFixed(0)}%`);
miti.forEach(x => console.log(' -', x.symbol || x.companyName, `PE ${num(x.ipoPe) ?? num(x.pe) ?? '-'}`, `RM${x.price} → debut RM${x.openPrice} → kini RM${x.currentPrice || '-'}`));
