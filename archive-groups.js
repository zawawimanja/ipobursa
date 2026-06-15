const fs = require('fs');
const path = require('path');

const DATA_JSON = './data.json';
const ARCHIVE_DIR = './archive';

try {
    // 1. Read data.json
    if (!fs.existsSync(DATA_JSON)) {
        console.error('data.json not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

    // 2. Filter: Shariah-compliant, Grades A/B/C, and in Uptrend (currentPrice >= price)
    const validPicks = data.filter(ipo => 
        ipo.shariah === true && 
        ['A', 'B', 'C'].includes(ipo.predictedGrade) && 
        ipo.currentPrice > 0 && 
        ipo.currentPrice >= ipo.price
    );

    // 3. Categorize into Groups
    const group1 = []; // Fresh 2026 (not hit target yet)
    const group2 = []; // DCA / Swing 2026 (hit target at least once)
    const group3 = []; // Turnaround Mapan (listed before 2026)

    validPicks.forEach(ipo => {
        // Calculate upside
        const upside = typeof ipo.sifuTargetPrice === 'number'
            ? parseFloat((((ipo.sifuTargetPrice - ipo.currentPrice) / ipo.currentPrice) * 100).toFixed(1))
            : null;

        const cleanIpo = {
            id: ipo.id,
            companyName: ipo.companyName,
            symbol: ipo.symbol || ipo.id.toUpperCase(),
            currentPrice: ipo.currentPrice,
            dailyChange: typeof ipo.dailyChange === 'number' ? ipo.dailyChange : null,
            sifuTargetPrice: ipo.sifuTargetPrice || null,
            upside: upside,
            highPrice: ipo.highPrice || null,
            price: ipo.price,
            predictedGrade: ipo.predictedGrade,
            sector: ipo.sector || 'N/A'
        };

        const hasHitBefore = ipo.highPrice && ipo.sifuTargetPrice && ipo.highPrice >= ipo.sifuTargetPrice;

        if (ipo.year === 2026 || ipo.status === 'MITI Allocation Phase' || ipo.stage < 5) {
            if (hasHitBefore) {
                group2.push(cleanIpo);
            } else {
                group1.push(cleanIpo);
            }
        } else {
            group3.push(cleanIpo);
        }
    });

    // Sort function: by dailyChange descending (highest first)
    const sortByDailyGain = (a, b) => {
        const changeA = typeof a.dailyChange === 'number' ? a.dailyChange : -999;
        const changeB = typeof b.dailyChange === 'number' ? b.dailyChange : -999;
        return changeB - changeA;
    };

    group1.sort(sortByDailyGain);
    group2.sort(sortByDailyGain);
    group3.sort(sortByDailyGain);

    // 4. Generate daily archive filename based on Malaysia Time (UTC+8)
    const now = new Date();
    // Offset for Malaysia Time (UTC+8)
    const mstNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const dateStr = mstNow.toISOString().split('T')[0]; // YYYY-MM-DD

    const snapshot = {
        date: dateStr,
        timestamp: mstNow.toISOString(),
        total_stocks: validPicks.length,
        kumpulan_1: {
            count: group1.length,
            stocks: group1
        },
        kumpulan_2: {
            count: group2.length,
            stocks: group2
        },
        kumpulan_3: {
            count: group3.length,
            stocks: group3
        }
    };

    // 5. Ensure archive directory exists
    if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
        console.log(`Created directory ${ARCHIVE_DIR}`);
    }

    const archiveFile = path.join(ARCHIVE_DIR, `groups-${dateStr}.json`);
    fs.writeFileSync(archiveFile, JSON.stringify(snapshot, null, 4));
    console.log(`Successfully archived today's group data to: ${archiveFile}`);

} catch (err) {
    console.error('Error running daily archive script:', err);
    process.exit(1);
}
