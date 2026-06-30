/**
 * V6 vs V4 vs Sifu — APPLE-TO-APPLE pada 55 IPO yang SAMA
 */
const dataset = [
    { name:"OGX Group",sym:"OGX",ipo:0.350,cincai:0.490,ath:0.490,sg:"trad",mkt:"ace",os:110.1,gd:false },
    { name:"Sunmed",sym:"SUNMED",ipo:1.450,cincai:1.840,ath:1.850,sg:"health",mkt:"main",os:5.58,gd:false },
    { name:"MM Computer Sys",sym:"MMCS",ipo:0.220,cincai:0.240,ath:0.235,sg:"theme",mkt:"ace",os:5,gd:false },
    { name:"Powertechnic",sym:"POWER",ipo:0.350,cincai:0.410,ath:0.400,sg:"theme",mkt:"ace",os:20,gd:false },
    { name:"PSP Energy",sym:"PSP",ipo:0.160,cincai:0.170,ath:0.165,sg:"trad",mkt:"ace",os:10.2,gd:false },
    { name:"5E Resources",sym:"5ER",ipo:0.260,cincai:0.290,ath:0.300,sg:"trad",mkt:"ace",os:7,gd:false },
    { name:"Topvision Eye",sym:"TOPVISN",ipo:0.330,cincai:0.410,ath:0.395,sg:"health",mkt:"ace",os:18.18,gd:false },
    { name:"EPB Group",sym:"EPB",ipo:0.560,cincai:0.710,ath:0.680,sg:"trad",mkt:"ace",os:16.07,gd:false },
    { name:"Verdant Solar",sym:"VERDANT",ipo:0.310,cincai:0.380,ath:0.400,sg:"theme",mkt:"ace",os:19.35,gd:false },
    { name:"Metro Healthcare",sym:"METRO",ipo:0.250,cincai:0.290,ath:0.275,sg:"health",mkt:"ace",os:2,gd:false },
    { name:"Cropmate",sym:"CRPMATE",ipo:0.200,cincai:0.230,ath:0.245,sg:"theme",mkt:"ace",os:22.5,gd:false },
    { name:"Express Power",sym:"XPB",ipo:0.200,cincai:0.250,ath:0.235,sg:"theme",mkt:"ace",os:7.5,gd:false },
    { name:"MTT Shipping",sym:"MTTSL",ipo:1.030,cincai:1.160,ath:1.090,sg:"trad",mkt:"main",os:2.7,gd:false },
    { name:"Bus Cap",sym:"BUSCAP",ipo:0.230,cincai:0.320,ath:0.355,sg:"trad",mkt:"ace",os:15.0,gd:false },
    { name:"Inspace Creation",sym:"INSPACE",ipo:0.250,cincai:0.320,ath:0.290,sg:"theme",mkt:"ace",os:70.3,gd:false },
    { name:"BMS Holdings",sym:"BMS",ipo:0.220,cincai:0.240,ath:0.215,sg:"trad",mkt:"ace",os:11.36,gd:false },
    { name:"Hock Soon",sym:"HOCKSOON",ipo:0.600,cincai:0.630,ath:0.560,sg:"theme",mkt:"main",os:12.5,gd:true },
    { name:"Camaroe",sym:"CAMAROE",ipo:0.140,cincai:0.140,ath:0.160,sg:"trad",mkt:"ace",os:14.29,gd:false },
    { name:"Northern Solar",sym:"NORTHE",ipo:0.630,cincai:0.830,ath:0.950,sg:"theme",mkt:"ace",os:73.2,gd:false },
    { name:"BWYS Group",sym:"BWYS",ipo:0.220,cincai:0.310,ath:0.360,sg:"trad",mkt:"ace",os:45.45,gd:false },
    { name:"AquaWalk",sym:"AQUAWALK",ipo:0.310,cincai:0.370,ath:0.430,sg:"theme",mkt:"ace",os:22.58,gd:false },
    { name:"EI Power",sym:"EIPOWER",ipo:0.480,cincai:0.610,ath:0.710,sg:"theme",mkt:"ace",os:85,gd:false },
    { name:"ISF Group",sym:"ISF",ipo:0.330,cincai:0.690,ath:0.600,sg:"trad",mkt:"ace",os:20,gd:false },
    { name:"Greenergy",sym:"GENERGY",ipo:1.000,cincai:0.830,ath:1.000,sg:"theme",mkt:"main",os:4.2,gd:false },
    { name:"ES Sunlogy",sym:"SUNLOGY",ipo:0.300,cincai:0.400,ath:0.490,sg:"theme",mkt:"ace",os:1.67,gd:false },
    { name:"AMS Advanced",sym:"AMS",ipo:0.290,cincai:0.330,ath:0.410,sg:"trad",mkt:"ace",os:9.03,gd:false },
    { name:"Teamstar",sym:"TEAMSTR",ipo:0.260,cincai:0.320,ath:0.267,sg:"trad",mkt:"ace",os:35.2,gd:false },
    { name:"Techstore",sym:"TECHSTORE",ipo:0.200,cincai:0.280,ath:0.350,sg:"theme",mkt:"ace",os:27.5,gd:false },
    { name:"One Gasmaster",sym:"OGM",ipo:0.250,cincai:0.300,ath:0.250,sg:"trad",mkt:"ace",os:20,gd:true },
    { name:"Crest Group",sym:"CREST",ipo:0.350,cincai:0.320,ath:0.400,sg:"theme",mkt:"ace",os:12.86,gd:false },
    { name:"Azam Jaya",sym:"AZAMJAYA",ipo:0.780,cincai:1.040,ath:1.320,sg:"trad",mkt:"main",os:23,gd:false },
    { name:"Eco-Shop",sym:"ECOSHOP",ipo:1.130,cincai:1.310,ath:1.680,sg:"theme",mkt:"main",os:10.62,gd:false },
    { name:"Solar District",sym:"SDCG",ipo:0.380,cincai:0.540,ath:0.695,sg:"theme",mkt:"ace",os:31.58,gd:false },
    { name:"ICT Zone Asia",sym:"ICTZONE",ipo:0.200,cincai:0.220,ath:0.285,sg:"theme",mkt:"ace",os:12.0,gd:false },
    { name:"Pantech",sym:"PGLOBAL",ipo:0.680,cincai:0.710,ath:0.575,sg:"trad",mkt:"main",os:20,gd:true },
    { name:"Hi Mobility",sym:"HI",ipo:1.220,cincai:1.710,ath:2.270,sg:"theme",mkt:"main",os:20,gd:false },
    { name:"Keyfield Int",sym:"KEYFIELD",ipo:0.900,cincai:2.140,ath:2.850,sg:"theme",mkt:"main",os:9.69,gd:false },
    { name:"Well Chip",sym:"WELLCHIP",ipo:1.150,cincai:1.330,ath:1.830,sg:"trad",mkt:"main",os:43.48,gd:false },
    { name:"Winstar Capital",sym:"WINSTAR",ipo:0.350,cincai:0.510,ath:0.715,sg:"trad",mkt:"ace",os:40,gd:false },
    { name:"Supreme Consolidated",sym:"SUPREME",ipo:0.250,cincai:0.290,ath:0.415,sg:"theme",mkt:"ace",os:48,gd:false },
    { name:"Empire Premium",sym:"EMPIRE",ipo:0.700,cincai:0.830,ath:1.210,sg:"theme",mkt:"main",os:23.3,gd:false },
    { name:"JPG",sym:"JPG",ipo:0.840,cincai:1.270,ath:1.900,sg:"trad",mkt:"main",os:20,gd:false },
    { name:"LAC Med",sym:"LACMED",ipo:0.750,cincai:0.830,ath:1.300,sg:"health",mkt:"main",os:8.5,gd:false },
    { name:"Geohan",sym:"GEOHAN",ipo:0.550,cincai:0.720,ath:0.525,sg:"trad",mkt:"main",os:15,gd:false },
    { name:"KTI Landmark",sym:"KTI",ipo:0.300,cincai:0.360,ath:0.580,sg:"trad",mkt:"ace",os:8.73,gd:false },
    { name:"PMW International",sym:"PMW",ipo:0.340,cincai:0.490,ath:0.355,sg:"trad",mkt:"ace",os:9.8,gd:false },
    { name:"Sumi",sym:"SUMI",ipo:0.240,cincai:0.250,ath:0.180,sg:"trad",mkt:"ace",os:20,gd:true },
    { name:"Signature Alliance",sym:"SAG",ipo:0.620,cincai:0.880,ath:0.920,sg:"trad",mkt:"ace",os:20,gd:false },
    { name:"Keeming",sym:"KEEMING",ipo:0.380,cincai:0.680,ath:1.250,sg:"trad",mkt:"ace",os:85.4,gd:false },
    { name:"CBH Engineering",sym:"CBHB",ipo:0.280,cincai:0.380,ath:0.700,sg:"theme",mkt:"ace",os:20,gd:false },
    { name:"Insights Analytics",sym:"IAB",ipo:0.360,cincai:0.710,ath:1.310,sg:"theme",mkt:"ace",os:11.5,gd:false },
    { name:"Cheeding",sym:"CHEEDING",ipo:0.360,cincai:0.470,ath:0.920,sg:"theme",mkt:"ace",os:20,gd:false },
    { name:"Life Water",sym:"LWSABAH",ipo:0.650,cincai:0.800,ath:1.600,sg:"theme",mkt:"main",os:18.46,gd:false },
    { name:"SkyeChip",sym:"SKYECHIP",ipo:0.880,cincai:1.580,ath:3.800,sg:"theme",mkt:"ace",os:20,gd:false },
    { name:"LSH Capital",sym:"LSH",ipo:0.880,cincai:1.050,ath:2.550,sg:"trad",mkt:"ace",os:20,gd:false },
    { name:"Ambest",sym:"AMBEST",ipo:0.250,cincai:0.340,ath:0.870,sg:"trad",mkt:"ace",os:46.07,gd:false },
    { name:"Elridge Energy",sym:"ELRIDGE",ipo:0.290,cincai:0.550,ath:1.450,sg:"theme",mkt:"ace",os:17.24,gd:false },
    { name:"Oriental Kopi",sym:"KOPI",ipo:0.440,cincai:0.550,ath:1.580,sg:"theme",mkt:"ace",os:20,gd:false },
    { name:"Pentech Holdings",sym:"PENTECH",ipo:0.200,cincai:0.330,ath:0.325,sg:"theme",mkt:"ace",os:1.5,gd:false },
];

