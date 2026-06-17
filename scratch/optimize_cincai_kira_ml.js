const ipoDataset = [
    { name: "OGX Group", symbol: "OGX", ipo: 0.350, cincai: 0.490, ath: 0.490, sector: "industrial", market: "ace", os: 110.1 },
    { name: "Sunmed", symbol: "SUNMED", ipo: 1.450, cincai: 1.840, ath: 1.850, sector: "healthcare", market: "main", os: 5.58 },
    { name: "MM Computer Sys", symbol: "MMCS", ipo: 0.220, cincai: 0.240, ath: 0.235, sector: "tech", market: "ace", os: 5 },
    { name: "Powertechnic", symbol: "POWER", ipo: 0.350, cincai: 0.410, ath: 0.400, sector: "utilities", market: "ace", os: 20 },
    { name: "PSP Energy", symbol: "PSP", ipo: 0.160, cincai: 0.170, ath: 0.165, sector: "industrial", market: "ace", os: 10.2 },
    { name: "5E Resources", symbol: "5ER", ipo: 0.260, cincai: 0.290, ath: 0.300, sector: "industrial", market: "ace", os: 7 },
    { name: "Topvision Eye Specialist", symbol: "TOPVISN", ipo: 0.330, cincai: 0.410, ath: 0.395, sector: "healthcare", market: "ace", os: 18.18 },
    { name: "EPB Group", symbol: "EPB", ipo: 0.560, cincai: 0.710, ath: 0.680, sector: "industrial", market: "ace", os: 16.07 },
    { name: "Verdant Solar", symbol: "VERDANT", ipo: 0.310, cincai: 0.380, ath: 0.400, sector: "energy", market: "ace", os: 19.35 },
    { name: "Metro Healthcare", symbol: "METRO", ipo: 0.250, cincai: 0.290, ath: 0.275, sector: "healthcare", market: "ace", os: 2 },
    { name: "Cropmate", symbol: "CRPMATE", ipo: 0.200, cincai: 0.230, ath: 0.245, sector: "consumer", market: "ace", os: 22.5 },
    { name: "Express Power", symbol: "XPB", ipo: 0.200, cincai: 0.250, ath: 0.235, sector: "utilities", market: "ace", os: 7.5 },
    { name: "MTT Shipping", symbol: "MTTSL", ipo: 1.030, cincai: 1.160, ath: 1.090, sector: "transportation", market: "main", os: 2.7 },
    { name: "Bus Cap", symbol: "BUSCAP", ipo: 0.230, cincai: 0.320, ath: 0.355, sector: "industrial", market: "ace", os: 15.0 },
    { name: "Inspace Creation", symbol: "INSPACE", ipo: 0.250, cincai: 0.320, ath: 0.290, sector: "consumer", market: "ace", os: 70.3 },
    { name: "BMS Holdings", symbol: "BMS", ipo: 0.220, cincai: 0.240, ath: 0.215, sector: "industrial", market: "ace", os: 11.36 },
    { name: "Hock Soon", symbol: "HOCKSOON", ipo: 0.600, cincai: 0.630, ath: 0.560, sector: "consumer", market: "main", os: 12.5 },
    { name: "Camaroe", symbol: "CAMAROE", ipo: 0.140, cincai: 0.140, ath: 0.160, sector: "industrial", market: "ace", os: 14.29 },
    { name: "Northern Solar", symbol: "NORTHE", ipo: 0.630, cincai: 0.830, ath: 0.950, sector: "energy", market: "ace", os: 73.2 },
    { name: "BWYS Group", symbol: "BWYS", ipo: 0.220, cincai: 0.310, ath: 0.360, sector: "industrial", market: "ace", os: 45.45 },
    { name: "AquaWalk", symbol: "AQUAWALK", ipo: 0.310, cincai: 0.370, ath: 0.430, sector: "consumer", market: "ace", os: 22.58 },
    { name: "EI Power", symbol: "EIPOWER", ipo: 0.480, cincai: 0.610, ath: 0.710, sector: "energy", market: "ace", os: 85 },
    { name: "ISF Group", symbol: "ISF", ipo: 0.330, cincai: 0.690, ath: 0.600, sector: "industrial", market: "ace", os: 20 },
    { name: "Wasco / Greenergy", symbol: "GENERGY", ipo: 1.000, cincai: 0.830, ath: 1.000, sector: "energy", market: "main", os: 4.2 },
    { name: "MSB", symbol: "MSB", ipo: 0.200, cincai: 0.200, ath: 0.170, sector: "industrial", market: "ace", os: 15 },
    { name: "ES Sunlogy", symbol: "SUNLOGY", ipo: 0.300, cincai: 0.400, ath: 0.490, sector: "energy", market: "ace", os: 1.67 },
    { name: "AMS Advanced Mat", symbol: "AMS", ipo: 0.290, cincai: 0.330, ath: 0.410, sector: "industrial", market: "ace", os: 9.03 },
    { name: "Teamstar", symbol: "TEAMSTR", ipo: 0.260, cincai: 0.320, ath: 0.267, sector: "industrial", market: "ace", os: 35.2 },
    { name: "Techstore", symbol: "TECHSTORE", ipo: 0.200, cincai: 0.280, ath: 0.350, sector: "tech", market: "ace", os: 27.5 },
    { name: "One Gasmaster", symbol: "OGM", ipo: 0.250, cincai: 0.300, ath: 0.250, sector: "industrial", market: "ace", os: 20 },
    { name: "Crest Group", symbol: "CREST", ipo: 0.350, cincai: 0.320, ath: 0.400, sector: "tech", market: "ace", os: 12.86 },
    { name: "Azam Jaya", symbol: "AZAMJAYA", ipo: 0.780, cincai: 1.040, ath: 1.320, sector: "construction", market: "main", os: 23 },
    { name: "Eco-Shop", symbol: "ECOSHOP", ipo: 1.130, cincai: 1.310, ath: 1.680, sector: "consumer", market: "main", os: 10.62 },
    { name: "Solar District Cooling", symbol: "SDCG", ipo: 0.380, cincai: 0.540, ath: 0.695, sector: "energy", market: "ace", os: 31.58 },
    { name: "ICT Zone Asia", symbol: "ICTZONE", ipo: 0.200, cincai: 0.220, ath: 0.285, sector: "tech", market: "ace", os: 12.0 },
    { name: "Pantech", symbol: "PGLOBAL", ipo: 0.680, cincai: 0.710, ath: 0.575, sector: "industrial", market: "main", os: 20 },
    { name: "Hi Mobility", symbol: "HI", ipo: 1.220, cincai: 1.710, ath: 2.270, sector: "tech", market: "main", os: 20 },
    { name: "Keyfield International", symbol: "KEYFIELD", ipo: 0.900, cincai: 2.140, ath: 2.850, sector: "energy", market: "main", os: 9.69 },
    { name: "Well Chip", symbol: "WELLCHIP", ipo: 1.150, cincai: 1.330, ath: 1.830, sector: "financial", market: "main", os: 43.48 },
    { name: "Winstar Capital", symbol: "WINSTAR", ipo: 0.350, cincai: 0.510, ath: 0.715, sector: "industrial", market: "ace", os: 40 },
    { name: "Supreme Consolidated", symbol: "SUPREME", ipo: 0.250, cincai: 0.290, ath: 0.415, sector: "consumer", market: "ace", os: 48 },
    { name: "Empire Premium", symbol: "EMPIRE", ipo: 0.700, cincai: 0.830, ath: 1.210, sector: "consumer", market: "main", os: 23.3 },
    { name: "Johor Plantations Group", symbol: "JPG", ipo: 0.840, cincai: 1.270, ath: 1.900, sector: "plantation", market: "main", os: 20 },
    { name: "LAC Med", symbol: "LACMED", ipo: 0.750, cincai: 0.830, ath: 1.300, sector: "healthcare", market: "main", os: 8.5 },
    { name: "Geohan", symbol: "GEOHAN", ipo: 0.550, cincai: 0.720, ath: 0.525, sector: "construction", market: "main", os: 15 },
    { name: "KTI Landmark", symbol: "KTI", ipo: 0.300, cincai: 0.360, ath: 0.580, sector: "property", market: "ace", os: 8.73 },
    { name: "PMW International", symbol: "PMW", ipo: 0.340, cincai: 0.490, ath: 0.355, sector: "industrial", market: "ace", os: 9.8 },
    { name: "Sumi", symbol: "SUMI", ipo: 0.240, cincai: 0.250, ath: 0.180, sector: "industrial", market: "ace", os: 20 },
    { name: "Signature Alliance", symbol: "SAG", ipo: 0.620, cincai: 1.290, ath: 0.920, sector: "industrial", market: "ace", os: 20 },
    { name: "Keeming", symbol: "KEEMING", ipo: 0.380, cincai: 0.680, ath: 1.250, sector: "industrial", market: "ace", os: 85.4 },
    { name: "CBH Engineering", symbol: "CBHB", ipo: 0.280, cincai: 0.380, ath: 0.700, sector: "tech", market: "ace", os: 20 },
    { name: "Insights Analytics", symbol: "IAB", ipo: 0.360, cincai: 0.710, ath: 1.310, sector: "tech", market: "ace", os: 11.5 },
    { name: "Cheeding", symbol: "CHEEDING", ipo: 0.360, cincai: 0.470, ath: 0.920, sector: "utilities", market: "ace", os: 20 },
    { name: "Life Water", symbol: "LWSABAH", ipo: 0.650, cincai: 0.800, ath: 1.600, sector: "consumer", market: "main", os: 18.46 },
    { name: "SkyeChip", symbol: "SKYECHIP", ipo: 0.880, cincai: 1.580, ath: 3.800, sector: "tech", market: "ace", os: 20 },
    { name: "LSH Capital", symbol: "LSH", ipo: 0.880, cincai: 1.050, ath: 2.550, sector: "construction", market: "ace", os: 20 },
    { name: "Ambest", symbol: "AMBEST", ipo: 0.250, cincai: 0.340, ath: 0.870, sector: "industrial", market: "ace", os: 46.07 },
    { name: "Elridge Energy", symbol: "ELRIDGE", ipo: 0.290, cincai: 0.550, ath: 1.450, sector: "energy", market: "ace", os: 17.24 },
    { name: "Oriental Kopi", symbol: "KOPI", ipo: 0.440, cincai: 0.550, ath: 1.580, sector: "consumer", market: "ace", os: 20 },
    { name: "Pentech Holdings", symbol: "PENTECH", ipo: 0.200, cincai: 0.330, ath: 0.325, sector: "tech", market: "ace", os: 1.5 }
];

