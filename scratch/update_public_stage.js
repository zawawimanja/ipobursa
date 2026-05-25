const fs = require('fs');
const path = require('path');
const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

const updates = [
  {
    id: 'pentech',
    closingDate: '2026-05-29T17:00:00',
    stage: 3,
    status: 'Application Open'
  },
  {
    id: 'mm-computer',
    closingDate: '2026-05-25T17:00:00',
    stage: 3,
    status: 'Application Open'
  },
  {
    id: 'sum-technology',
    closingDate: '2026-06-04T17:00:00',
    stage: 3,
    status: 'Application Open'
  },
  {
    id: 'elsa',
    closingDate: '2026-06-03T17:00:00',
    stage: 3,
    status: 'Application Open'
  }
];

// Apply updates
updates.forEach(u => {
  const ipo = data.find(d => d.id === u.id);
  if (ipo) {
    ipo.closingDate = u.closingDate;
    ipo.stage = u.stage;
    ipo.status = u.status;
    console.log(`[UPDATED] ${ipo.companyName} -> Stage 3, Closing: ${ipo.closingDate}`);
  }
});

// Check Eckem
const eckem = data.find(d => d.id === 'eckem');
if (eckem) {
    console.log(`[CHECK] Eckem is currently at Stage ${eckem.stage} with status: ${eckem.status}`);
    // If it was wrongly at Stage 3, move it back to Stage 2
    if (eckem.stage === 3) {
        eckem.stage = 2;
        eckem.status = 'MITI Allocation Phase';
        console.log(`[FIXED] Moved Eckem back to Stage 2.`);
    }
}

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(DATA_JS, jsContent);
console.log('Done updating public stage.');
