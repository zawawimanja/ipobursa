const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PDFParse } = require('pdf-parse');

const PDF_URL = 'https://anns.sgp1.digitaloceanspaces.com/3682068.pdf'; // Stratus prospectus

async function run() {
    console.log('Downloading PDF...');
    const response = await axios.get(PDF_URL, { responseType: 'arraybuffer' });
    const buffer = new Uint8Array(response.data);
    
    console.log('Loading parser...');
    const parser = new PDFParse(buffer);
    
    console.log('Getting text...');
    const result = await parser.getText();
    
    console.log('Result properties:', Object.keys(result));
    console.log('Total pages:', result.total);
    console.log('Text preview (first 1000 chars):');
    console.log(result.text.substring(0, 1000));
}

run().catch(console.error);