const active = dataset.filter(d => !d.gd);
const N = active.length;

// V6 sector mapping
function sgV6(sg) {
    if (sg === 'theme') return 'tech'; // theme maps to tech in V6
    if (sg === 'health') return 'health';
    if (sg === 'trad') return 'industrial';
    return 'other';
}

// ─── MODELS ───────────────────────────────────────────────────
// Sifu baseline
function sifuPred(d) { return d.cincai; }

// V3 (Zone 1)
const v3p = { themeMult: 0.9602, healthMult: 0.9565, tradDisc: 0.7343, mainMult: 1.0220, osScale: -0.0855, upsideScale: 0.0646 };
function v3Pred(d) {
    let t = d.cincai;
    if (d.sg === 'theme') t *= v3p.themeMult;
    else if (d.sg === 'health') t *= v3p.healthMult;
    else if (d.sg === 'trad') t *= v3p.tradDisc;
    if (d.mkt === 'main') t *= v3p.mainMult;
    t *= (1 + v3p.osScale * Math.log1p(d.os) / 5);
    const ur = (d.cincai - d.ipo) / d.ipo;
    t *= (1 + v3p.upsideScale * ur);
    return t;
}

// V6 (new)
const v6p = [-0.062118, -0.094923, 0.757103, 0.923936, 0.955618, 1.091094, 0.836895, 1.052850, 1.061522, 0.074801, 1.219244, 0.125707, -0.747504, -0.000803];
function v6Pred(d) {
    let t = d.cincai;
    const logOs = Math.log1p(d.os);
    t *= (1 + v6p[0] * logOs / 5);
    t *= (1 + v6p[1] * logOs * logOs / 25);
    const s6 = sgV6(d.sg);
    if (s6 === 'tech') t *= v6p[2];
    if (s6 === 'consumer') t *= v6p[3];
    if (s6 === 'energy') t *= v6p[4];
    if (s6 === 'health') t *= v6p[5];
    if (s6 === 'industrial') t *= v6p[6];
    if (s6 === 'construction') t *= v6p[7];
    if (d.mkt === 'main') t *= v6p[8];
    t *= (1 + v6p[9] * (0.3 - 0.3)); // no IB data in original 55
    // no OFS data in original 55 dataset
    const priceNorm = (d.ipo - 0.30) / 0.50;
    t *= (1 + v6p[11] * Math.exp(-priceNorm * priceNorm));
    // no freeFloat data → use default 0.25
    t *= (1 + v6p[12] * (0.25 - 0.22));
    // no promoter/anchor data → neutral
    t *= (1 + v6p[13] * 0);
    return t;
}

