// scratch/extract-raiden-pdfs.js
// Reads the four downloaded Raiden prospectus PDFs and dumps their text to .txt
// alongside the source PDFs so other scripts / humans can grep for tables.
const fs = require('node:fs');
const path = require('node:path');
const { PDFParse } = require('pdf-parse');

const dir = path.join(__dirname, '..', 'scratch', 'raiden-pdfs');
const names = ['Approvals_and_Conditions', 'Prospectus_Summary', 'Details_of_the_IPO', 'Financial_Information', 'Business_Overview'];

(async () => {
    for (const n of names) {
        const p = path.join(dir, n + '.pdf');
        const buf = new Uint8Array(fs.readFileSync(p));
        const parser = new PDFParse(buf);
        const res = await parser.getText();
        fs.writeFileSync(path.join(dir, n + '.txt'), res.text || '');
        console.log(`${n}: ${res.total} pages, ${(res.text || '').length} chars`);
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
