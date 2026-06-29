const data = require('../data.json');
const miti = data.filter(d => d.stage <= 3);
console.log('Total MITI/Pre-Listing:', miti.length);
miti.forEach(d => {
    console.log({
        id: d.id,
        name: d.companyName,
        stage: d.stage,
        status: d.status,
        price: d.price,
        market: d.market,
        sifuTP: d.sifuTargetPrice || null,
        calibTP: d.calibratedSifuTargetPrice || null,
        sector: d.sector ? d.sector.substring(0, 45) : '-'
    });
});
