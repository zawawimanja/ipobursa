const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jsonPath = path.join(__dirname, '..', 'data.json');
const overridesPath = path.join(__dirname, '..', 'overrides.json');

try {
    // 1. Read data.json
    console.log('Reading data.json...');
    let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // 2. Read overrides.json
    console.log('Reading overrides.json...');
    let overrides = {};
    if (fs.existsSync(overridesPath)) {
        overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
    }

    // 3. Update srkk-ai in data.json
    console.log('Updating srkk-ai in data.json...');
    const srkkIndex = data.findIndex(ipo => ipo.id === 'srkk-ai');
    const srkkInsight = "🚀 <b>EXCEPTIONAL DEMAND (GRADE A)</b><br>💡 Note: Gila meletup! Oversubscription runcit sebanyak 312.3x (tertinggi untuk tahun 2026).<br>SRKK AI Berhad merupakan penyedia transformasi digital & rakan kongsi Microsoft (Microsoft Managed Partner pertama di Malaysia dengan kesemua kompetensi AI Cloud).<br><br>📊 <b>Valuation & Fundamental:</b><br>• Harga IPO RM0.32 memberikan PE 18.15x berdasarkan PAT FY24 (RM5.01 juta). Ini adalah wajar (Fair Value RM0.39 berdasarkan 22x PE).<br>• Sekitar 50% hasil adalah pendapatan berulang (recurring revenue).<br><br>⚠️ <b>Risiko:</b> Terdapat komponen Offer for Sale (OFS) sebanyak 13 juta unit saham sedia ada & ditaja jamin oleh TA Securities (mid-tier IB).";
    
    if (srkkIndex !== -1) {
        data[srkkIndex].os = 312.3;
        data[srkkIndex].predictedGrade = 'A';
        data[srkkIndex].analystInsight = srkkInsight;
        console.log('-> Updated srkk-ai in data.json successfully.');
    } else {
        console.log('-> WARNING: srkk-ai not found in data.json!');
    }

    // 4. Update srkk-ai in overrides.json
    console.log('Updating overrides.json for srkk-ai...');
    overrides['srkk-ai'] = {
        predictedGrade: 'A',
        analystInsight: srkkInsight
    };
    fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 4), 'utf8');
    console.log('-> Updated overrides.json successfully.');

    // 5. Clean up duplicate 'ecosys' if it exists
    console.log('Cleaning up duplicate id: ecosys...');
    data = data.filter(ipo => ipo.id !== 'ecosys');

    // 6. Update existing 'ecosys--malaysia--berhad'
    console.log('Updating existing ecosys--malaysia--berhad...');
    const ecosysIndex = data.findIndex(ipo => ipo.id === 'ecosys--malaysia--berhad');
    const ecosysIpo = {
        id: "ecosys--malaysia--berhad",
        companyName: "EcoSys (Malaysia) Berhad",
        symbol: "ECOSYS",
        sector: "Technology (Semiconductor UHP Precision Fabrication & Abatement Systems)",
        stage: 2,
        market: "ACE Market",
        status: "MITI Allocation Phase",
        price: 0,
        closingDate: "06-Jul-2026",
        listingDate: "",
        shariah: true,
        os: 0,
        ib: "M & A Securities",
        fundUse: "Setup of UHP fabrication facility, expansion of assembly capacity, and R&D for abatement systems.",
        predictedGrade: "B",
        analystInsight: "✅ <b>WORTH IT (GRADE B)</b><br>Syarikat dalam industri pan-semikonduktor bertapak di Pulau Pinang, menyediakan perkhidmatan fabrikasi ketepatan UHP (66% hasil) dan sistem pengurangan (abatement) gas toksik (34% hasil).<br><br>📊 <b>Valuation & Sponsor:</b><br>• Ditaja oleh M & A Securities (Sponsor/IB berprestasi cemerlang).<br>• Sektor semikonduktor terus menerima permintaan yang mantap. Saham Khas Bumiputera (SKB) kini dibuka untuk permohonan melalui portal SahamOnline MITI dari 29 Jun hingga 6 Julai 2026.",
        prospectusUrl: "https://sahamonline.miti.gov.my/",
        dailyChange: null,
        sifuTargetPrice: 0.5,
        calibratedSifuTargetPrice: 0.5
    };

    if (ecosysIndex !== -1) {
        // Keep the position but overwrite content
        data[ecosysIndex] = { ...data[ecosysIndex], ...ecosysIpo };
        console.log('-> Updated ecosys--malaysia--berhad details.');
        
        // Move the updated entry to the front of the list (since it's newly active/upcoming)
        const [updatedEcosys] = data.splice(ecosysIndex, 1);
        data.unshift(updatedEcosys);
        console.log('-> Moved ecosys--malaysia--berhad to the beginning of the list.');
    } else {
        // Fallback: add to the beginning
        data.unshift(ecosysIpo);
        console.log('-> Appended new ecosys--malaysia--berhad entry to front of list.');
    }

    // 7. Save data.json
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
    console.log('Saved data.json successfully.');

    // 8. Run target price recalculations
    console.log('Running scratch/calc_sifu_targets.js...');
    execSync('node scratch/calc_sifu_targets.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('Recalculation complete.');

} catch (err) {
    console.error('Error during update process:', err);
}
