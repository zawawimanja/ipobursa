/**
 * V6 vs V4 vs Sifu — Apple-to-Apple Comparison
 * Same metrics as the user's benchmark table
 */
const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// ─── BUILD DATASET (same as V4 fulldata) ──────────────────────
function getSectorGroup(sector) {
    const s = (sector || '').toLowerCase();
    if (s.includes('tech') || s.includes('consumer') || s.includes('energy') ||
        s.includes('food') || s.includes('beverage') || s.includes('solar') ||
        s.includes('semiconductor') || s.includes('software') || s.includes('hardware')) return 'theme';
    if (s.includes('health') || s.includes('medical') || s.includes('care') ||
        s.includes('pharma')) return 'health';
    if (s.includes('industrial') || s.includes('construction') || s.includes('property') ||
        s.includes('metal') || s.includes('manufacturing') || s.includes('shipping') ||
        s.includes('transport') || s.includes('logistic')) return 'trad';
    return 'other';
}

function getSectorGroupV6(sector) {
    const s = (sector || '').toLowerCase();
    if (s.includes('tech') || s.includes('semiconductor') || s.includes('software') || s.includes('hardware') || s.includes('ai')) return 'tech';
    if (s.includes('consumer') || s.includes('food') || s.includes('beverage') || s.includes('retail')) return 'consumer';
    if (s.includes('energy') || s.includes('solar') || s.includes('renewable') || s.includes('utilities')) return 'energy';
    if (s.includes('health') || s.includes('medical') || s.includes('pharma') || s.includes('care')) return 'health';
    if (s.includes('construction') || s.includes('property') || s.includes('infrastructure')) return 'construction';
    if (s.includes('industrial') || s.includes('manufacturing') || s.includes('metal') || s.includes('shipping') || s.includes('logistic')) return 'industrial';
    return 'other';
}

// IB Score calculation
const ibCalc = {};
raw.filter(d => d.stage >= 5 && d.price > 0 && d.highPrice > 0).forEach(d => {
    const ib = (d.ib || 'unknown').toLowerCase().trim();
    if (!ibCalc[ib]) ibCalc[ib] = { wins: 0, total: 0, avgRet: 0 };
    ibCalc[ib].total++;
    ibCalc[ib].avgRet += (d.highPrice - d.price) / d.price;
    if (d.highPrice >= d.price * 1.1) ibCalc[ib].wins++;
});
const ibPerf = {};
Object.keys(ibCalc).forEach(ib => {
    const s = ibCalc[ib];
    s.avgRet /= s.total;
    ibPerf[ib] = Math.min(1, Math.max(0, (s.wins / s.total) * 0.6 + Math.min(s.avgRet, 1) * 0.4));
});
function getIbScore(ibName) {
    const ib = (ibName || 'unknown').toLowerCase().trim();
    if (ibPerf[ib] !== undefined) return ibPerf[ib];
    for (const key of Object.keys(ibPerf)) {
        if (ib.includes(key) || key.includes(ib)) return ibPerf[key];
    }
    return 0.3;
}

const dataset = raw
    .filter(d => d.price > 0 && d.sifuTargetPrice > 0 && d.highPrice > 0 && d.stage >= 5)
    .map(d => ({
        name: d.companyName || d.id,
        ipo: d.price,
        cincai: d.sifuTargetPrice,
        ath: d.highPrice,
        sg: getSectorGroup(d.sector),
        sgV6: getSectorGroupV6(d.sector),
        mkt: (d.market || '').toLowerCase().includes('main') ? 'main' : 'ace',
        os: d.os || 10,
        ofs: d.ofs === true ? 1 : 0,
        ibScore: getIbScore(d.ib),
        freeFloat: d.freeFloat || 0.25,
        lockup: d.lockupMonths || 12,
        promoter: d.promoterQuality || 'experienced_founder',
        anchor: d.anchorInvestors === true ? 1 : 0,
        gd: d.highPrice < d.price,
    }));

const active = dataset.filter(d => !d.gd);
console.log(`\n📊 DATASET: ${active.length} active IPOs\n`);

// ─── MODEL DEFINITIONS ───────────────────────────────────────

// 1. Sifu Baseline (raw cincai kira)
function sifuPred(d) { return d.cincai; }

