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
    
    console.log('Pages length:', result.pages.length);
    console.log('Page 15 text sample (length):', result.pages[14] ? result.pages[14].text.length : 'none');
    if (result.pages[14]) {
        console.log(result.pages[14].text.substring(0, 500));
    }
}

run().catch(console.error);
