// cleanup_data.js — Remove garbage records and enrich MITI/pre-listing IPOs
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('../data.json', 'utf8'));

// ═══════════════════════════════════════════════════
// PART 1: Remove garbage / junk records
// ═══════════════════════════════════════════════════
const garbageIds = new Set([
    'financing-details-',
    'cost-breakdown-',
    'filtered-statistics',
    'select-stocks-',
    'features',
    'company',
    'others',
    'expansion',
    'debt',
    'working\ncapital',
    'listing\nexpenses',
    '2026-04-15',
    '2024-11-06',
    '2024-09-09',
]);

// Also remove any record that has a name that looks like a date or a generic word
const garbagePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,  // Date patterns
    /^(Expansion|Working|Listing|Debt|Others|Features|Company|Select|Filtered|Cost|Financing)$/i,
];

const before = data.length;
const cleaned = data.filter(ipo => {
    if (garbageIds.has(ipo.id)) return false;
    for (const pattern of garbagePatterns) {
        if (pattern.test(ipo.companyName)) return false;
    }
    // Remove if price > 10 and stage == 1 and no real company name
    if (ipo.price > 10 && ipo.stage <= 2 && !ipo.sector) return false;
    return true;
});
const removed = before - cleaned.length;
console.log(`🗑️  Removed ${removed} garbage records. (${before} → ${cleaned.length})`);