// 2. V3 (production Zone 1 params)
const v3p = { themeMult: 0.9602, healthMult: 0.9565, tradDisc: 0.7343, mainMult: 1.0220, osScale: -0.0855, upsideScale: 0.0646 };
function v3Pred(d) {
    let t = d.cincai;
    if (d.sg === 'theme') t *= v3p.themeMult;
    else if (d.sg === 'health') t *= v3p.healthMult;
    else if (d.sg === 'trad') t *= v3p.tradDisc;
    if (d.mkt === 'main') t *= v3p.mainMult;
    if (d.os > 0) t *= (1 + v3p.osScale * Math.log1p(d.os) / 5);
    else t *= (1 + v3p.osScale * Math.log1p(15) / 5);
    const upsideRatio = (d.cincai - d.ipo) / d.ipo;
    t *= (1 + v3p.upsideScale * upsideRatio);
    return t;
}

// 3. V5 (current production Zone 2)
function v5Pred(d) {
    let t = d.cincai;
    if (d.os >= 70) t *= 0.946;
    else if (d.os >= 40) t *= 1.372;
    const isTech = d.sg === 'theme';
    if (d.os >= 15 || d.mkt === 'main') {
        if (isTech) t *= 1.265;
    }
    const sector = d.sg;
    if (sector === 'trad' && d.mkt === 'ace') {
        t *= (d.os < 15) ? 0.887 : 0.868;
    }
    if (d.mkt === 'main') {
        if (d.os >= 40) t *= 1.20;
        else if (d.os < 10) t *= 0.85;
        else t *= 0.997;
    }
    if (d.ipo >= 0.30 && d.ipo <= 0.50) t *= 1.10;
    else if (d.ipo >= 0.75 && d.ipo <= 1.00) t *= 1.10;
    else if (d.ipo < 0.20) t *= 0.85;
    else if (d.ipo > 1.00) t *= 0.90;
    if (d.ofs) t *= 0.90;
    if (d.anchor) t *= 1.12;
    if (d.freeFloat >= 0.15 && d.freeFloat <= 0.25) t *= 1.10;
    else if (d.freeFloat > 0.40) t *= 0.90;
    if (d.lockup <= 6) t *= 0.92;
    if (d.promoter === 'conglomerate_spinoff') t *= 1.08;
    else if (d.promoter === 'first_timer') t *= 0.93;
    return t;
}

// 4. V6 (new challenger)
const v6p = [-0.062118, -0.094923, 0.757103, 0.923936, 0.955618, 1.091094, 0.836895, 1.052850, 1.061522, 0.074801, 1.219244, 0.125707, -0.747504, -0.000803];
function v6Pred(d) {
    let t = d.cincai;
    const logOs = Math.log1p(d.os);
    t *= (1 + v6p[0] * logOs / 5);
    t *= (1 + v6p[1] * logOs * logOs / 25);
    if (d.sgV6 === 'tech') t *= v6p[2];
    if (d.sgV6 === 'consumer') t *= v6p[3];
    if (d.sgV6 === 'energy') t *= v6p[4];
    if (d.sgV6 === 'health') t *= v6p[5];
    if (d.sgV6 === 'industrial') t *= v6p[6];
    if (d.sgV6 === 'construction') t *= v6p[7];
    if (d.mkt === 'main') t *= v6p[8];
    t *= (1 + v6p[9] * (d.ibScore - 0.3));
    if (d.ofs) t *= v6p[10];
    const priceNorm = (d.ipo - 0.30) / 0.50;
    t *= (1 + v6p[11] * Math.exp(-priceNorm * priceNorm));
    const ffDev = d.freeFloat - 0.22;
    t *= (1 + v6p[12] * ffDev);
    let qualScore = 0;
    if (d.anchor) qualScore += 0.3;
    if (d.promoter === 'conglomerate_spinoff') qualScore += 0.2;
    else if (d.promoter === 'first_timer') qualScore -= 0.2;
    if (d.lockup >= 12) qualScore += 0.1;
    else qualScore -= 0.1;
    t *= (1 + v6p[13] * qualScore);
    return t;
}

