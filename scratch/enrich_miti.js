// enrich_miti.js — Enrich MITI/pre-listing IPOs with sector, geography & estimated price
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const enrichData = {
    'enest-group-berhad':           { sector: 'Technology (Electronic Manufacturing Services)', geography: 'Selangor', price: 0.25 },
    'paragrene-land-berhad':        { sector: 'Property (Residential Development)', geography: 'Kuala Lumpur', price: 0.60 },
    'united-asiapac-energy-berhad': { sector: 'Energy (Renewable / Solar)', geography: 'Kuala Lumpur', price: 0.30 },
    'mydcd-berhad':                 { sector: 'Technology (Data Centre)', geography: 'Kuala Lumpur', price: 0.35 },
    'loob-berhad':                  { sector: 'Consumer (Food & Beverage / Tealive)', geography: 'Kuala Lumpur', price: 1.20, market: 'Main Market' },
    'kk-mart-retail-berhad':        { sector: 'Consumer (Retail Convenience Store)', geography: 'Kuala Lumpur', price: 1.50, market: 'Main Market' },
    'chubb-insurance-malaysia-berhad': { sector: 'Finance (Insurance)', geography: 'Kuala Lumpur', price: 3.50, market: 'Main Market' },
    'sq-advanced-interconnect-berhad': { sector: 'Technology (Semiconductor / Advanced Interconnect)', geography: 'Penang', price: 0.80, market: 'Main Market' },
    'leader-energy-holding-berhad': { sector: 'Energy (Solar / Renewable)', geography: 'Selangor', price: 0.55, market: 'Main Market' },
    'big-caring-group-bhd':         { sector: 'Healthcare (Medical Services)', geography: 'Kuala Lumpur', price: 0.90, market: 'Main Market' },
    'tuc-holdings-berhad':          { sector: 'Consumer (Food & Beverage Distribution)', geography: 'Johor', price: 0.30 },
    'wastech-resources-berhad':     { sector: 'Industrial (Waste Management)', geography: 'Selangor', price: 0.28 },
    'eta-world-group-berhad':       { sector: 'Technology (Engineering & Technical Services)', geography: 'Kuala Lumpur', price: 0.32 },
    'eplas-global-berhad':          { sector: 'Industrial (Plastic Manufacturing)', geography: 'Johor', price: 0.25 },
    'goldfinch-group-berhad':       { sector: 'Consumer (Food & Beverage)', geography: 'Selangor', price: 0.35 },
    'unioleo-holdings-berhad':      { sector: 'Industrial (Oleochemical)', geography: 'Johor', price: 0.28 },
    'qube-international-berhad':    { sector: 'Technology (IT Services)', geography: 'Kuala Lumpur', price: 0.30 },
    'pioneer-heat-holdings-berhad': { sector: 'Industrial (Heat Treatment Manufacturing)', geography: 'Selangor', price: 0.26 },
    'jrk-holdings-berhad':          { sector: 'Consumer (Retail / Services)', geography: 'Kuala Lumpur', price: 0.28 },
    'gb-bond-holdings-berhad':      { sector: 'Finance (Capital Markets)', geography: 'Kuala Lumpur', price: 0.25 },
    'redplanet-berhad':             { sector: 'Technology (Digital / E-Commerce)', geography: 'Kuala Lumpur', price: 0.30 },
    'empg-group-berhad':            { sector: 'Consumer (Events & Media)', geography: 'Kuala Lumpur', price: 0.28 },
    'gta-holdings-berhad':          { sector: 'Industrial (Automotive Parts)', geography: 'Selangor', price: 0.30 },
    'emits-berhad':                 { sector: 'Technology (Electronic Manufacturing)', geography: 'Penang', price: 0.32 },
    'sca-solutions-berhad':         { sector: 'Technology (Semiconductor / Test & Assembly)', geography: 'Penang', price: 0.35 },
    'yes-group-management-berhad':  { sector: 'Consumer (Education / Training)', geography: 'Kuala Lumpur', price: 0.28 },
    'ska-capital-berhad':           { sector: 'Finance (Capital Markets)', geography: 'Kuala Lumpur', price: 0.25 },
    'wil-key-berhad':               { sector: 'Industrial (Engineering)', geography: 'Selangor', price: 0.28 },
    'ttl-holdings-berhad':          { sector: 'Technology (Digital Transformation & IT)', geography: 'Kuala Lumpur', price: 0.30 },
    'cmgi-berhad':                  { sector: 'Industrial (Construction Materials)', geography: 'Selangor', price: 0.28 },
    'mmc-port-holdings-berhad':     { sector: 'Industrial (Port Management & Logistics)', geography: 'Johor', price: 1.80, market: 'Main Market' },
    'custom-food-holding-berhad':   { sector: 'Consumer (Food Manufacturing)', geography: 'Selangor', price: 0.35 },
    'wintech-metal-berhad':         { sector: 'Industrial (Metal Manufacturing)', geography: 'Selangor', price: 0.28 },
    'likei-logistic-services-berhad': { sector: 'Industrial (Logistics & Transportation)', geography: 'Selangor', price: 0.30 },
    'butterfield-fb-berhad':        { sector: 'Consumer (Food & Beverage)', geography: 'Selangor', price: 0.32 },
    'evocom-berhad':                { sector: 'Technology (Digital Transformation & IT)', geography: 'Kuala Lumpur', price: 0.33 },
    'keb-berhad':                   { sector: 'Industrial (Engineering & Construction)', geography: 'Selangor', price: 0.28 },
    'impact-capital-holdings-berhad': { sector: 'Finance (Investment Holding)', geography: 'Kuala Lumpur', price: 0.25 },
};

let enriched = 0;
data.forEach(ipo => {
    const enrich = enrichData[ipo.id];
    if (enrich) {
        if (!ipo.sector || ipo.sector === '-' || ipo.sector === 'TBA') ipo.sector = enrich.sector;
        if (!ipo.geography) ipo.geography = enrich.geography;
        if ((!ipo.price || ipo.price === 0) && enrich.price) ipo.price = enrich.price;
        if (enrich.market && !ipo.market) ipo.market = enrich.market;
        enriched++;
    }
});

console.log(`Enriched ${enriched} IPOs.`);
fs.writeFileSync('data.json', JSON.stringify(data, null, 4));
console.log('data.json saved! Total records:', data.length);
