const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, '../data.json');
let existingData = [];

if (fs.existsSync(DATA_JSON_FILE)) {
    existingData = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));
} else {
    console.error('data.json not found!');
    process.exit(1);
}

// Check if already exists
const exists = existingData.some(d => d.id === 'skyechip');
if (!exists) {
    const skyechip = {
        "id": "skyechip",
        "companyName": "SkyeChip Berhad",
        "sector": "Technology (Semiconductors & AI)",
        "stage": 5,
        "price": 0.88,
        "market": "Main Market",
        "status": "Listed",
        "listingDate": "20-May-2026",
        "year": 2026,
        "shariah": true,
        "os": 95.03,
        "ib": "Kenanga Investment Bank",
        "predictedGrade": "A",
        "avgTP": 3.30,
        "sifuTargetPrice": 3.30,
        "pe": 28.5,
        "analystInsight": "🔥 <b>MUST BUY (GRADE A)</b><br>💡 Note: Syarikat IC design (fabless) pertama tersenarai di Main Market. Permintaan cip AI global menyokong pertumbuhan jangka panjang.<br><br>📊 <b>Valuation & Fundamental:</b><br>• Permintaan sangat kuat (OS 95.03x). Tiada Offer for Sale (OFS), bermakna tiada tekanan buangan pemegang saham besar.",
        "ofs": false,
        "symbol": "SKYECHIP",
        "strategy": "Swing",
        "currentPrice": 2.90,
        "dailyChange": 0.0
    };
    
    // Insert at the top of the list so it is highlighted
    existingData.unshift(skyechip);
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(existingData, null, 2));
    console.log('Successfully added SkyeChip to data.json');
} else {
    console.log('SkyeChip already exists in data.json');
}
