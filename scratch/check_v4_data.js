const fs = require('fs');

const raw = fs.readFileSync('data.json', 'utf8');
const data = JSON.parse(raw);

// Filter: listed (stage 5+), has all required fields
const listed = data.filter(d => {
    const hasIpo = d.price && d.price > 0;
    const hasSifu = d.sifuTargetPrice && d.sifuTargetPrice > 0;
    const hasHigh = d.high && d.high > 0;
    const isListed = d.stage >= 5;
    return hasIpo && hasSifu && hasHigh && isListed;
});

console.log(`Total listed with full data: ${listed.length}`);
console.log('\nSample data (first 10):');
listed.slice(0, 10).forEach(d => {
    const upside = ((d.sifuTargetPrice - d.price) / d.price * 100).toFixed(1);
    const hitSifu = d.high >= d.sifuTargetPrice ? '✅' : '❌';
    console.log(`  ${(d.symbol || d.id).padEnd(12)} IPO:${d.price.toFixed(3)} Sifu:${d.sifuTargetPrice.toFixed(3)} ATH:${d.high.toFixed(3)} Up:${upside}% ${hitSifu}`);
});

// Check fields availability
let hasOs = 0, hasOfs = 0, hasSector = 0, hasMarket = 0;
listed.forEach(d => {
    if (d.os && d.os > 0) hasOs++;
    if (d.ofsPercentage !== undefined) hasOfs++;
    if (d.sector) hasSector++;
    if (d.market) hasMarket++;
});
console.log(`\nField coverage (out of ${listed.length}):`);
console.log(`  OS data:     ${hasOs} (${(hasOs/listed.length*100).toFixed(1)}%)`);
console.log(`  OFS data:    ${hasOfs} (${(hasOfs/listed.length*100).toFixed(1)}%)`);
console.log(`  Sector data: ${hasSector} (${(hasSector/listed.length*100).toFixed(1)}%)`);
console.log(`  Market data: ${hasMarket} (${(hasMarket/listed.length*100).toFixed(1)}%)`);

// Gap-down analysis
const gapDown = listed.filter(d => d.high < d.price);
const nonGapDown = listed.filter(d => d.high >= d.price);
console.log(`\nGap-down: ${gapDown.length} | Non-gap-down: ${nonGapDown.length}`);

// Sifu hit rate on full dataset
const sifuHits = listed.filter(d => d.high >= d.sifuTargetPrice).length;
console.log(`\nSifu Hit Rate (all ${listed.length}): ${sifuHits}/${listed.length} = ${(sifuHits/listed.length*100).toFixed(1)}%`);
const sifuHitsNG = nonGapDown.filter(d => d.high >= d.sifuTargetPrice).length;
console.log(`Sifu Hit Rate (non-gap-down ${nonGapDown.length}): ${sifuHitsNG}/${nonGapDown.length} = ${(sifuHitsNG/nonGapDown.length*100).toFixed(1)}%`);
