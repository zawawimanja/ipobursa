const fs = require('fs');

let content = fs.readFileSync('./data_export.js', 'utf8');
const startIdx = content.indexOf('[');
const endIdx = content.lastIndexOf(']');
const activeData = JSON.parse(content.substring(startIdx, endIdx + 1));

// Main Market only, listed, has both openPrice and highPrice (ATH)
const mitiIpos = activeData.filter(x =>
    x.status === 'Listed' &&
    x.market === 'Main Market' &&
    x.openPrice != null &&
    x.price != null &&
    x.highPrice != null &&
    x.id !== 'skyechip'
);

const processed = mitiIpos.map(x => {
    const openPrem = ((x.openPrice - x.price) / x.price) * 100;
    const athPrem = ((x.highPrice - x.price) / x.price) * 100;
    const currentPrem = x.currentPrice ? ((x.currentPrice - x.price) / x.price) * 100 : null;
    // Extra gain from holding (ATH vs Open)
    const holdBonus = ((x.highPrice - x.openPrice) / x.openPrice) * 100;
    // Verdict
    let verdict = '';
    if (athPrem > openPrem * 2 && athPrem > openPrem + 20) {
        verdict = '📦 HOLD (ATH jauh lebih tinggi)';
    } else if (holdBonus < 10 && openPrem > 20) {
        verdict = '⚡ JUAL HARI PERTAMA';
    } else if (holdBonus >= 10 && holdBonus < 30) {
        verdict = '⚖️  SWING (hold few weeks)';
    } else {
        verdict = '⚡ JUAL HARI PERTAMA';
    }

    return {
        companyName: x.companyName,
        sector: (x.sector || 'N/A').split('(')[0].trim(),
        price: x.price,
        openPrice: x.openPrice,
        highPrice: x.highPrice,
        currentPrice: x.currentPrice,
        openPrem,
        athPrem,
        holdBonus,
        currentPrem,
        year: x.year,
        grade: x.predictedGrade || 'N/A',
        verdict
    };
}).sort((a, b) => b.athPrem - a.athPrem);

console.log('==========================================================================');
console.log('  MITI MAIN MARKET — JUAL HARI PERTAMA vs HOLD? (Rank by ATH%)');
console.log('==========================================================================');
console.log(' Company                        | IPO  | Open% | ATH%   | Hold+% | Verdict');
console.log('--------------------------------|------|-------|--------|--------|----------------------');
processed.forEach(x => {
    const name = x.companyName.substring(0, 30).padEnd(30, ' ');
    const openStr = (x.openPrem >= 0 ? '+' : '') + x.openPrem.toFixed(1) + '%';
    const athStr  = (x.athPrem >= 0 ? '+' : '') + x.athPrem.toFixed(1) + '%';
    const holdStr = (x.holdBonus >= 0 ? '+' : '') + x.holdBonus.toFixed(1) + '%';
    console.log(` ${name} | ${x.price.toFixed(3)} | ${openStr.padStart(5,' ')} | ${athStr.padStart(6,' ')} | ${holdStr.padStart(6,' ')} | ${x.verdict}`);
});

// Group by verdict
const verdictGroups = {};
processed.forEach(x => {
    const key = x.verdict.includes('HOLD') ? 'HOLD' : x.verdict.includes('SWING') ? 'SWING' : 'JUAL';
    if (!verdictGroups[key]) verdictGroups[key] = [];
    verdictGroups[key].push(x);
});

console.log('\n==========================================================================');
console.log('  RINGKASAN: STRATEGI OPTIMUM UNTUK SETIAP KAUNTER MITI');
console.log('==========================================================================');

const holdItems = verdictGroups['HOLD'] || [];
const swingItems = verdictGroups['SWING'] || [];
const jualItems = verdictGroups['JUAL'] || [];

console.log(`\n📦 HOLD (ATH jauh lebih tinggi dari Open) — ${holdItems.length} kaunter:`);
holdItems.forEach(x => {
    console.log(`   - ${x.companyName} [${x.grade}]`);
    console.log(`     Open: +${x.openPrem.toFixed(1)}% → ATH: +${x.athPrem.toFixed(1)}% (Bonus hold: +${x.holdBonus.toFixed(1)}%)`);
});

console.log(`\n⚖️  SWING / Hold Beberapa Minggu — ${swingItems.length} kaunter:`);
swingItems.forEach(x => {
    console.log(`   - ${x.companyName} [${x.grade}]`);
    console.log(`     Open: +${x.openPrem.toFixed(1)}% → ATH: +${x.athPrem.toFixed(1)}% (Bonus hold: +${x.holdBonus.toFixed(1)}%)`);
});

console.log(`\n⚡ JUAL HARI PERTAMA (Open premium sudah maksimum) — ${jualItems.length} kaunter:`);
jualItems.forEach(x => {
    console.log(`   - ${x.companyName} [${x.grade}]`);
    console.log(`     Open: +${x.openPrem.toFixed(1)}% → ATH: +${x.athPrem.toFixed(1)}% (Bonus hold: +${x.holdBonus.toFixed(1)}%)`);
});

// Key patterns
console.log('\n==========================================================================');
console.log('  PATTERN ANALYSIS: BILA PERLU HOLD? BILA PERLU JUAL?');
console.log('==========================================================================');
const holdAvgOpen = holdItems.length ? holdItems.reduce((s, x) => s + x.openPrem, 0) / holdItems.length : 0;
const jualAvgOpen = jualItems.length ? jualItems.reduce((s, x) => s + x.openPrem, 0) / jualItems.length : 0;
const holdAvgAth = holdItems.length ? holdItems.reduce((s, x) => s + x.athPrem, 0) / holdItems.length : 0;
const jualAvgAth = jualItems.length ? jualItems.reduce((s, x) => s + x.athPrem, 0) / jualItems.length : 0;

console.log(`\n  Kaunter "HOLD" kategori:`);
console.log(`    - Purata Open Premium : +${holdAvgOpen.toFixed(1)}%`);
console.log(`    - Purata ATH Premium  : +${holdAvgAth.toFixed(1)}%`);
console.log(`    - Ciri khas           : Open sederhana/flat tapi ATH gila`);

console.log(`\n  Kaunter "JUAL HARI PERTAMA" kategori:`);
console.log(`    - Purata Open Premium : +${jualAvgOpen.toFixed(1)}%`);
console.log(`    - Purata ATH Premium  : +${jualAvgAth.toFixed(1)}%`);
console.log(`    - Ciri khas           : Open sudah meletup, ATH tak jauh berbeza`);

console.log('\n  📌 KESIMPULAN PATTERN:');
console.log('    ✅ HOLD jika : Open <+20% TAPI fundamental kukuh (ATH sering +50% ke atas)');
console.log('    ✅ JUAL jika : Open sudah >+40% pada hari pertama (ambil untung terus)');
console.log('    ✅ SWING jika: Open +20-40%, tengok momentum minggu pertama sebelum decide');