// Determine features for model
ipoDataset.forEach(ipo => {
    // 1. Theme sectors (Semicon, Technology, Energy, Solar, Data Centre, F&B)
    const techSemicon = ["tech", "semiconductor"];
    const energySolar = ["energy", "solar", "utilities"];
    const consumerPremium = ["consumer"];
    
    ipo.isTech = techSemicon.includes(ipo.sector);
    ipo.isEnergy = energySolar.includes(ipo.sector);
    ipo.isConsumer = consumerPremium.includes(ipo.sector);
    
    // We target theme plays:
    // Some tech are standard (like MMCS or Inspace), but others are massive (SkyeChip, IAB).
    // Let's identify "Super Growth Themes": tech/energy/consumer with high OS or high IPO price
    ipo.isSuperTheme = (ipo.isTech || ipo.isEnergy || ipo.isConsumer) && (ipo.os >= 15 || ipo.ipo >= 0.35);
    
    // Traditional ACE construction/industrial
    ipo.isTradAce = (ipo.sector === 'industrial' || ipo.sector === 'construction' || ipo.sector === 'property') && ipo.market === 'ace';
});

// Evaluate prediction function
function getPrediction(ipo, w) {
    let multiplier = 1.0;
    
    // Base multiplier logic
    if (ipo.isSuperTheme) {
        multiplier += w.superThemeMult;
    }
    if (ipo.isTradAce) {
        multiplier -= w.tradAceDiscount;
    }
    if (ipo.market === 'main') {
        multiplier += w.mainMktPremium;
    }
    
    // Oversubscription influence
    // Higher OS means higher demand, which drives price closer to or above target
    if (ipo.os > 0) {
        multiplier += Math.log1p(ipo.os) * w.osWeight;
    }
    
    // Valuation level adjustment (PE and price anchoring)
    // Low-priced IPOs (RM < 0.30) tend to spike more percentagewise
    if (ipo.ipo < 0.30) {
        multiplier += w.lowPriceBonus;
    }
    
    return ipo.cincai * multiplier;
}

