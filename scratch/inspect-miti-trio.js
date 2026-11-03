const d = require('../data.json');
for (const id of ['rosado-berhad', 'parkland-berhad']) {
    const r = d.find(x => x.id === id);
    console.log('---', id, '---');
    console.log(JSON.stringify({
        price: r.price, priceStatus: r.priceStatus, market: r.market, sector: r.sector,
        ib: r.ib, totalShares: r.totalShares, financialProfileStatus: r.financialProfileStatus,
        headers: r.headers, historicalYears: r.historicalYears, projectionHeaders: r.projectionHeaders,
        rev23: r.rev23, rev24: r.rev24, rev25: r.rev25, pat23: r.pat23, pat24: r.pat24, pat25: r.pat25,
        gp25: r.gp25, eps25: r.eps25, pe: r.pe, ipoPe: r.ipoPe, targetPe: r.targetPe,
        ipoNewShares: r.ipoNewShares, ipoOfferForSaleShares: r.ipoOfferForSaleShares,
        ipoTotalOfferShares: r.ipoTotalOfferShares, ofs: r.ofs, ofsPercentage: r.ofsPercentage,
        mitiOfferShares: r.mitiOfferShares, mitiApplicants: r.mitiApplicants,
        prospectusUrl: r.prospectusUrl, moratorium: r.moratorium && r.moratorium.substring(0, 60),
        sifuTargetPrice: r.sifuTargetPrice, calibratedSifuTargetPrice: r.calibratedSifuTargetPrice,
        stage: r.stage, mitiOpenDate: r.mitiOpenDate, mitiCloseDate: r.mitiCloseDate,
        listingDate: r.listingDate,
    }, null, 2));
}
