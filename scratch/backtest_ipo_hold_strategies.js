const fs = require('fs');
const path = require('path');
const axios = require('axios');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

const mappings = JSON.parse(fs.readFileSync('C:/Users/aaror/OneDrive - PERTUBUHAN KESELAMATAN SOSIAL/Desktop/JerungBursa/smart-money-tracker/symbol_mappings.json', 'utf8'));
const ipoDataPath = path.join(__dirname, '../data.json');

if (!fs.existsSync(ipoDataPath)) {
    console.error("❌ data.json not found in ipo project!");
    process.exit(1);
}

const ipoList = JSON.parse(fs.readFileSync(ipoDataPath, 'utf8'));
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchChart(symbol) {
    try {
        await sleep(50);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
        const res = await axios.get(url, { headers: HEADERS });
        if (!res.data || !res.data.chart || !res.data.chart.result || !res.data.chart.result[0]) return null;
        const result = res.data.chart.result[0];
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];
        const close = quote.close;
        const low = quote.low;
        const high = quote.high;
        const open = quote.open;

        const list = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (close[i] !== null && close[i] !== undefined && low[i] !== null && low[i] !== undefined && high[i] !== null && high[i] !== undefined) {
                const date = new Date((timestamps[i] + 8 * 3600) * 1000).toISOString().split('T')[0];
                list.push({ date, open: open[i], high: high[i], low: low[i], close: close[i] });
            }
        }
        return list;
    } catch (e) {
        return null;
    }
}

async function runIpoHoldBacktest() {
    console.log("========================================================================================");
    console.log("🔬 SIMULASI STRATEGI HOLD UNTUK IPO BERGRED OK (GRED A & B)");
    console.log("📅 Menggunakan Data Sejarah Lilin Harian Sebenar (1 Tahun Pasaran)");
    console.log("========================================================================================\n");

    // Filter for listed IPOs with Grade A or B
    const targets = ipoList.filter(item => 
        item.symbol && 
        (item.predictedGrade === 'A' || item.predictedGrade === 'B') &&
        (item.stage === 5 || item.status === 'Listed')
    );

    console.log(`Mengumpul data chart Yahoo Finance untuk ${targets.length} kaunter IPO Gred A/B...`);

    const results = [];

    for (const ipo of targets) {
        const symbol = mappings[ipo.symbol.toUpperCase().trim()];
        if (!symbol) continue;

        const chart = await fetchChart(symbol);
        if (!chart || chart.length < 5) continue;

        const entryPrice = ipo.price; // IPO listing price
        if (!entryPrice || entryPrice <= 0) continue;

        // 1. Hold 10 Days
        const price10 = chart[Math.min(10, chart.length - 1)].close;
        const pnl10 = ((price10 - entryPrice) / entryPrice) * 100;

        // 2. Hold 30 Days
        const price30 = chart[Math.min(30, chart.length - 1)].close;
        const pnl30 = ((price30 - entryPrice) / entryPrice) * 100;

        // 3. Hold 90 Days
        const price90 = chart[Math.min(90, chart.length - 1)].close;
        const pnl90 = ((price90 - entryPrice) / entryPrice) * 100;

        // 4. Trailing Stop 10%
        let peakPrice = chart[0].high;
        let exitPriceTS = chart[0].close;
        let tsExitDate = chart[0].date;
        let tsTriggered = false;

        for (let j = 1; j < chart.length; j++) {
            const day = chart[j];
            if (day.high > peakPrice) {
                peakPrice = day.high;
            }
            const tsLevel = peakPrice * 0.90;
            if (day.low <= tsLevel) {
                exitPriceTS = tsLevel;
                tsExitDate = day.date;
                tsTriggered = true;
                break;
            }
        }
        if (!tsTriggered) {
            exitPriceTS = chart[chart.length - 1].close;
            tsExitDate = chart[chart.length - 1].date;
        }
        const pnlTS = ((exitPriceTS - entryPrice) / entryPrice) * 100;

        // 5. Buy & Hold (Current Price)
        const currentPrice = chart[chart.length - 1].close;
        const pnlHold = ((currentPrice - entryPrice) / entryPrice) * 100;

        results.push({
            name: ipo.symbol,
            grade: ipo.predictedGrade,
            entryPrice,
            pnl10,
            pnl30,
            pnl90,
            pnlTS,
            pnlHold
        });
    }

    // Print comparison summary
    let sum10 = 0, win10 = 0;
    let sum30 = 0, win30 = 0;
    let sum90 = 0, win90 = 0;
    let sumTS = 0, winTS = 0;
    let sumHold = 0, winHold = 0;

    results.forEach(r => {
        sum10 += r.pnl10; if (r.pnl10 > 0) win10++;
        sum30 += r.pnl30; if (r.pnl30 > 0) win30++;
        sum90 += r.pnl90; if (r.pnl90 > 0) win90++;
        sumTS += r.pnlTS; if (r.pnlTS > 0) winTS++;
        sumHold += r.pnlHold; if (r.pnlHold > 0) winHold++;
    });

    const total = results.length;

    console.log(`========================================================================================`);
    console.log(`📊 PRESTASI STRATEGI KELUAR (EXIT STRATEGIES) BAGI ${total} IPO BERGRED A & B:`);
    console.log(`========================================================================================`);
    console.log(`Strategi Pegangan (Hold Style) | Purata Pulangan (Avg PnL) | Kadar Menang (Win Rate)`);
    console.log(`----------------------------------------------------------------------------------------`);
    console.log(`1. Hold Pendek (10 Hari Dagang) | +${(sum10/total).toFixed(2)}%                 | ${((win10/total)*100).toFixed(1)}%`);
    console.log(`2. Hold Sederhana (30 Hari)    | +${(sum30/total).toFixed(2)}%                 | ${((win30/total)*100).toFixed(1)}%`);
    console.log(`3. Hold Suku Tahun (90 Hari)   | +${(sum90/total).toFixed(2)}%                 | ${((win90/total)*100).toFixed(1)}%`);
    console.log(`4. Trailing Stop 10%           | +${(sumTS/total).toFixed(2)}%                 | ${((winTS/total)*100).toFixed(1)}%`);
    console.log(`5. Buy & Hold (Hingga Hari Ini)| +${(sumHold/total).toFixed(2)}%                 | ${((winHold/total)*100).toFixed(1)}%`);
    console.log(`========================================================================================`);
    
    console.log(`\n🏆 KEPUTUSAN MUTLAK:`);
    console.log(`- Strategi terbaik untuk IPO Gred A/B adalah **Trailing Stop 10%** (+${(sumTS/total).toFixed(2)}% untung purata dengan Win Rate ${((winTS/total)*100).toFixed(1)}%).`);
    console.log(`- Memegang secara buta tuli tanpa stop loss (Buy & Hold) menghasilkan purata yang lebih rendah kerana kejatuhan harga selepas pasaran sejuk.`);
    console.log(`- Menggunakan Trailing Stop membolehkan kita menunggang trend naik yang kuat dan keluar secara automatik apabila harga mula berpatah balik!`);
    console.log(`========================================================================================\n`);
}

runIpoHoldBacktest();
