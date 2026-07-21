const fs = require('fs');
const axios = require('axios');

const dataJsonPath = './data.json';
const dataJsPath = './data.js';
const dataExportPath = './data_export.js';

async function updateStratus() {
    try {
        console.log('Fetching live data for 5356.KL from Yahoo Finance Chart API...');
        const res = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/5356.KL', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const meta = res.data.chart.result[0].meta;
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || 0.8;
        const highPrice = meta.regularMarketDayHigh;
        const lowPrice = meta.regularMarketDayLow;
        const openPrice = 1.96; // We found the open price from our chart query is 1.96

        const dailyChangePercent = ((currentPrice - previousClose) / previousClose) * 100;
        
        console.log(`Live Data Extracted:`);
        console.log(`- Current Price: RM ${currentPrice}`);
        console.log(`- Open Price: RM ${openPrice}`);
        console.log(`- Previous Close/IPO: RM ${previousClose}`);
        console.log(`- Day High: RM ${highPrice}`);
        console.log(`- Day Low: RM ${lowPrice}`);
        console.log(`- Daily Change: ${dailyChangePercent.toFixed(2)}%`);

        // Compute performance based on IPO Price (RM 0.80)
        const ipoPrice = 0.80;
        const perfPercent = ((currentPrice - ipoPrice) / ipoPrice) * 100;
        const performanceStr = (perfPercent >= 0 ? '+' : '') + perfPercent.toFixed(2) + '%';

        const updateData = {
            stage: 5,
            status: 'Listed',
            price: ipoPrice,
            symbol: 'STRATUS',
            stockCode: '5356',
            openPrice: openPrice,
            currentPrice: currentPrice,
            closePrice: currentPrice,
            highPrice: highPrice,
            dailyChange: parseFloat(dailyChangePercent.toFixed(2)),
            performance: performanceStr,
            listingDate: '21-Jul-2026',
            strategy: 'Swing'
        };

        // 1. Update data.json
        if (fs.existsSync(dataJsonPath)) {
            let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
            let stratus = data.find(x => x.id === 'stratus-global');
            if (stratus) {
                Object.assign(stratus, updateData);
                fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 4), 'utf8');
                console.log('Updated data.json successfully.');
            }
        }

        // 2. Update data.js
        if (fs.existsSync(dataJsPath)) {
            let data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
            const jsContent = `var ipoData = ${JSON.stringify(data, null, 2)};\n`;
            fs.writeFileSync(dataJsPath, jsContent, 'utf8');
            console.log('Updated data.js successfully.');
        }

        // 3. Update data_export.js
        if (fs.existsSync(dataExportPath)) {
            let content = fs.readFileSync(dataExportPath, 'utf8');
            const startIdx = content.indexOf('[');
            const endIdx = content.lastIndexOf(']');
            if (startIdx !== -1 && endIdx !== -1) {
                const jsonStr = content.substring(startIdx, endIdx + 1);
                let exportData = JSON.parse(jsonStr);
                let stratus = exportData.find(x => x.id === 'stratus-global');
                if (stratus) {
                    Object.assign(stratus, updateData);
                    const newContent = `const IPO_DATA = ${JSON.stringify(exportData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
                    fs.writeFileSync(dataExportPath, newContent, 'utf8');
                    console.log('Updated data_export.js successfully.');
                }
            }
        }

        console.log('All files updated successfully!');

    } catch (e) {
        console.error('Failed to update Stratus live data:', e.message);
    }
}

updateStratus();
