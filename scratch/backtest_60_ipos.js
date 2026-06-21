const fs = require('fs');

// The full 61 IPO dataset from compare_stats.js
const ipoDataset = [
    { name: "OGX Group", symbol: "OGX", ipo: 0.350, cincai: 0.490, ath: 0.490, sector: "industrial", market: "ace", os: 110.1, openedGapDown: false },
    { name: "Sunmed", symbol: "SUNMED", ipo: 1.450, cincai: 1.840, ath: 1.850, sector: "healthcare", market: "main", os: 5.58, openedGapDown: false },
    { name: "MM Computer Sys", symbol: "MMCS", ipo: 0.220, cincai: 0.240, ath: 0.235, sector: "tech", market: "ace", os: 5, openedGapDown: false },
    { name: "Powertechnic", symbol: "POWER", ipo: 0.350, cincai: 0.410, ath: 0.400, sector: "utilities", market: "ace", os: 20, openedGapDown: false },
    { name: "PSP Energy", symbol: "PSP", ipo: 0.160, cincai: 0.170, ath: 0.165, sector: "industrial", market: "ace", os: 10.2, openedGapDown: false },
    { name: "5E Resources", symbol: "5ER", ipo: 0.260, cincai: 0.290, ath: 0.300, sector: "industrial", market: "ace", os: 7, openedGapDown: false },
    { name: "Topvision Eye Specialist", symbol: "TOPVISN", ipo: 0.330, cincai: 0.410, ath: 0.395, sector: "healthcare", market: "ace", os: 18.18, openedGapDown: false },
    { name: "EPB Group", symbol: "EPB", ipo: 0.560, cincai: 0.710, ath: 0.680, sector: "industrial", market: "ace", os: 16.07, openedGapDown: false },
    { name: "Verdant Solar", symbol: "VERDANT", ipo: 0.310, cincai: 0.380, ath: 0.400, sector: "energy", market: "ace", os: 19.35, openedGapDown: false },
    { name: "Metro Healthcare", symbol: "METRO", ipo: 0.250, cincai: 0.290, ath: 0.275, sector: "healthcare", market: "ace", os: 2, openedGapDown: false },
    { name: "Cropmate", symbol: "CRPMATE", ipo: 0.200, cincai: 0.230, ath: 0.245, sector: "consumer", market: "ace", os: 22.5, openedGapDown: false },
    { name: "Express Power", symbol: "XPB", ipo: 0.200, cincai: 0.250, ath: 0.235, sector: "utilities", market: "ace", os: 7.5, openedGapDown: false },
    { name: "MTT Shipping", symbol: "MTTSL", ipo: 1.030, cincai: 1.160, ath: 1.090, sector: "transportation", market: "main", os: 2.7, openedGapDown: false },
    { name: "Bus Cap", symbol: "BUSCAP", ipo: 0.230, cincai: 0.320, ath: 0.355, sector: "industrial", market: "ace", os: 15.0, openedGapDown: false },
    { name: "Inspace Creation", symbol: "INSPACE", ipo: 0.250, cincai: 0.320, ath: 0.290, sector: "consumer", market: "ace", os: 70.3, openedGapDown: false },
    { name: "BMS Holdings", symbol: "BMS", ipo: 0.220, cincai: 0.240, ath: 0.215, sector: "industrial", market: "ace", os: 11.36, openedGapDown: false },
    { name: "Hock Soon", symbol: "HOCKSOON", ipo: 0.600, cincai: 0.630, ath: 0.560, sector: "consumer", market: "main", os: 12.5, openedGapDown: true },
    { name: "Camaroe", symbol: "CAMAROE", ipo: 0.140, cincai: 0.140, ath: 0.160, sector: "industrial", market: "ace", os: 14.29, openedGapDown: false },
    { name: "Northern Solar", symbol: "NORTHE", ipo: 0.630, cincai: 0.830, ath: 0.950, sector: "energy", market: "ace", os: 73.2, openedGapDown: false },
    { name: "BWYS Group", symbol: "BWYS", ipo: 0.220, cincai: 0.310, ath: 0.360, sector: "industrial", market: "ace", os: 45.45, openedGapDown: false },
    { name: "AquaWalk", symbol: "AQUAWALK", ipo: 0.310, cincai: 0.370, ath: 0.430, sector: "consumer", market: "ace", os: 22.58, openedGapDown: false },
    { name: "EI Power", symbol: "EIPOWER", ipo: 0.480, cincai: 0.610, ath: 0.710, sector: "energy", market: "ace", os: 85, openedGapDown: false },
    { name: "ISF Group", symbol: "ISF", ipo: 0.330, cincai: 0.690, ath: 0.600, sector: "industrial", market: "ace", os: 20, openedGapDown: false },
    { name: "Wasco / Greenergy", symbol: "GENERGY", ipo: 1.000, cincai: 0.830, ath: 1.000, sector: "energy", market: "main", os: 4.2, openedGapDown: false },
    { name: "MSB", symbol: "MSB", ipo: 0.200, cincai: 0.200, ath: 0.170, sector: "industrial", market: "ace", os: 15, openedGapDown: true },
    { name: "ES Sunlogy", symbol: "SUNLOGY", ipo: 0.300, cincai: 0.400, ath: 0.490, sector: "energy", market: "ace", os: 1.67, openedGapDown: false },
    { name: "AMS Advanced Mat", symbol: "AMS", ipo: 0.290, cincai: 0.330, ath: 0.410, sector: "industrial", market: "ace", os: 9.03, openedGapDown: false },
    { name: "Teamstar", symbol: "TEAMSTR", ipo: 0.260, cincai: 0.320, ath: 0.267, sector: "industrial", market: "ace", os: 35.2, openedGapDown: false },
    { name: "Techstore", symbol: "TECHSTORE", ipo: 0.200, cincai: 0.280, ath: 0.350, sector: "tech", market: "ace", os: 27.5, openedGapDown: false },
    { name: "One Gasmaster", symbol: "OGM", ipo: 0.250, cincai: 0.300, ath: 0.250, sector: "industrial", market: "ace", os: 20, openedGapDown: true },
    { name: "Crest Group", symbol: "CREST", ipo: 0.350, cincai: 0.320, ath: 0.400, sector: "tech", market: "ace", os: 12.86, openedGapDown: false },
    { name: "Azam Jaya", symbol: "AZAMJAYA", ipo: 0.780, cincai: 1.040, ath: 1.320, sector: "construction", market: "main", os: 23, openedGapDown: false },
    { name: "Eco-Shop", symbol: "ECOSHOP", ipo: 1.130, cincai: 1.310, ath: 1.680, sector: "consumer", market: "main", os: 10.62, openedGapDown: false },
    { name: "Solar District Cooling", symbol: "SDCG", ipo: 0.380, cincai: 0.540, ath: 0.695, sector: "energy", market: "ace", os: 31.58, openedGapDown: false },
    { name: "ICT Zone Asia", symbol: "ICTZONE", ipo: 0.200, cincai: 0.220, ath: 0.285, sector: "tech", market: "ace", os: 12.0, openedGapDown: false },
    { name: "Pantech", symbol: "PGLOBAL", ipo: 0.680, cincai: 0.710, ath: 0.575, sector: "industrial", market: "main", os: 20, openedGapDown: true },
    { name: "Hi Mobility", symbol: "HI", ipo: 1.220, cincai: 1.710, ath: 2.270, sector: "tech", market: "main", os: 20, openedGapDown: false },
    { name: "Keyfield International", symbol: "KEYFIELD", ipo: 0.900, cincai: 2.140, ath: 2.850, sector: "energy", market: "main", os: 9.69, openedGapDown: false },
    { name: "Well Chip", symbol: "WELLCHIP", ipo: 1.150, cincai: 1.330, ath: 1.830, sector: "financial", market: "main", os: 43.48, openedGapDown: false },
    { name: "Winstar Capital", symbol: "WINSTAR", ipo: 0.350, cincai: 0.510, ath: 0.715, sector: "industrial", market: "ace", os: 40, openedGapDown: false },
    { name: "Supreme Consolidated", symbol: "SUPREME", ipo: 0.250, cincai: 0.290, ath: 0.415, sector: "consumer", market: "ace", os: 48, openedGapDown: false },
    { name: "Empire Premium", symbol: "EMPIRE", ipo: 0.700, cincai: 0.830, ath: 1.210, sector: "consumer", market: "main", os: 23.3, openedGapDown: false },
    { name: "Johor Plantations Group", symbol: "JPG", ipo: 0.840, cincai: 1.270, ath: 1.900, sector: "plantation", market: "main", os: 20, openedGapDown: false },
    { name: "LAC Med", symbol: "LACMED", ipo: 0.750, cincai: 0.830, ath: 1.300, sector: "healthcare", market: "main", os: 8.5, openedGapDown: false },
    { name: "Geohan", symbol: "GEOHAN", ipo: 0.550, cincai: 0.720, ath: 0.525, sector: "construction", market: "main", os: 15, openedGapDown: false },
    { name: "KTI Landmark", symbol: "KTI", ipo: 0.300, cincai: 0.360, ath: 0.580, sector: "property", market: "ace", os: 8.73, openedGapDown: false },
    { name: "PMW International", symbol: "PMW", ipo: 0.340, cincai: 0.490, ath: 0.355, sector: "industrial", market: "ace", os: 9.8, openedGapDown: false },
    { name: "Sumi", symbol: "SUMI", ipo: 0.240, cincai: 0.250, ath: 0.180, sector: "industrial", market: "ace", os: 20, openedGapDown: true },
    { name: "Signature Alliance", symbol: "SAG", ipo: 0.620, cincai: 0.880, ath: 0.920, sector: "industrial", market: "ace", os: 20, openedGapDown: false },
    { name: "Keeming", symbol: "KEEMING", ipo: 0.380, cincai: 0.680, ath: 1.250, sector: "industrial", market: "ace", os: 85.4, openedGapDown: false },
    { name: "CBH Engineering", symbol: "CBHB", ipo: 0.280, cincai: 0.380, ath: 0.700, sector: "tech", market: "ace", os: 20, openedGapDown: false },
    { name: "Insights Analytics", symbol: "IAB", ipo: 0.360, cincai: 0.710, ath: 1.310, sector: "tech", market: "ace", os: 11.5, openedGapDown: false },
    { name: "Cheeding", symbol: "CHEEDING", ipo: 0.360, cincai: 0.470, ath: 0.920, sector: "utilities", market: "ace", os: 20, openedGapDown: false },
    { name: "Life Water", symbol: "LWSABAH", ipo: 0.650, cincai: 0.800, ath: 1.600, sector: "consumer", market: "main", os: 18.46, openedGapDown: false },
    { name: "SkyeChip", symbol: "SKYECHIP", ipo: 0.880, cincai: 1.580, ath: 3.800, sector: "tech", market: "ace", os: 20, openedGapDown: false },
    { name: "LSH Capital", symbol: "LSH", ipo: 0.880, cincai: 1.050, ath: 2.550, sector: "construction", market: "ace", os: 20, openedGapDown: false },
    { name: "Ambest", symbol: "AMBEST", ipo: 0.250, cincai: 0.340, ath: 0.870, sector: "industrial", market: "ace", os: 46.07, openedGapDown: false },
    { name: "Elridge Energy", symbol: "ELRIDGE", ipo: 0.290, cincai: 0.550, ath: 1.450, sector: "energy", market: "ace", os: 17.24, openedGapDown: false },
    { name: "Oriental Kopi", symbol: "KOPI", ipo: 0.440, cincai: 0.550, ath: 1.580, sector: "consumer", market: "ace", os: 20, openedGapDown: false },
    { name: "Pentech Holdings", symbol: "PENTECH", ipo: 0.200, cincai: 0.330, ath: 0.325, sector: "tech", market: "ace", os: 1.5, openedGapDown: false }
];

