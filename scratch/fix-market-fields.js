const fs = require('fs');

async function fixMarketFields() {
    try {
        const filePath = 'data.json';
        const raw = fs.readFileSync(filePath, 'utf8');
        const ipos = JSON.parse(raw);
        
        let fixedCount = 0;
        
        ipos.forEach(ipo => {
            if (!ipo.market) {
                ipo.market = 'ACE Market';
                fixedCount++;
                return;
            }
            const m = ipo.market.trim().toUpperCase();
            if (m !== 'ACE MARKET' && m !== 'MAIN MARKET' && m !== 'LEAP MARKET') {
                let decidedMarket = 'ACE Market';
                
                if (m.includes('MAIN')) {
                    decidedMarket = 'Main Market';
                } else if (m.includes('ACE')) {
                    decidedMarket = 'ACE Market';
                } else {
                    const val = parseFloat(m);
                    // If the cap is > 500M, it's likely Main Market
                    if (val && m.includes('M') && val > 500) {
                        decidedMarket = 'Main Market';
                    } else if (val && m.includes('B')) {
                        decidedMarket = 'Main Market';
                    }
                }
                
                console.log(`Fixing "${ipo.companyName}": "${ipo.market}" -> "${decidedMarket}"`);
                ipo.market = decidedMarket;
                fixedCount++;
            }
        });
        
        if (fixedCount > 0) {
            fs.writeFileSync(filePath, JSON.stringify(ipos, null, 2), 'utf8');
            console.log(`Successfully fixed ${fixedCount} market fields in data.json.`);
            
            // Also update data.js
            const jsContent = `const ipoData = ${JSON.stringify(ipos, null, 2)};\n\nif (typeof module !== 'undefined') {\n    module.exports = ipoData;\n}`;
            fs.writeFileSync('data.js', jsContent, 'utf8');
            console.log('Successfully updated data.js.');
        } else {
            console.log('No market fields needed fixing.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

fixMarketFields();
