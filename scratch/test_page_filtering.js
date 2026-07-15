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
    
    const incomeMatches = [];
    const balanceMatches = [];
    
    result.pages.forEach((p, idx) => {
        const text = p.text || '';
        const pageNum = idx + 1;
        
        const hasRevenue = text.toLowerCase().includes('revenue');
        const hasPAT = text.toLowerCase().includes('profit after tax') || text.toLowerCase().includes('pat');
        const hasAssets = text.toLowerCase().includes('total assets') || text.toLowerCase().includes('liabilities');
        const hasGP = text.toLowerCase().includes('gross profit') || text.toLowerCase().includes('gp');
        
        if (hasRevenue && (hasPAT || hasGP)) {
            incomeMatches.push(pageNum);
        }
        if (hasAssets && text.toLowerCase().includes('equity')) {
            balanceMatches.push(pageNum);
        }
    });
    
    console.log('Income Matches:', incomeMatches);
    console.log('Balance Matches:', balanceMatches);
}

run().catch(console.error);