console.log(`=================================================================================`);
console.log(`📊 SIMULASI STRATEGI A vs STRATEGI B PADA 61 HISTORICAL IPOs`);
console.log(`=================================================================================\n`);

let strategyANet = 0;
let strategyBNet = 0;

let strategyAWins = 0;
let strategyALosses = 0;
let strategyBWins = 0;
let strategyBLosses = 0;

ipoDataset.forEach(ipo => {
    const ipoPrice = ipo.ipo;
    const ath = ipo.ath;
    const maxGain = ((ath - ipoPrice) / ipoPrice) * 100;
    
    // Default cut loss return
    let returnA = -7.0;
    let returnB = -7.0;

    // Check if it opened gap down below cut loss
    if (ipo.openedGapDown) {
        const gapDownReturn = ((ath - ipoPrice) / ipoPrice) * 100;
        returnA = Math.min(-7.0, gapDownReturn);
        returnB = Math.min(-7.0, gapDownReturn);
    } else {
        // Strategy A (100% Ride with 5% trailing stop)
        if (maxGain >= 10.0) {
            const trailingExit = ath * 0.95;
            returnA = ((trailingExit - ipoPrice) / ipoPrice) * 100;
        } else {
            returnA = -7.0;
        }

        // Strategy B (50-50: 50% at +10.0%, 50% at max(ath*0.95, breakeven))
        if (maxGain >= 10.0) {
            const trailingExit = Math.max(ath * 0.95, ipoPrice);
            const returnRemaining = ((trailingExit - ipoPrice) / ipoPrice) * 100;
            returnB = (0.5 * 10.0) + (0.5 * returnRemaining);
        } else {
            returnB = -7.0;
        }
    }

    strategyANet += returnA;
    strategyBNet += returnB;

    if (returnA >= 0) strategyAWins++; else strategyALosses++;
    if (returnB >= 0) strategyBWins++; else strategyBLosses++;
});

