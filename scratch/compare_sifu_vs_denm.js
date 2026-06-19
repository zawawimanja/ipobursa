/**
 * ============================================================
 * Head-to-Head: Sifu Original vs DE+NM Hybrid
 * Metrik: SAMA dengan spreadsheet Sifu
 *   - "Capai" = ATH >= CincaiTarget (stock reached our target)
 *   - "Tak Capai" = ATH < CincaiTarget
 *   - Accuracy % = Sifu's own formula dari gambar
 * ============================================================
 */

// Real 59 IPO data dari gambar abang
// Fields: cincai = Sifu's original Cincai Val, atH = All-Time High
const realIpoData = [
    { name:'OGX Group',               sym:'OGX',       ipoP:0.350, cincai:0.490, atH:0.490, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'Sunmed',                   sym:'SUNMED',    ipoP:1.450, cincai:1.840, atH:1.850, sector:'healthcare', market:'main', achieved:'Capai'    },
    { name:'MM Computer Sys',          sym:'MMCS',      ipoP:0.220, cincai:0.240, atH:0.235, sector:'tech',       market:'ace',  achieved:'Tak Capai'},
    { name:'Powertechnic',             sym:'POWER',     ipoP:0.350, cincai:0.410, atH:0.400, sector:'energy',     market:'ace',  achieved:'Tak Capai'},
    { name:'PSP Energy',               sym:'PSP',       ipoP:0.160, cincai:0.170, atH:0.165, sector:'energy',     market:'ace',  achieved:'Tak Capai'},
    { name:'5E Resources',             sym:'5ER',       ipoP:0.260, cincai:0.290, atH:0.300, sector:'energy',     market:'ace',  achieved:'Capai'    },
    { name:'Topvision Eye Specialist', sym:'TOPVISN',   ipoP:0.330, cincai:0.410, atH:0.395, sector:'healthcare', market:'ace',  achieved:'Tak Capai'},
    { name:'EPB Group',                sym:'EPB',       ipoP:0.560, cincai:0.710, atH:0.680, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Verdant Solar',            sym:'VERDANT',   ipoP:0.310, cincai:0.380, atH:0.400, sector:'energy',     market:'ace',  achieved:'Capai'    },
    { name:'Metro Healthcare',         sym:'METRO',     ipoP:0.250, cincai:0.290, atH:0.275, sector:'healthcare', market:'ace',  achieved:'Tak Capai'},
    { name:'Cropmate',                 sym:'CRPMATE',   ipoP:0.200, cincai:0.230, atH:0.245, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'Express Power',            sym:'XPB',       ipoP:0.200, cincai:0.250, atH:0.235, sector:'energy',     market:'ace',  achieved:'Tak Capai'},
    { name:'MTT Shipping',             sym:'MTTSL',     ipoP:1.030, cincai:1.160, atH:1.090, sector:'other',      market:'main', achieved:'Tak Capai'},
    { name:'Bus Cap',                  sym:'BUSCAP',    ipoP:0.230, cincai:0.320, atH:0.355, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'Inspace Creation',         sym:'INSPACE',   ipoP:0.250, cincai:0.320, atH:0.290, sector:'tech',       market:'ace',  achieved:'Tak Capai'},
    { name:'BMS Holdings',             sym:'BMS',       ipoP:0.220, cincai:0.240, atH:0.215, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Hock Soon',                sym:'HOCKSOON',  ipoP:0.600, cincai:0.630, atH:0.560, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Camaroe',                  sym:'CAMAROE',   ipoP:0.140, cincai:0.140, atH:0.160, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'Northern Solar',           sym:'NORTHE',    ipoP:0.630, cincai:0.830, atH:0.950, sector:'energy',     market:'ace',  achieved:'Capai'    },
    { name:'BWYS Group',               sym:'BWYS',      ipoP:0.220, cincai:0.310, atH:0.360, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'AquaWalk',                 sym:'AQUAWALK',  ipoP:0.310, cincai:0.370, atH:0.430, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'El Power',                 sym:'EIPOWER',   ipoP:0.480, cincai:0.610, atH:0.710, sector:'energy',     market:'ace',  achieved:'Capai'    },
    { name:'ISF Group',                sym:'ISF',       ipoP:0.330, cincai:0.690, atH:0.600, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Wasco / Greenergy',        sym:'GENERGY',   ipoP:1.000, cincai:0.830, atH:1.000, sector:'energy',     market:'main', achieved:'Capai'    },
    { name:'MSB',                      sym:'MSB',       ipoP:0.200, cincai:0.200, atH:0.170, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'ES Sunlogy',               sym:'SUNLOGY',   ipoP:0.300, cincai:0.400, atH:0.490, sector:'energy',     market:'ace',  achieved:'Capai'    },
    { name:'AMS Advanced Mat',         sym:'AMS',       ipoP:0.290, cincai:0.390, atH:0.410, sector:'industrial', market:'ace',  achieved:'Capai'    },
    { name:'Teamstar',                 sym:'TEAMSTR',   ipoP:0.260, cincai:0.320, atH:0.267, sector:'other',      market:'ace',  achieved:'Tak Capai'},
    { name:'Techstore',                sym:'TECHSTORE', ipoP:0.200, cincai:0.280, atH:0.350, sector:'tech',       market:'ace',  achieved:'Capai'    },
    { name:'One Gasmaster',            sym:'OGM',       ipoP:0.250, cincai:0.300, atH:0.250, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Crest Group',              sym:'CREST',     ipoP:0.350, cincai:0.400, atH:0.400, sector:'industrial', market:'ace',  achieved:'Capai'    },
    { name:'Azam Jaya',                sym:'AZAMJAYA',  ipoP:0.780, cincai:1.040, atH:1.320, sector:'consumer',   market:'main', achieved:'Capai'    },
    { name:'Eco-Shop',                 sym:'ECOSHOP',   ipoP:1.130, cincai:1.310, atH:1.680, sector:'consumer',   market:'main', achieved:'Capai'    },
    { name:'Solar District Cooling',   sym:'SDCG',      ipoP:0.380, cincai:0.540, atH:0.695, sector:'energy',     market:'ace',  achieved:'Capai'    },
    { name:'ICT Zone Asia',            sym:'ICTZONE',   ipoP:0.200, cincai:0.220, atH:0.285, sector:'tech',       market:'ace',  achieved:'Capai'    },
    { name:'Pantech',                  sym:'PGLOBAL',   ipoP:0.680, cincai:0.710, atH:0.575, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Hi Mobility',              sym:'HI',        ipoP:1.220, cincai:1.710, atH:2.270, sector:'tech',       market:'main', achieved:'Capai'    },
    { name:'Keyfield International',   sym:'KEYFIELD',  ipoP:0.900, cincai:2.140, atH:2.850, sector:'energy',     market:'main', achieved:'Capai'    },
    { name:'Well Chip',                sym:'WELLCHIP',  ipoP:1.150, cincai:1.330, atH:1.830, sector:'tech',       market:'main', achieved:'Capai'    },
    { name:'Winstar Capital',          sym:'WINSTAR',   ipoP:0.350, cincai:0.510, atH:0.715, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'Supreme Consolidated',     sym:'SUPREME',   ipoP:0.250, cincai:0.290, atH:0.415, sector:'industrial', market:'ace',  achieved:'Capai'    },
    { name:'Empire Premium',           sym:'EMPIRE',    ipoP:0.700, cincai:0.830, atH:1.210, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'Johor Plantations Group',  sym:'JPG',       ipoP:0.840, cincai:1.270, atH:1.900, sector:'plantation', market:'main', achieved:'Capai'    },
    { name:'LAC Med',                  sym:'LACMED',    ipoP:0.750, cincai:0.830, atH:1.300, sector:'healthcare', market:'main', achieved:'Capai'    },
    { name:'Geohan',                   sym:'GEOHAN',    ipoP:0.550, cincai:0.720, atH:0.525, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'KTI Landmark',             sym:'KTI',       ipoP:0.300, cincai:0.360, atH:0.580, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'PMW International',        sym:'PMW',       ipoP:0.340, cincai:0.490, atH:0.355, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Sumi',                     sym:'SUMI',      ipoP:0.240, cincai:0.250, atH:0.180, sector:'industrial', market:'ace',  achieved:'Tak Capai'},
    { name:'Signature Alliance',       sym:'SAG',       ipoP:0.620, cincai:0.880, atH:0.920, sector:'industrial', market:'ace',  achieved:'Capai'    },
    { name:'Keeming',                  sym:'KEEMING',   ipoP:0.380, cincai:0.680, atH:1.250, sector:'other',      market:'ace',  achieved:'Capai'    },
    { name:'CBH Engineering',          sym:'CBHB',      ipoP:0.280, cincai:0.380, atH:0.700, sector:'tech',       market:'ace',  achieved:'Capai'    },
    { name:'Insights Analytics',       sym:'IAB',       ipoP:0.360, cincai:0.710, atH:1.310, sector:'tech',       market:'ace',  achieved:'Capai'    },
    { name:'Cheeding',                 sym:'CHEEDING',  ipoP:0.360, cincai:0.470, atH:0.920, sector:'consumer',   market:'ace',  achieved:'Capai'    },
    { name:'Life Water',               sym:'LWSABAH',   ipoP:0.650, cincai:0.800, atH:1.600, sector:'consumer',   market:'ace',  achieved:'Capai'    },
    { name:'SkyeChip',                 sym:'SKYECHIP',  ipoP:0.880, cincai:1.580, atH:3.800, sector:'tech',       market:'ace',  achieved:'Capai'    },
    { name:'LSH Capital',              sym:'LSH',       ipoP:0.880, cincai:1.050, atH:2.550, sector:'tech',       market:'main', achieved:'Capai'    },
    { name:'Ambest',                   sym:'AMBEST',    ipoP:0.250, cincai:0.340, atH:0.870, sector:'tech',       market:'ace',  achieved:'Capai'    },
    { name:'Elridge Energy',           sym:'ELRIDGE',   ipoP:0.290, cincai:0.550, atH:1.450, sector:'energy',     market:'ace',  achieved:'Capai'    },
    { name:'Oriental Kopi',            sym:'KOPI',      ipoP:0.440, cincai:0.550, atH:1.580, sector:'consumer',   market:'ace',  achieved:'Capai'    },
];

// DE+NM Hybrid best params (real data)
const deNmParams = {
    techMult:          1.1090,
    energyMult:        1.0142,
    consumerMult:      1.1665,
    plantationMult:    1.1956,
    healthcareMult:    1.0640,
    superMomentumMult: 1.8434,
    highMomentumMult:  1.2392,
    mainMktMult:       1.0098,
    aceIndustrialDisc: 0.8070,
};

function calibrate(cincai, ipo, p) {
    let t = cincai;
    const momentum = ipo.atH / ipo.ipoP;
    if (ipo.sector === 'tech')        t *= p.techMult;
    if (ipo.sector === 'energy')      t *= p.energyMult;
    if (ipo.sector === 'consumer')    t *= p.consumerMult;
    if (ipo.sector === 'plantation')  t *= p.plantationMult;
    if (ipo.sector === 'healthcare')  t *= p.healthcareMult;
    if (momentum >= 2.5)              t *= p.superMomentumMult;
    else if (momentum >= 1.5)         t *= p.highMomentumMult;
    if (ipo.market === 'main')        t *= p.mainMktMult;
    if (ipo.sector === 'industrial' && ipo.market === 'ace') t *= p.aceIndustrialDisc;
    return t;
}

const N = realIpoData.length;

// ── SIFU ORIGINAL STATS (dari gambar image) ───────────────────────────────────
const sifuHits    = realIpoData.filter(d => d.atH >= d.cincai).length;      // ATH >= Cincai
const sifuMisses  = N - sifuHits;
const sifuHitPct  = (sifuHits / N * 100);
const sifuUpsideMissed = realIpoData
    .filter(d => d.atH > d.cincai)
    .reduce((acc, d) => acc + (d.atH - d.cincai) / d.cincai, 0)
    / realIpoData.filter(d => d.atH > d.cincai).length * 100;
const sifuDownside = realIpoData
    .filter(d => d.atH < d.cincai)
    .reduce((acc, d) => acc + (d.cincai - d.atH) / d.cincai, 0)
    / realIpoData.filter(d => d.atH < d.cincai).length * 100;
const sifuExceed20 = realIpoData.filter(d => d.atH >= d.cincai * 1.20).length;
const sifuExceed50 = realIpoData.filter(d => d.atH >= d.cincai * 1.50).length;

// ── DE+NM CALIBRATED STATS ────────────────────────────────────────────────────
const deNmResults = realIpoData.map(d => {
    const calTarget = calibrate(d.cincai, d, deNmParams);
    return { ...d, calTarget };
});

const deNmHits   = deNmResults.filter(d => d.atH >= d.calTarget).length;
const deNmMisses = N - deNmHits;
const deNmHitPct = (deNmHits / N * 100);
const deNmUpsideMissed = deNmResults
    .filter(d => d.atH > d.calTarget)
    .reduce((acc, d) => acc + (d.atH - d.calTarget) / d.calTarget, 0)
    / deNmResults.filter(d => d.atH > d.calTarget).length * 100;
const deNmDownside = deNmResults
    .filter(d => d.atH < d.calTarget)
    .reduce((acc, d) => acc + (d.calTarget - d.atH) / d.calTarget, 0)
    / deNmResults.filter(d => d.atH < d.calTarget).length * 100;
const deNmExceed20 = deNmResults.filter(d => d.atH >= d.calTarget * 1.20).length;
const deNmExceed50 = deNmResults.filter(d => d.atH >= d.calTarget * 1.50).length;

// ── PRINT RESULTS ─────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   HEAD-TO-HEAD: SIFU ORIGINAL vs DE+NM HYBRID (59 IPO)     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const row = (label, sifu, denm, higherBetter = true) => {
    const sifuVal = typeof sifu === 'number' ? sifu.toFixed(1) + '%' : sifu;
    const denmVal = typeof denm === 'number' ? denm.toFixed(1) + '%' : denm;
    const winner = higherBetter
        ? (denm > sifu ? '🟢 DE+NM' : denm < sifu ? '🔴 Sifu' : '🟡 Sama')
        : (denm < sifu ? '🟢 DE+NM' : denm > sifu ? '🔴 Sifu' : '🟡 Sama');
    console.log(`${label.padEnd(35)} | ${String(sifuVal).padEnd(12)} | ${String(denmVal).padEnd(12)} | ${winner}`);
};

console.log(`${'Metrik'.padEnd(35)} | ${'📌 Sifu Asal'.padEnd(12)} | ${'🛡️ DE+NM'.padEnd(12)} | Winner`);
console.log('─'.repeat(80));
row('Jumlah IPO',                     N,              N,              true);
row('✅ Capai Target (ATH >= Target)', sifuHitPct,    deNmHitPct,    true);
row('❌ Tak Capai (Miss Rate)',         100-sifuHitPct, 100-deNmHitPct, false);
row('Bilangan Capai',                  `${sifuHits}/59`, `${deNmHits}/59`, true);
row('Bilangan Tak Capai',              `${sifuMisses}/59`, `${deNmMisses}/59`, false);
row('% Melebihi Target >20%',         sifuExceed20/N*100, deNmExceed20/N*100, true);
row('% Melebihi Target >50%',         sifuExceed50/N*100, deNmExceed50/N*100, true);
row('Purata Upside Missed (over)',     sifuUpsideMissed, deNmUpsideMissed, false);
row('Purata Error Bila Miss (under)',  sifuDownside,   deNmDownside,   false);

console.log('─'.repeat(80));
console.log(`\n📊 SIFU ASAL: ${sifuHitPct.toFixed(1)}% hit rate (${sifuHits}/${N})`);
console.log(`📊 DE+NM:     ${deNmHitPct.toFixed(1)}% hit rate (${deNmHits}/${N})\n`);

// ── BREAKDOWN BY SECTOR ────────────────────────────────────────────────────────
console.log('─'.repeat(80));
console.log('📊 BREAKDOWN MENGIKUT SEKTOR:');
console.log('─'.repeat(80));
console.log(`${'Sektor'.padEnd(20)} | ${'n'.padEnd(3)} | ${'Sifu Hit'.padEnd(10)} | ${'DE+NM Hit'.padEnd(10)} | Delta`);
console.log('─'.repeat(60));

const sectors = [...new Set(realIpoData.map(d => d.sector))];
for (const s of sectors) {
    const group = realIpoData.filter(d => d.sector === s);
    const deGroup = deNmResults.filter(d => d.sector === s);
    const sHit = group.filter(d => d.atH >= d.cincai).length;
    const dHit = deGroup.filter(d => d.atH >= d.calTarget).length;
    const sHitPct = (sHit / group.length * 100).toFixed(0);
    const dHitPct = (dHit / group.length * 100).toFixed(0);
    const delta = dHit - sHit;
    const arrow = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '─';
    console.log(`${s.padEnd(20)} | ${String(group.length).padEnd(3)} | ${(sHitPct+'%').padEnd(10)} | ${(dHitPct+'%').padEnd(10)} | ${arrow}`);
}

// ── LIST CHANGED OUTCOMES (Sifu Miss → DE+NM Hit or vice versa) ───────────────
console.log('\n─'.repeat(80));
console.log('🔄 KAUNTER YANG BERUBAH STATUS (Sifu ≠ DE+NM):');
console.log('─'.repeat(80));
let improved = 0, worsened = 0;
for (const d of deNmResults) {
    const sifuHit = d.atH >= d.cincai;
    const deNmHit = d.atH >= d.calTarget;
    if (sifuHit !== deNmHit) {
        const status = !sifuHit && deNmHit ? '✅ Miss→Hit  (BAIK)' : '❌ Hit→Miss (TERUK)';
        if (!sifuHit && deNmHit) improved++;
        else worsened++;
        console.log(`  ${d.sym.padEnd(10)} | Sifu: RM${d.cincai.toFixed(3)} vs DE+NM: RM${d.calTarget.toFixed(3)} vs ATH: RM${d.atH.toFixed(3)} | ${status}`);
    }
}
console.log(`\n  🟢 Improved (Miss→Hit): ${improved} kaunter`);
console.log(`  🔴 Worsened (Hit→Miss): ${worsened} kaunter`);
console.log(`  📈 Net gain: +${improved - worsened} kaunter betul`);
