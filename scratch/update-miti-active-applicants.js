const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(ROOT, 'data.json');
const OVERRIDES_JSON = path.join(ROOT, 'overrides.json');

const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));

// 1. Wil-Key Berhad
const wilKey = data.find(x => x.id === 'wil-key-berhad');
if (wilKey) {
    const wkUpdate = {
        price: 0.23,
        mitiOfferShares: 56250000,
        mitiApplicants: 259,
        mitiCloseDate: '02-Nov-2026',
        stage: 2,
        status: 'MITI Allocation Phase',
        hasMitiTranche: true,
        priceSourceNote: 'Harga tawaran indikatif RM0.23/unit di portal MITI (29 Okt 2026).'
    };
    Object.assign(wilKey, wkUpdate);
    overrides['wil-key-berhad'] = Object.assign({}, overrides['wil-key-berhad'], wkUpdate);
    console.log('✅ Updated Wil-Key Berhad:', wkUpdate);
}

// 2. Rosado Berhad
const rosado = data.find(x => x.id === 'rosado-berhad');
if (rosado) {
    const rosadoUpdate = {
        price: 0.63,
        mitiOfferShares: 487500000,
        mitiApplicants: 184,
        mitiCloseDate: '09-Nov-2026',
        stage: 2,
        status: 'MITI Allocation Phase',
        hasMitiTranche: true,
        priceSourceNote: 'Harga tawaran indikatif RM0.63/unit di portal MITI (29 Okt 2026). Rekod ini berdasarkan pendedahan prospektus Bursa Malaysia (12 Jun 2026) dan tawaran MITI.',
        analystInsight: `<b>IPO BAHARU PASARAN ACE — KONTRAKTOR M&E PUSAT DATA (TAWARAN MITI 29 OKT – 09 NOV)</b><br>• <b>Harga Tawaran Indikatif:</b> RM0.63/unit di portal MITI; permodalan pasaran tersirat ~RM2.46 bilion (3.90 bilion saham).<br>• <b>Penilaian PE:</b> PE ~24.5x atas keuntungan FY25 RM100.2 juta (EPS 2.57 sen) — margin untung bersih tinggi 29% atas hasil RM345.9 juta.<br>• <b>Tawaran MITI:</b> 487.5 juta saham (182j terbitan baharu + 305.5j tawaran jualan); 184 pelabur memohon setakat ini.<br>• Bon pelaksanaan RM40.7 juta menyokong buku tempahan RM817.1 juta; sehingga RM163.4 juta diperlukan untuk projek RM1.63 bilion yang sedang dibida.<br>• <a href="https://www.bursamalaysia.com/regulation/prospectus_exposure/rosado-berhad-rosado" target="_blank" rel="noopener noreferrer">Prospektus Bursa</a> · <a href="https://www.dagangnews.com/index.php/article/terkini/syarikat-kejuruteraan-pusat-data-rosado-bhd-rancang-penyenaraian-di-pasaran-ace-70159" target="_blank" rel="noopener noreferrer">DagangNews</a>`
    };
    Object.assign(rosado, rosadoUpdate);
    overrides['rosado-berhad'] = Object.assign({}, overrides['rosado-berhad'], rosadoUpdate);
    console.log('✅ Updated Rosado Berhad:', { price: rosadoUpdate.price, mitiApplicants: rosadoUpdate.mitiApplicants, mitiOfferShares: rosadoUpdate.mitiOfferShares });
}

fs.writeFileSync(OVERRIDES_JSON, JSON.stringify(overrides, null, 4), 'utf8');
fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
const js = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
fs.writeFileSync(path.join(ROOT, 'data.js'), js, 'utf8');
fs.writeFileSync(path.join(ROOT, 'data_export.js'), js, 'utf8');

console.log('✅ Saved data.json, overrides.json, data.js, data_export.js');
