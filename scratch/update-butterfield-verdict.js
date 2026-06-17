const fs = require('fs');
const path = require('path');

function updateButterfield() {
    const jsonPath = path.join(__dirname, '../data.json');
    const jsPath = path.join(__dirname, '../data.js');

    const raw = fs.readFileSync(jsonPath, 'utf8');
    const ipos = JSON.parse(raw);

    let updated = false;
    ipos.forEach(ipo => {
        if (ipo.id === 'butterfield-fb-berhad') {
            ipo.predictedGrade = 'C';
            ipo.analystInsight = '⚠️ <b>MITI ALLOCATION PHASE (GRADE C)</b><br>Syarikat sektor Consumer (Food & Beverage). Permohonan kuota Bumiputera kini dibuka melalui portal <b>saham.miti.gov.my</b>.<br><br>💡 <b>Analisis Sasaran Sifu:</b> Target harga RM0.50. Sebagai sektor F&B, tiada momentum tema semikonduktor/tech besar, sesuai sebagai nilai wajar jangka sederhana sahaja. Sila perhatikan tarikh tutup window MITI.';
            updated = true;
            console.log('Updated Butterfield FB Berhad entry in database.');
        }
    });

    if (updated) {
        fs.writeFileSync(jsonPath, JSON.stringify(ipos, null, 2), 'utf8');
        console.log('Saved data.json.');

        const jsContent = `const IPO_DATA = ${JSON.stringify(ipos, null, 2)};\n`;
        fs.writeFileSync(jsPath, jsContent, 'utf8');
        console.log('Saved data.js.');
    } else {
        console.log('Butterfield FB Berhad entry not found.');
    }
}

updateButterfield();
