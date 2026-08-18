const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function main() {
    const dataBuffer = fs.readFileSync('scratch/mydcd_prospectus.pdf');
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    console.log('Pages:', result.pages);
    const text = (result.text || '');
    fs.writeFileSync('scratch/mydcd_prospectus.txt', text, 'utf8');
    console.log('Text chars:', text.length);
}

main().catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
});
