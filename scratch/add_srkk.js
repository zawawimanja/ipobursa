const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

try {
    // 1. Read data.json
    console.log('Reading data.json...');
    const ipos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // 2. Define the new IPO entry
    const newIpo = {
        id: "srkk-ai",
        companyName: "SRKK AI Berhad",
        sector: "Technology (Digital Transformation & AI Solutions)",
        stage: 3,
        price: 0.32,
        market: "ACE Market",
        status: "Application Open",
        openingDate: "2026-06-18T09:00:00",
        closingDate: "25-Jun-2026",
        listingDate: "10-Jul-2026",
        prospectusUrl: "https://bursamalaysia.com/",
        year: 2026,
        shariah: true,
        os: 0,
        ib: "TA Securities",
        fundUse: "Modal kerja, penyelidikan & pembangunan (R&D), serta pengembangan pasaran.",
        predictedGrade: "B",
        avgTP: 0.39,
        sifuTargetPrice: 0.39,
        pe: 18.15,
        analystInsight: "⚠️ <b>WORTH IT (GRADE B)</b><br>💡 Note: Boleh apply, tapi jangan harap pop besar.<br>SRKK AI Berhad merupakan penyedia transformasi digital & rakan kongsi Microsoft (Microsoft Managed Partner pertama di Malaysia dengan kesemua kompetensi AI Cloud).<br><br>📊 <b>Valuation & Fundamental:</b><br>• Harga IPO RM0.32 memberikan PE 18.15x berdasarkan PAT FY24 (RM5.01 juta). Ini adalah wajar (Fair Value RM0.39 berdasarkan 22x PE).<br>• Sekitar 50% hasil adalah pendapatan berulang (recurring revenue).<br><br>⚠️ <b>Risiko:</b> Terdapat komponen Offer for Sale (OFS) sebanyak 13 juta unit saham sedia ada & ditaja jamin oleh TA Securities (mid-tier IB).",
        ofs: true,
        symbol: "SRKK"
    };

    // 3. Insert or update
    const index = ipos.findIndex(ipo => ipo.id === 'srkk-ai');
    if (index !== -1) {
        ipos[index] = newIpo;
        console.log('Updated existing SRKK AI Berhad in IPO list.');
    } else {
        ipos.unshift(newIpo);
        console.log('Added SRKK AI Berhad to IPO list.');
    }

    // 4. Save data.json
    fs.writeFileSync(jsonPath, JSON.stringify(ipos, null, 4), 'utf8');
    console.log('Saved data.json successfully.');

    // 5. Generate data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(ipos, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('Saved data.js successfully.');

} catch (err) {
    console.error('Error during update:', err);
    process.exit(1);
}
