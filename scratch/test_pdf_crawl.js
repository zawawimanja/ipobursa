const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdf = require('pdf-parse');

const PDF_URL = 'https://anns.sgp1.digitaloceanspaces.com/3682068.pdf'; // Stratus prospectus

async function testPdf() {
    console.log('Downloading PDF...');
    const response = await axios.get(PDF_URL, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    console.log('Downloaded', (buffer.length / (1024 * 1024)).toFixed(2), 'MB');

    console.log('Parsing PDF (page-by-page)...');
    
    let pagesToExtract = [];
    
    // We can use a custom pager to search keywords on each page
    await pdf(buffer, {
        pager: function(pageData) {
            return pageData.getTextContent().then(function(textContent) {
                let text = textContent.items.map(item => item.str).join(' ');
                
                // Check if page has critical financial terms
                const hasRevenue = text.includes('Revenue') || text.includes('REVENUE');
                const hasPAT = text.includes('Profit After Tax') || text.includes('PAT') || text.includes('PROFIT AFTER TAX');
                const hasAssets = text.includes('Total assets') || text.includes('Total Assets') || text.includes('TOTAL ASSETS');
                
                if (hasRevenue && hasPAT && hasAssets) {
                    pagesToExtract.push({
                        page: pageData.pageIndex + 1,
                        text: text
                    });
                }
                return '';
            });
        }
    });

    console.log(`Found ${pagesToExtract.length} pages containing key financial tables.`);
    pagesToExtract.forEach(p => {
        console.log(` - Page ${p.page} (Length: ${p.text.length} chars)`);
        console.log(p.text.substring(0, 300).replace(/\s+/g, ' '), '...\n');
    });

    // Save the extracted pages to a text file for inspection
    const outText = pagesToExtract.map(p => `--- PAGE ${p.page} ---\n${p.text}`).join('\n\n');
    fs.writeFileSync(path.join(__dirname, 'pdf_extracted_pages.txt'), outText);
    console.log('Saved to pdf_extracted_pages.txt');
}

testPdf().catch(console.error);
