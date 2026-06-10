const fs = require('fs');
const path = require('path');

const DATA_JSON_PATH = path.join(__dirname, '..', 'data.json');
const DATA_JS_PATH = path.join(__dirname, '..', 'data.js');
const SIFU_SHEETS_PATH = path.join(__dirname, '..', 'sifu-sheets.html');

console.log('--- Updating MMCS IPO status to AVOID ---');

// 1. Update data.json
if (fs.existsSync(DATA_JSON_PATH)) {
    const data = JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8'));
    const mmcs = data.find(item => item.id === 'mm-computer');
    if (mmcs) {
        mmcs.predictedGrade = 'C';
        mmcs.analystInsight = '❌ <b>AVOID</b><br>💡 Note: Jangan apply.<br>OFS besar (47M!) dan IT Services sektor biasa. Profil hampir sama dengan OGX.';
        fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
        console.log('[data.json] Updated MMCS to AVOID.');
    } else {
        console.error('[data.json] MMCS (mm-computer) not found.');
    }
}

// 2. Update data.js
if (fs.existsSync(DATA_JSON_PATH)) {
    const data = JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8'));
    const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(DATA_JS_PATH, jsContent, 'utf8');
    console.log('[data.js] Updated successfully.');
}

// 3. Update sifu-sheets.html catalysts and peers for MMCS
if (fs.existsSync(SIFU_SHEETS_PATH)) {
    let sifuContent = fs.readFileSync(SIFU_SHEETS_PATH, 'utf8');
    
    // Find the catalysts & peers target for mm-computer
    const targetPattern = /'mm-computer': \{[\s\S]*?targetPe: 15\.0,[\s\S]*?catalysts: \[[[\s\S]*?],[\s\S]*?peers: "[\s\S]*?"\s*\}/;
    
    const replacement = `'mm-computer': {
                id: 'mm-computer',
                companyName: 'MMCS Berhad (MM Computer Systems)',
                price: 0.22,
                totalShares: 567000000,
                headers: ["FYE 23", "FYE 24", "FYE 25", "Projection (FYE F)", "Projection (FYE F+1)"],
                
                rev23: 42000000, rev24: 73710000, rev25: 98680000,
                revF: 115000000.00, revF1: 130000000.00,
                
                gp23: 11000000, gp24: 18500000, gp25: 25000000,
                gpF: 29500000, gpF1: 34000000,
                
                pat23: 5200000, pat24: 8690000, pat25: 10120000,
                patF: 12000000.00, patF1: 14000000.00,
                
                eps23: 0.92, eps24: 1.53, eps25: 1.79,
                
                epsGrowthF: 18.5, epsGrowthF1: 16.6,
                
                assets23: 45000000, assets24: 58000000, assets25: 68251000,
                assetsF: 75000000, assetsF1: 85000000,
                
                liab23: 15000000, liab24: 18000000, liab25: 20566000,
                liabF: 22000000, liabF1: 24000000,
                
                targetPe: 15.0,
                catalysts: [
                    "<strong>Sebab AVOID:</strong> OFS besar (47M!) dan IT Services sektor biasa. Profil hampir sama dengan OGX.",
                    "<strong>Tekanan Jualan Tinggi:</strong> Penawaran OFS yang besar (47.34M unit) memberi risiko tekanan jualan tinggi di hari penyenaraian.",
                    "<strong>Sektor Biasa:</strong> IT Services biasa tanpa momentum tema besar (AI/Data Center) untuk menarik minat institusi."
                ],
                peers: "<strong>Peer Comparison:</strong> Profil hampir sama dengan OGX. Walaupun PE munasabah (12.3x), disyorkan AVOID kerana risiko OFS besar."
            }`;

    if (targetPattern.test(sifuContent)) {
        sifuContent = sifuContent.replace(targetPattern, replacement);
        fs.writeFileSync(SIFU_SHEETS_PATH, sifuContent, 'utf8');
        console.log('[sifu-sheets.html] Updated MMCS catalysts and peers to AVOID.');
    } else {
        console.error('[sifu-sheets.html] Could not find the mm-computer profile pattern for replacement.');
    }
}

console.log('Update complete.');