function calcAccuracy(dataset, w) {
    let totalError = 0;
    dataset.forEach(ipo => {
        const pred = getPrediction(ipo, w);
        const error = (pred - ipo.ath) / ipo.ath;
        totalError += Math.abs(error);
    });
    return (1 - (totalError / dataset.length)) * 100;
}

// Monte Carlo simulation
console.log('Running Monte Carlo optimization...');
let bestAcc = 0;
let bestWeights = {};

const iterations = 2000000;
for (let i = 0; i < iterations; i++) {
    const w = {
        superThemeMult: Math.random() * 1.5 - 0.2, // -0.2 to 1.3
        tradAceDiscount: Math.random() * 0.5,       // 0 to 0.5
        mainMktPremium: Math.random() * 0.8 - 0.2,  // -0.2 to 0.6
        osWeight: Math.random() * 0.15,             // 0 to 0.15
        lowPriceBonus: Math.random() * 0.4 - 0.1    // -0.1 to 0.3
    };
    
    const acc = calcAccuracy(ipoDataset, w);
    if (acc > bestAcc) {
        bestAcc = acc;
        bestWeights = w;
    }
}

console.log(`\nOptimized Accuracy Score: ${bestAcc.toFixed(2)}%`);
console.log('Best Weights Found:', bestWeights);

// Print detailed comparison for all 60 cases sorted by accuracy
const results = ipoDataset.map(ipo => {
    const pred = getPrediction(ipo, bestWeights);
    const error = ((pred - ipo.ath) / ipo.ath) * 100;
    return {
        name: ipo.name,
        symbol: ipo.symbol,
        ipo: ipo.ipo.toFixed(3),
        original: ipo.cincai.toFixed(3),
        calibrated: pred.toFixed(3),
        ath: ipo.ath.toFixed(3),
        originalError: (((ipo.cincai - ipo.ath) / ipo.ath) * 100).toFixed(1) + '%',
        calibratedError: error.toFixed(1) + '%',
        accuracy: (100 - Math.abs(error)).toFixed(1) + '%'
    };
});

// Calculate win rate using calibrated target
const achievedCount = ipoDataset.filter(ipo => ipo.ath >= getPrediction(ipo, bestWeights)).length;
console.log(`Calibrated Hit-Rate (ATH >= Calibrated Target): ${((achievedCount / ipoDataset.length) * 100).toFixed(1)}% (${achievedCount}/${ipoDataset.length})`);

// Sort by accuracy
results.sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy));
console.log('\n--- Full 60 IPO Calibration Table (Sorted by Accuracy) ---');
console.table(results);
