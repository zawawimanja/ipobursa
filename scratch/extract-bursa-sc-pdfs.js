// scratch/extract-bursa-sc-pdfs.js
// Reads the downloaded Rosado (Bursa) and Parkland (SC) prospectus PDFs and
// dumps their text to .txt files so other scripts / humans can grep tables.
const fs = require('node:fs');
const path = require('node:path');
const { PDFParse } = require('pdf-parse');

const targets = [
    {
        label: 'rosado',
        dir: path.join(__dirname, '..', 'scratch', 'rosado-pdfs'),
        names: [
            '2._Approvals_and_Conditions_v2',
            '3._Prospectus_Summary_v2',
            '4._Details_of_Our_IPO_v2',
            '7._Business_Overview_v2',
            '12._Financial_Information_v2',
        ],
    },
    {
        label: 'parkland',
        dir: path.join(__dirname, '..', 'scratch', 'parkland-pdfs'),
        names: [
            '04_Approvals_and_Conditions',
            '03_Prospectus_Summary',
            '05_Details_of_Our_IPO',
            '08_Business_Overview',
            '13_Financial_Information',
        ],
    },
];

(async () => {
    for (const t of targets) {
        for (const n of t.names) {
            const p = path.join(t.dir, n + '.pdf');
            if (!fs.existsSync(p)) { console.warn(`skip ${t.label}: ${n} missing`); continue; }
            const buf = new Uint8Array(fs.readFileSync(p));
            const parser = new PDFParse(buf);
            const res = await parser.getText();
            fs.writeFileSync(path.join(t.dir, n + '.txt'), res.text || '');
            console.log(`${t.label}/${n}: ${res.total} pages, ${(res.text || '').length} chars`);
        }
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
