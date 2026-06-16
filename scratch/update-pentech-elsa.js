const fs = require('fs');

function updatePentechElsa() {
    const filePath = 'data.json';
    const raw = fs.readFileSync(filePath, 'utf8');
    const ipos = JSON.parse(raw);
    
    let updatedCount = 0;
    ipos.forEach(ipo => {
        if (ipo.id === 'pentech') {
            ipo.predictedGrade = 'B';
            ipo.analystInsight = '✅ <b>WORTH IT (GRADE B)</b><br>Syarikat pembekal jentera industri & peningkatan kemudahan. Dibantu oleh Public Investment Bank (Hero IB). PE 11.8x adalah sangat menarik vs peers. Langganan tinggi (OS 120.98x) menunjukkan permintaan runcit yang sangat luar biasa. Sesuai untuk apply/scalp.';
            updatedCount++;
            console.log('Updated Pentech manual prediction to Grade B.');
        }
        if (ipo.id === 'elsa') {
            ipo.predictedGrade = 'B';
            ipo.analystInsight = '✅ <b>WORTH IT (GRADE B)</b><br>Syarikat pembangunan perisian (Software Suite R&D). Dibantu oleh Malacca Securities (Momentum IB). PE 15.6x adalah berpatutan untuk sektor tech/software. Langganan (OS 26.92x) adalah baik. Sesuai untuk scalp.';
            updatedCount++;
            console.log('Updated Elsa manual prediction to Grade B.');
        }
    });
    
    if (updatedCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(ipos, null, 2), 'utf8');
        console.log(`Successfully updated ${updatedCount} entries in data.json.`);
        
        // Also update data.js
        const jsContent = `const ipoData = ${JSON.stringify(ipos, null, 2)};\n\nif (typeof module !== 'undefined') {\n    module.exports = ipoData;\n}`;
        fs.writeFileSync('data.js', jsContent, 'utf8');
        console.log('Successfully updated data.js.');
    }
}

updatePentechElsa();
