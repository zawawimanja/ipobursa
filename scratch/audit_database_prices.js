const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'data.json');

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Auditing ${data.length} entries in data.json...\n`);

    let issuesCount = 0;

    data.forEach((ipo, index) => {
        // Only audit listed stocks from 2025 and 2026
        if (ipo.status === 'Listed' && (ipo.year === 2025 || ipo.year === 2026)) {
            const price = ipo.price;
            const currentPrice = ipo.currentPrice;

            if (price === undefined || price === null) {
                console.log(`[ISSUE] ${ipo.id} (${ipo.companyName}): Missing IPO price.`);
                issuesCount++;
                return;
            }

            if (currentPrice === undefined || currentPrice === null) {
                console.log(`[ISSUE] ${ipo.id} (${ipo.companyName}): Missing current price.`);
                issuesCount++;
                return;
            }

            // 1. Check if current price is unreasonably high compared to IPO price (e.g. > 15x)
            // unless flagged as an outlier (like greatec, uwc, solarvest, etc. which have actually grown 10x over years)
            if (price > 0 && currentPrice > price * 15 && !ipo.outlier) {
                console.log(`[SUSPICIOUS PRICE] ${ipo.id} (${ipo.companyName}): IPO Price = RM ${price}, Current Price = RM ${currentPrice} (Unusually high ratio without outlier flag)`);
                issuesCount++;
            }

            // 2. Check if current price is 0 or negative
            if (currentPrice <= 0) {
                console.log(`[SUSPICIOUS PRICE] ${ipo.id} (${ipo.companyName}): Current Price is RM ${currentPrice} (Should be > 0 for Listed status)`);
                issuesCount++;
            }

            // 3. Verify performance calculation
            if (price > 0 && currentPrice > 0 && ipo.performance) {
                const calculatedPerf = ((currentPrice - price) / price) * 100;
                // Parse the existing performance string (e.g., "+39.29%" or "-11.11%" or "+15.2%")
                const cleanPerfStr = ipo.performance.replace(/[+%]/g, '').trim();
                const existingPerfNum = parseFloat(cleanPerfStr);

                if (!isNaN(existingPerfNum)) {
                    const diff = Math.abs(calculatedPerf - existingPerfNum);
                    // Allow small rounding differences up to 0.5%
                    if (diff > 0.5) {
                        console.log(`[MISMATCH PERFORMANCE] ${ipo.id} (${ipo.companyName}): calculated = ${calculatedPerf.toFixed(2)}%, database says = ${ipo.performance} (diff: ${diff.toFixed(2)}%)`);
                        issuesCount++;
                    }
                }
            }
        }
    });

    console.log(`\nAudit finished. Found ${issuesCount} potential issues.`);
} catch (err) {
    console.error('Error running price audit:', err);
}