console.log(`=================================================================================`);
console.log(`📈 HASIL PRESTASI STRATEGI KESELURUHAN (61 IPOs)`);
console.log(`=================================================================================`);
console.log(`1. STRATEGI A (100% Ride with Trailing Stop):`);
console.log(`   - Jumlah Pulangan Terkumpul : +${strategyANet.toFixed(1)}%`);
console.log(`   - Purata Per Trade          : +${(strategyANet / ipoDataset.length).toFixed(2)}%`);
console.log(`   - Bilangan Untung/Rugi      : ${strategyAWins} Untung / ${strategyALosses} Rugi`);
console.log(`   - Win Rate                  : ${((strategyAWins / ipoDataset.length) * 100).toFixed(1)}%`);
console.log();
console.log(`2. STRATEGI B (50-50 Cincai Sifu):`);
console.log(`   - Jumlah Pulangan Terkumpul : +${strategyBNet.toFixed(1)}%`);
console.log(`   - Purata Per Trade          : +${(strategyBNet / ipoDataset.length).toFixed(2)}%`);
console.log(`   - Bilangan Untung/Rugi      : ${strategyBWins} Untung / ${strategyBLosses} Rugi`);
console.log(`   - Win Rate                  : ${((strategyBWins / ipoDataset.length) * 100).toFixed(1)}%`);
console.log(`=================================================================================`);
