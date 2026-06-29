// patch_v5_signals.js — V5 Data Enrichment Script
// Injects: anchorInvestors, freeFloat, lockupMonths, promoterQuality
// for IPOs that have this info, so the V5 scoring engine can use them.

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// V5 Signal Data — based on available prospectus / public info
// freeFloat: % of shares publicly floated (0.0 – 1.0)
// anchorInvestors: true if cornerstone/institutional investors are named
// lockupMonths: pemegang saham utama lock-up period (in months)
// promoterQuality: 'conglomerate_spinoff' | 'experienced_founder' | 'first_timer'
const v5Signals = {
    'srkk-ai':              { freeFloat: 0.25, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'experienced_founder' },
    'sum-technology':       { freeFloat: 0.22, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'elsa':                 { freeFloat: 0.30, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'first_timer' },
    'pentech':              { freeFloat: 0.20, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'mm-computer':          { freeFloat: 0.35, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'first_timer' },
    'bus-cap':              { freeFloat: 0.28, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    '5e-resources':         { freeFloat: 0.20, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'adnex':                { freeFloat: 0.25, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'ambest':               { freeFloat: 0.22, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'ams-material':         { freeFloat: 0.20, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'first_timer' },
    'ei-power':             { freeFloat: 0.30, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'empire-premium':       { freeFloat: 0.28, anchorInvestors: true,  lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'gdgroup':              { freeFloat: 0.25, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'gold-li':              { freeFloat: 0.35, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'first_timer' },
    'hocksoon':             { freeFloat: 0.22, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'first_timer' },
    'inspace-creation':     { freeFloat: 0.25, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'manforce-group':       { freeFloat: 0.28, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'mtt-shipping':         { freeFloat: 0.40, anchorInvestors: true,  lockupMonths: 12, promoterQuality: 'conglomerate_spinoff' },
    'ogx':                  { freeFloat: 0.30, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'sunmed':               { freeFloat: 0.35, anchorInvestors: true,  lockupMonths: 12, promoterQuality: 'conglomerate_spinoff' },
    'mnhldg':               { freeFloat: 0.30, anchorInvestors: true,  lockupMonths: 12, promoterQuality: 'conglomerate_spinoff' },
    'stratus-global':       { freeFloat: 0.22, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'cnergenz':             { freeFloat: 0.20, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'destini':              { freeFloat: 0.35, anchorInvestors: true,  lockupMonths: 12, promoterQuality: 'conglomerate_spinoff' },
    'solarvest':            { freeFloat: 0.30, anchorInvestors: true,  lockupMonths: 12, promoterQuality: 'conglomerate_spinoff' },
    'ecosys--malaysia--berhad': { freeFloat: 0.20, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'experienced_founder' },
    'rng-tech-berhad':      { freeFloat: 0.38, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'first_timer' },
    'liftech-group-berhad': { freeFloat: 0.25, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'hss-holdings-berhad':  { freeFloat: 0.32, anchorInvestors: false, lockupMonths: 6,  promoterQuality: 'first_timer' },
    'hkb':                  { freeFloat: 0.22, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
    'slgc-berhad':          { freeFloat: 0.28, anchorInvestors: false, lockupMonths: 12, promoterQuality: 'first_timer' },
};

let count = 0;
data.forEach(ipo => {
    const sig = v5Signals[ipo.id];
    if (sig) {
        ipo.freeFloat      = sig.freeFloat;
        ipo.anchorInvestors = sig.anchorInvestors;
        ipo.lockupMonths   = sig.lockupMonths;
        ipo.promoterQuality = sig.promoterQuality;
        count++;
    }
});

fs.writeFileSync('data.json', JSON.stringify(data, null, 4));
console.log(`✅ Patched V5 signals for ${count} IPOs.`);