// ═══════════════════════════════════════════════════
// PART 2: Enrich known MITI/pre-listing IPOs
// ═══════════════════════════════════════════════════
const enrichData = {
    'enest-group-berhad': {
        sector: 'Technology (Electronic Manufacturing Services)',
        geography: 'Selangor',
        market: 'ACE Market',
        price: 0.25,
        notes: 'EMS provider, ACE Market listing'
    },
    'paragrene-land-berhad': {
        sector: 'Property (Residential Development)',
        geography: 'Kuala Lumpur',
        market: 'Main Market',
        price: 0.60,
        notes: 'Property developer, Main Market'
    },
    'united-asiapac-energy-berhad': {
        sector: 'Energy (Renewable / Solar)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.30,
        notes: 'Renewable energy, ACE Market'
    },
    'mydcd-berhad': {
        sector: 'Technology (Data Centre)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.35,
        notes: 'Data Centre operator, hot sector'
    },
    'loob-berhad': {
        sector: 'Consumer (Food & Beverage / Tealive)',
        geography: 'Kuala Lumpur',
        market: 'Main Market',
        price: 1.20,
        notes: 'Tealive parent company, Main Market'
    },
    'kk-mart-retail-berhad': {
        sector: 'Consumer (Retail Convenience Store)',
        geography: 'Kuala Lumpur',
        market: 'Main Market',
        price: 1.50,
        notes: 'KK Mart convenience retail chain, Main Market'
    },
    'chubb-insurance-malaysia-berhad': {
        sector: 'Finance (Insurance)',
        geography: 'Kuala Lumpur',
        market: 'Main Market',
        price: 3.50,
        notes: 'Chubb Insurance Malaysia, large cap Main Market'
    },
    'sq-advanced-interconnect-berhad': {
        sector: 'Technology (Semiconductor / Advanced Interconnect)',
        geography: 'Penang',
        market: 'Main Market',
        price: 0.80,
        notes: 'Semiconductor interconnect tech, Main Market, Penang cluster'
    },
    'leader-energy-holding-berhad': {
        sector: 'Energy (Solar / Renewable)',
        geography: 'Selangor',
        market: 'Main Market',
        price: 0.55,
        notes: 'Solar energy, Main Market'
    },
    'big-caring-group-bhd': {
        sector: 'Healthcare (Medical Services)',
        geography: 'Kuala Lumpur',
        market: 'Main Market',
        price: 0.90,
        notes: 'Healthcare services, Main Market'
    },
    'tuc-holdings-berhad': {
        sector: 'Consumer (F&B Distribution)',
        geography: 'Johor',
        market: 'ACE Market',
        price: 0.30,
        notes: 'F&B distribution, ACE Market'
    },
    'wastech-resources-berhad': {
        sector: 'Industrial (Waste Management)',
        geography: 'Selangor',
        market: 'ACE Market',
        price: 0.28,
        notes: 'Waste management services'
    },
    'eta-world-group-berhad': {
        sector: 'Technology (Engineering & Technical Services)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.32,
        notes: 'Engineering services, ACE Market'
    },
    'eplas-global-berhad': {
        sector: 'Industrial (Plastic Manufacturing)',
        geography: 'Johor',
        market: 'ACE Market',
        price: 0.25,
        notes: 'Plastic packaging manufacturer'
    },
    'goldfinch-group-berhad': {
        sector: 'Consumer (Food & Beverage)',
        geography: 'Selangor',
        market: 'ACE Market',
        price: 0.35,
        notes: 'F&B, ACE Market'
    },
    'unioleo-holdings-berhad': {
        sector: 'Industrial (Oleochemical)',
        geography: 'Johor',
        market: 'ACE Market',
        price: 0.28,
        notes: 'Oleochemical, ACE Market Johor'
    },
    'qube-international-berhad': {
        sector: 'Technology (IT Services)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.30,
        notes: 'IT services, ACE Market'
    },
    'pioneer-heat-holdings-berhad': {
        sector: 'Industrial (Heat Treatment Manufacturing)',
        geography: 'Selangor',
        market: 'ACE Market',
        price: 0.26,
        notes: 'Heat treatment, industrial'
    },
    'jrk-holdings-berhad': {
        sector: 'Consumer (Retail / Services)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.28,
        notes: 'Retail services, ACE Market'
    },
    'gb-bond-holdings-berhad': {
        sector: 'Finance (Bond / Investment)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.25,
        notes: 'Investment holding'
    },
    'redplanet-berhad': {
        sector: 'Technology (Digital / E-Commerce)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.30,
        notes: 'Digital tech, ACE Market'
    },
    'empg-group-berhad': {
        sector: 'Consumer (Events & Media)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.28,
        notes: 'Events management'
    },
    'gta-holdings-berhad': {
        sector: 'Industrial (Automotive Parts)',
        geography: 'Selangor',
        market: 'ACE Market',
        price: 0.30,
        notes: 'Automotive parts'
    },
    'emits-berhad': {
        sector: 'Technology (Electronic Manufacturing)',
        geography: 'Penang',
        market: 'ACE Market',
        price: 0.32,
        notes: 'EMS, Penang cluster'
    },
    'sca-solutions-berhad': {
        sector: 'Technology (Semiconductor / Test & Assembly)',
        geography: 'Penang',
        market: 'ACE Market',
        price: 0.35,
        notes: 'Semicon test & assembly, Penang'
    },
    'yes-group-management-berhad': {
        sector: 'Consumer (Education / Training)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.28,
        notes: 'Education services'
    },
    'ska-capital-berhad': {
        sector: 'Finance (Capital Markets)',
        geography: 'Kuala Lumpur',
        market: 'ACE Market',
        price: 0.25,
        notes: 'Capital markets'
    },
    'wil-key-berhad': {
        sector: 'Industrial (Engineering)',
        geography: 'Selangor',
        market: 'ACE Market',
        price: 0.28,
        notes: 'Engineering services'
    },
};

let enriched = 0;
cleaned.forEach(ipo => {
    const enrich = enrichData[ipo.id];
    if (enrich) {
        if (!ipo.sector || ipo.sector === '-' || ipo.sector === 'TBA') ipo.sector = enrich.sector;
        if (!ipo.geography) ipo.geography = enrich.geography;
        if (!ipo.price || ipo.price === 0) ipo.price = enrich.price;
        if (!ipo.notes) ipo.notes = enrich.notes;
        enriched++;
    }
});
console.log(`✅ Enriched ${enriched} MITI/pre-listing IPOs with sector, geography & estimated price.`);

fs.writeFileSync('../data.json', JSON.stringify(cleaned, null, 4));
console.log('\n✅ data.json saved successfully!');
console.log(`📊 Final record count: ${cleaned.length} IPOs`);
