// Records Big Caring's MITI payment deadline from the official allocation letter
// (No Fail MITI.S.700-20/2/322, 22/10/2026): 3,500 unit @ RM1.08, bayaran akhir
// 5.00 petang 30 Okt 2026 (Jumaat) kepada Malaysian Issuing House Sdn Bhd.
// Uses lib/miti-sync so data.json, data.js, data_export.js and overrides.json stay in sync.
const path = require('path');
const { readData, saveData, updateFields } = require('../lib/miti-sync');

const root = path.join(__dirname, '..');
const ID = 'big-caring-group-bhd';
const fields = {
    mitiPaymentDeadline: '2026-10-30T17:00:00+08:00',
    mitiPaymentSource: 'Surat MITI No Fail MITI.S.700-20/2/322, 22/10/2026',
    mitiPaymentNote: 'Surat MITI 22/10/2026: peruntukan 3,500 unit pada RM1.08; arahan pembayaran dan dokumen mesti dikembalikan serta bayaran dibuat selewat-lewatnya 5.00 petang, 30 Okt 2026 (Jumaat) kepada Malaysian Issuing House Sdn Bhd. Bukan tarikh tutup permohonan awam (5 Nov 2026).',
    mitiAllocationUnits: 3500
};

const { data, overrides } = readData(root);
const ipo = data.find(entry => entry.id === ID);
if (!ipo) throw new Error(`Rekaman ${ID} tidak ditemui dalam data.json`);

const changed = updateFields(ipo, fields, overrides);
if (!changed) {
    console.log('Tiada perubahan — nilai sudah direkod.');
} else {
    saveData(root, data, overrides);
    console.log(`Dikemas kini ${ID}:`);
    Object.entries(fields).forEach(([key, value]) => console.log(`  ${key} = ${JSON.stringify(value)}`));
}

const check = readData(root);
const after = check.data.find(entry => entry.id === ID);
console.log('saksi data.json  :', after.mitiPaymentDeadline, '| unit', after.mitiAllocationUnits);
console.log('saksi overrides  :', check.overrides[ID].mitiPaymentDeadline);