// ─── EVALUATE WITH SAME METRICS AS USER TABLE ─────────────────
function fullEval(data, predFn, label) {
    let hits = 0, downsideErr = 0, upsideMissed = 0, totalAcc = 0;
    data.forEach(d => {
        const pred = predFn(d);
        if (d.ath >= pred) {
            hits++;
            upsideMissed += ((d.ath - pred) / d.ath) * 100; // % of ATH left above pred
        } else {
            downsideErr++;
        }
        totalAcc += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    const n = data.length;
    return {
        label,
        hitRate: `${(hits/n*100).toFixed(1)}% (${hits}/${n})`,
        downsideErr: `${(downsideErr/n*100).toFixed(1)}%`,
        upsideMissed: hits > 0 ? `${(upsideMissed/hits).toFixed(1)}%` : 'N/A',
        overallAcc: `${(totalAcc/n*100).toFixed(2)}%`,
        _hits: hits, _n: n, _de: downsideErr, _acc: totalAcc/n
    };
}

// ─── RUN COMPARISON ───────────────────────────────────────────
const sifu = fullEval(active, sifuPred, 'Sifu CK (Baseline)');
const v3   = fullEval(active, v3Pred,   'AI V3 (Zone 1 Safe)');
const v5   = fullEval(active, v5Pred,   'AI V5 (Zone 2 Max)');
const v6   = fullEval(active, v6Pred,   'AI V6 (Zone 2 Max)');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🏆  AI vs SIFU — PERBANDINGAN JUJUR (FULL 137 IPO DATASET)');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('Aspek', 28)} ${pad('📌 Sifu CK', 18)} ${pad('🤖 V3 (Safe)', 18)} ${pad('🚀 V5 (Max)', 18)} ${pad('⚡ V6 (Max)', 18)} Siapa Menang?`);
console.log('-'.repeat(120));
console.log(`${pad('Hit Rate', 28)} ${pad(sifu.hitRate, 18)} ${pad(v3.hitRate, 18)} ${pad(v5.hitRate, 18)} ${pad(v6.hitRate, 18)} ${v6._hits > v5._hits && v6._hits > sifu._hits ? '⚡ V6 👑' : v3._hits > v5._hits ? '🤖 V3 👑' : '🚀 V5'}`);
console.log(`${pad('Downside Error', 28)} ${pad(sifu.downsideErr, 18)} ${pad(v3.downsideErr, 18)} ${pad(v5.downsideErr, 18)} ${pad(v6.downsideErr, 18)} ${v6._de < v5._de && v6._de < sifu._de ? '⚡ V6 👑' : v3._de < v5._de ? '🤖 V3 👑' : 'V5'}`);
console.log(`${pad('Upside Missed (Avg)', 28)} ${pad(sifu.upsideMissed, 18)} ${pad(v3.upsideMissed, 18)} ${pad(v5.upsideMissed, 18)} ${pad(v6.upsideMissed, 18)} ${''}`);
console.log(`${pad('Overall Accuracy to ATH', 28)} ${pad(sifu.overallAcc, 18)} ${pad(v3.overallAcc, 18)} ${pad(v5.overallAcc, 18)} ${pad(v6.overallAcc, 18)} ${v6._acc > v5._acc && v6._acc > sifu._acc ? '⚡ V6 👑' : sifu._acc > v6._acc ? '📌 Sifu 👑' : '🚀 V5'}`);

console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
console.log('📋  VERDICT RINGKASAN');
console.log('═══════════════════════════════════════════════════════════════════════════');

// Count wins
const models = [
    { name: 'Sifu CK', hits: sifu._hits, de: sifu._de, acc: sifu._acc },
    { name: 'V3', hits: v3._hits, de: v3._de, acc: v3._acc },
    { name: 'V5', hits: v5._hits, de: v5._de, acc: v5._acc },
    { name: 'V6', hits: v6._hits, de: v6._de, acc: v6._acc },
];

console.log('\n📊 Ranking by Hit Rate (Siapa paling SELAMAT — target dijamin tercapai):');
models.sort((a, b) => b.hits - a.hits);
models.forEach((m, i) => console.log(`   ${i+1}. ${m.name}: ${m.hits}/${active.length} = ${(m.hits/active.length*100).toFixed(1)}%`));

console.log('\n📊 Ranking by Overall Accuracy (Siapa paling TEPAT — ramalan hampir ATH):');
models.sort((a, b) => b.acc - a.acc);
models.forEach((m, i) => console.log(`   ${i+1}. ${m.name}: ${(m.acc*100).toFixed(2)}%`));

console.log('\n📊 Ranking by Downside Error (Siapa paling SEDIKIT tersasar — target tak tercapai):');
models.sort((a, b) => a.de - b.de);
models.forEach((m, i) => console.log(`   ${i+1}. ${m.name}: ${m.de}/${active.length} = ${(m.de/active.length*100).toFixed(1)}%`));

// Final verdict
const bestHit = models.reduce((best, m) => m.hits > best.hits ? m : best);
const bestAcc = models.reduce((best, m) => m.acc > best.acc ? m : best);
console.log(`\n🏆 PEMENANG KESELURUHAN:`);
console.log(`   Hit Rate Champion: ${bestHit.name}`);
console.log(`   Accuracy Champion: ${bestAcc.name}`);
if (bestHit.name === bestAcc.name) {
    console.log(`\n   👑 ${bestHit.name} MENGUASAI KEDUA-DUA METRIK!`);
} else {
    console.log(`\n   ⚖️  Trade-off: ${bestHit.name} paling selamat, ${bestAcc.name} paling tepat.`);
}
