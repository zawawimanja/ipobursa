// Verify SRKK zone targets across all models
const v3P  = { themeMult:0.9602, healthMult:0.9565, tradDisc:0.7343, mainMult:1.0220, osScale:-0.0855, upsideScale:0.0646 };
const v4P  = { themeMult:0.9654, healthMult:1.1956, tradDisc:0.8988, mainMult:0.9523, osScale:-0.1087, upsideScale:-0.0065 };
const v4pp = { themeMult:0.8384, healthMult:1.0056, tradDisc:0.7982, mainMult:1.1181, osScale:0.1434, upsideScale:-0.0332, peScale:-0.0405 };

// SRKK AI data
const srkk = { ipo: 0.32, cincai: 0.39, sifuBull: 0.66, sg: 'theme', mkt: 'ace', pe: 18.15 };

function calcV3(d, p, os) {
    let t = d.cincai;
    if (d.sg === 'theme')  t *= p.themeMult;
    if (d.mkt === 'main') t *= p.mainMult;
    t *= (1 + p.osScale * Math.log1p(os) / 5);
    const ur = (d.cincai - d.ipo) / d.ipo;
    t *= (1 + p.upsideScale * ur);
    return t;
}

function calcV4Plus(d, p, os) {
    let t = d.cincai;
    if (d.sg === 'theme')  t *= p.themeMult;
    if (d.mkt === 'main') t *= p.mainMult;
    t *= (1 + p.osScale * Math.log1p(os) / 5);
    const ur = (d.cincai - d.ipo) / d.ipo;
    t *= (1 + p.upsideScale * ur);
    const peRef = d.mkt === 'main' ? 18 : 13;
    const peDeviation = (d.pe - peRef) / peRef;
    t *= (1 + p.peScale * peDeviation);
    return t;
}

console.log('═══════════════════════════════════════════════════');
console.log('  SRKK AI — DUAL ZONE VERIFICATION ACROSS MODELS');
console.log('═══════════════════════════════════════════════════');
console.log(`  IPO Price  : RM ${srkk.ipo}`);
console.log(`  CK (cincai): RM ${srkk.cincai}  (avgTP — formula actual)`);
console.log(`  Sifu Bull  : RM ${srkk.sifuBull} (PE 18x hype target)`);
console.log(`  PE         : ${srkk.pe}x`);
console.log(`  Sector     : ${srkk.sg}, ${srkk.mkt.toUpperCase()}`);

[18, 50, 100].forEach(os => {
    const z1_v3   = calcV3(srkk, v3P, os);
    const z1_v4   = calcV3(srkk, v4P, os);
    const z1_v4pp = calcV4Plus(srkk, v4pp, os);
    console.log(`\n  ─── If Final OS = ${os}x ───`);
    console.log(`  Zone 1 V3  (safe)   : RM ${z1_v3.toFixed(3)}  (+${((z1_v3/srkk.ipo-1)*100).toFixed(1)}%)`);
    console.log(`  Zone 1 V4  (full)   : RM ${z1_v4.toFixed(3)}  (+${((z1_v4/srkk.ipo-1)*100).toFixed(1)}%)`);
    console.log(`  Zone 1 V4+ (PE)     : RM ${z1_v4pp.toFixed(3)}  (+${((z1_v4pp/srkk.ipo-1)*100).toFixed(1)}%)`);
    console.log(`  Zone 2 Sifu (bull)  : RM ${srkk.sifuBull}  (+${((srkk.sifuBull/srkk.ipo-1)*100).toFixed(1)}%)`);
});
