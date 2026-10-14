#!/usr/bin/env node
// Public MITI announcements need no login. Fail closed if the portal blocks or changes its response.
const path = require('node:path');
const { parseMitiDate, parsePublicOffers, matchEntry, readData, saveData, updateFields } = require('../lib/miti-sync');
const { updateSourceStatus, safeMessage } = require('../lib/sync-health');

const ROOT = path.join(__dirname, '..');
const PORTAL = 'https://sahamonline.miti.gov.my/';

function applyOffers(found, root = ROOT) {
    const { data, overrides } = readData(root);
    let updated = 0;
    for (const offer of found) {
        let ipo = matchEntry(data, offer.company);
        if (!ipo) {
            ipo = { id: offer.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                companyName: offer.company, symbol: '', market: 'Unknown', price: 0,
                openingDate: '', closingDate: '', listingDate: '', stage: 1,
                status: 'Draft', year: Number(offer.open.slice(-4)), sector: '' };
            data.unshift(ipo);
        }
        const fields = { mitiOpenDate: offer.open, mitiCloseDate: offer.close, hasMitiTranche: true };
        // A repeated announcement must never demote Listed/Public/Post-MITI records.
        if (ipo.stage === 1) Object.assign(fields, { stage: 2, status: 'MITI Allocation Phase' });
        if (updateFields(ipo, fields, overrides)) updated++;
    }
    if (updated) saveData(root, data, overrides);
    return updated;
}

async function syncPortal(options = {}) {
    const root = options.root || ROOT;
    try {
        const response = await (options.fetch || fetch)(PORTAL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8' },
            signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) throw new Error(`MITI public portal HTTP ${response.status}${response.status === 403 ? ' (access denied from this runner)' : ''}; existing data retained.`);
        const found = parsePublicOffers(await response.text());
        const updated = applyOffers(found, root);
        const message = `${found.length} public MITI offers verified; ${updated} records updated.`;
        updateSourceStatus('miti-portal', { status: 'success', message }, root);
        return { found: found.length, updated };
    } catch (error) {
        const message = safeMessage(error.message);
        updateSourceStatus('miti-portal', { status: 'failed', message }, root);
        throw new Error(message);
    }
}

if (require.main === module) {
    syncPortal().then(result => console.log(`MITI portal: ${result.found} offers, ${result.updated} updated.`))
        .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { syncPortal, applyOffers, parseDateStr: parseMitiDate, parsePublicOffers };