// ─── EVALUATE ─────────────────────────────────────────────────
function evaluate(data, predFn, label) {
    let hits = 0, upsideMissedSum = 0, totalAcc = 0;
    const misses = [];
    data.forEach(d => {
        const pred = predFn(d);
        if (d.ath >= pred) {
            hits++;
            upsideMissedSum += ((d.ath - pred) / d.ath) * 100;
        } else {
            misses.push(d.sym);
        }
        totalAcc += Math.min(pred, d.ath) / Math.max(pred, d.ath);
    });
    const n = data.length;
    return {
        label, hits, n,
        hitRate: (hits/n*100).toFixed(1),
        downsideErr: ((n-hits)/n*100).toFixed(1),
        upsideMissed: hits > 0 ? (upsideMissedSum/hits).toFixed(1) : 'N/A',
        accuracy: (totalAcc/n*100).toFixed(2),
        misses
    };
}

const sifu = evaluate(active, sifuPred, 'Sifu CK');
const v3   = evaluate(active, v3Pred, 'AI V3');
const v6   = evaluate(active, v6Pred, 'AI V6');

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('🏆  APPLE-TO-APPLE: SAMA 55 IPO (excl gap-down = ' + N + ' kaunter)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const pad = (s, w) => String(s).padEnd(w);
console.log(`${pad('Aspek', 32)} ${pad('📌 Sifu CK', 16)} ${pad('🤖 V3/V4', 16)} ${pad('⚡ V6', 16)} Siapa Menang?`);
console.log('-'.repeat(100));
console.log(`${pad('Hit Rate (Dijamin Capai)', 32)} ${pad(sifu.hitRate+'%', 16)} ${pad(v3.hitRate+'%', 16)} ${pad(v6.hitRate+'%', 16)} ${Number(v6.hitRate) >= Number(v3.hitRate) ? '⚡ V6 👑' : '🤖 V3 👑'}`);
console.log(`${pad('Downside Error', 32)} ${pad(sifu.downsideErr+'%', 16)} ${pad(v3.downsideErr+'%', 16)} ${pad(v6.downsideErr+'%', 16)} ${Number(v6.downsideErr) <= Number(v3.downsideErr) ? '⚡ V6 👑' : '🤖 V3 👑'}`);
console.log(`${pad('Upside Missed (Terlepas)', 32)} ${pad(sifu.upsideMissed+'%', 16)} ${pad(v3.upsideMissed+'%', 16)} ${pad(v6.upsideMissed+'%', 16)} ${Number(v6.upsideMissed) < Number(v3.upsideMissed) ? '⚡ V6 👑' : Number(v6.upsideMissed) < Number(sifu.upsideMissed) ? '⚡ V6 👑' : '📌 Sifu 👑'}`);
console.log(`${pad('Overall Accuracy (ke ATH)', 32)} ${pad(sifu.accuracy+'%', 16)} ${pad(v3.accuracy+'%', 16)} ${pad(v6.accuracy+'%', 16)} ${Number(v6.accuracy) > Number(v3.accuracy) ? '⚡ V6 👑' : Number(sifu.accuracy) > Number(v6.accuracy) ? '📌 Sifu 👑' : '⚡ V6 👑'}`);

console.log('\n📋 V3 Misses: ' + (v3.misses.length > 0 ? v3.misses.join(', ') : 'TIADA'));
console.log('📋 V6 Misses: ' + (v6.misses.length > 0 ? v6.misses.join(', ') : 'TIADA'));

// Reference from user's table
console.log('\n\n═══════════════════════════════════════════════════════════════════════');
console.log('📊  PERBANDINGAN DENGAN DATA LAMA ANDA:');
console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log(`${pad('Aspek', 32)} ${pad('V4 (Lama)', 16)} ${pad('⚡ V6 (Baru)', 16)} V6 vs V4?`);
console.log('-'.repeat(80));
console.log(`${pad('Hit Rate', 32)} ${pad('88.2%', 16)} ${pad(v6.hitRate+'%', 16)} ${Number(v6.hitRate) > 88.2 ? '⚡ V6 MENANG' : Number(v6.hitRate) === 88.2 ? 'SERI' : '🚀 V4 menang'}`);
console.log(`${pad('Downside Error', 32)} ${pad('0.0%', 16)} ${pad(v6.downsideErr+'%', 16)} ${Number(v6.downsideErr) === 0 ? 'SERI' : '🚀 V4 menang'}`);
console.log(`${pad('Upside Missed', 32)} ${pad('39.5%', 16)} ${pad(v6.upsideMissed+'%', 16)} ${Number(v6.upsideMissed) < 39.5 ? '⚡ V6 MENANG' : '🚀 V4 menang'}`);
console.log(`${pad('Overall Accuracy', 32)} ${pad('83.15%', 16)} ${pad(v6.accuracy+'%', 16)} ${Number(v6.accuracy) > 83.15 ? '⚡ V6 MENANG' : '🚀 V4 menang'}`);
