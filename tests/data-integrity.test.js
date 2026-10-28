/**
 * data-integrity.test.js
 * 
 * Guard against silent data corruption in any IPO record that has a Sifu Sheet profile.
 * These tests will fail-fast if someone imports bad data (wrong units, zero values where
 * prospectus data exists, absurdly large forward projections, etc.) so the bug is caught
 * before it ships live to ipobursa.my.
 * 
 * Run with: npm test
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// --- Helpers ---

/** IPOs that have a Sifu Sheet custom profile (have `headers` defined). */
const profiledIpos = data.filter(x => x.headers !== undefined);

/** IPOs with a custom profile AND `financialProfileStatus` is not 'incomplete'. */
const completeProfiles = profiledIpos.filter(x => x.financialProfileStatus !== 'incomplete');

/**
 * Threshold: historical PAT values must be at least this many RM.
 * Catches "value stored in RM thousands instead of RM" mistakes (e.g. 33075 vs 33075000).
 */
const MIN_PAT_FOR_PROFILED_IPO = 500_000; // RM500k — realistic lower bound for any listed/upcoming IPO

/**
 * Threshold: forward revenue projection should not exceed 10x FY25 revenue.
 * Catches string-concatenation / unit bugs that create absurd billions.
 */
const MAX_REVF1_MULTIPLIER = 10;

/**
 * Balance sheet assets must be positive when a record claims to be complete.
 */
const REQUIRES_POSITIVE_ASSETS = true;

// -------------------------------------------------------------------
// Test 1: No historical PAT that is suspiciously tiny (wrong unit)
// -------------------------------------------------------------------
test('no profiled IPO stores historical PAT in thousands instead of RM units', () => {
    const failures = [];

    for (const ipo of completeProfiles) {
        for (const suffix of ['23', '24', '25']) {
            const val = ipo[`pat${suffix}`];
            if (val !== null && val !== undefined && val !== 0) {
                if (Math.abs(val) < MIN_PAT_FOR_PROFILED_IPO) {
                    failures.push(`${ipo.id}.pat${suffix} = ${val} (suspiciously small — stored in RM thousands instead of RM?)`);
                }
            }
        }
    }

    assert.deepEqual(failures, [], `Unit bug detected in PAT fields:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 2: Gross Profit should not be zero for complete profiles
// -------------------------------------------------------------------
test('complete profiled IPOs do not have all-zero gross profit values', () => {
    const failures = [];

    for (const ipo of completeProfiles) {
        // Skip AI-enriched records — they may not have GP data sourced from prospectus
        if (ipo.enrichedBy === 'AI') continue;
        // Skip records where historical revenue is also null (no historical data at all)
        if (!ipo.rev25 && !ipo.rev24 && !ipo.rev23) continue;

        const gp23 = ipo.gp23 ?? null;
        const gp24 = ipo.gp24 ?? null;
        const gp25 = ipo.gp25 ?? null;

        // If ALL three historical GP are 0 or null, flag it
        const allZeroOrNull = [gp23, gp24, gp25].every(v => !v || v === 0);
        if (allZeroOrNull) {
            failures.push(`${ipo.id}: gp23=${gp23}, gp24=${gp24}, gp25=${gp25} — all zero/null on a complete profile`);
        }
    }

    assert.deepEqual(failures, [], `Gross Profit missing in complete profiles:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 3: Total Assets must be positive for complete profiles
// -------------------------------------------------------------------
test('complete profiled IPOs have positive total assets for at least the most recent year', () => {
    if (!REQUIRES_POSITIVE_ASSETS) return;

    const failures = [];

    for (const ipo of completeProfiles) {
        // At minimum, assets25 (or assetsF if 25 not applicable) must be set
        const assets = ipo.assets25 ?? ipo.assetsF ?? null;
        if (!assets || assets <= 0) {
            failures.push(`${ipo.id}: assets25=${ipo.assets25}, assetsF=${ipo.assetsF} — no positive balance sheet assets`);
        }
    }

    assert.deepEqual(failures, [], `Balance sheet assets missing in complete profiles:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 4: Forward revenue projection (revF1) must not be absurdly large
// -------------------------------------------------------------------
test('forward revenue projection revF1 is not more than 10x FY25 revenue (catches concatenation bugs)', () => {
    const failures = [];

    for (const ipo of profiledIpos) {
        const rev25 = ipo.rev25;
        const revF1 = ipo.revF1;

        if (rev25 && revF1 && rev25 > 0) {
            const multiplier = revF1 / rev25;
            if (multiplier > MAX_REVF1_MULTIPLIER) {
                failures.push(`${ipo.id}: revF1=${revF1} is ${multiplier.toFixed(0)}x of rev25=${rev25} (suspected bug, max allowed: ${MAX_REVF1_MULTIPLIER}x)`);
            }
        }
    }

    assert.deepEqual(failures, [], `Absurd revF1 values detected:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 5: Total shares must be set for any profiled IPO with a price
// -------------------------------------------------------------------
test('any profiled IPO with a valid price also has totalShares defined', () => {
    const failures = [];

    for (const ipo of profiledIpos) {
        if (ipo.price > 0 && (!ipo.totalShares || ipo.totalShares <= 0)) {
            failures.push(`${ipo.id}: price=${ipo.price} but totalShares=${ipo.totalShares}`);
        }
    }

    assert.deepEqual(failures, [], `Missing totalShares for priced IPOs:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 6: Sifu Target Price must be within realistic range (0.01 – 20 RM)
// -------------------------------------------------------------------
test('sifuTargetPrice for profiled IPOs is within realistic bounds (RM0.01 – RM20)', () => {
    const failures = [];

    for (const ipo of profiledIpos) {
        const tp = ipo.sifuTargetPrice;
        if (tp !== null && tp !== undefined) {
            if (tp < 0.01 || tp > 20) {
                failures.push(`${ipo.id}: sifuTargetPrice=${tp} is outside realistic bounds`);
            }
        }
    }

    assert.deepEqual(failures, [], `Out-of-range Sifu Target Prices:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 7: Target PE must be within realistic range (2x – 100x)
// -------------------------------------------------------------------
test('targetPe for profiled IPOs is within realistic bounds (2x – 100x)', () => {
    const failures = [];

    for (const ipo of profiledIpos) {
        const pe = ipo.targetPe;
        if (pe !== null && pe !== undefined) {
            if (pe < 2 || pe > 100) {
                failures.push(`${ipo.id}: targetPe=${pe} is outside realistic bounds (2x–100x)`);
            }
        }
    }

    assert.deepEqual(failures, [], `Out-of-range targetPe values:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 8: Each IPO has a unique ID
// -------------------------------------------------------------------
test('all IPO records have unique IDs', () => {
    const seen = new Set();
    const duplicates = [];

    for (const ipo of data) {
        if (seen.has(ipo.id)) {
            duplicates.push(ipo.id);
        }
        seen.add(ipo.id);
    }

    assert.deepEqual(duplicates, [], `Duplicate IDs found:\n${duplicates.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 9: Forward PAT (patF) must not exceed 10x the latest historical PAT
// -------------------------------------------------------------------
test('forward PAT projection patF is not more than 10x historical PAT (catches data entry errors)', () => {
    const failures = [];

    for (const ipo of profiledIpos) {
        const pat25 = ipo.pat25;
        const patF = ipo.patF;

        if (pat25 && patF && pat25 > MIN_PAT_FOR_PROFILED_IPO) {
            const multiplier = patF / pat25;
            if (multiplier > 10) {
                failures.push(`${ipo.id}: patF=${patF} is ${multiplier.toFixed(1)}x of pat25=${pat25} (suspected error)`);
            }
        }
    }

    assert.deepEqual(failures, [], `Absurd patF values detected:\n${failures.join('\n')}`);
});

// -------------------------------------------------------------------
// Test 10: Price must be >= 0 (no negative prices)
// -------------------------------------------------------------------
test('all IPO prices are non-negative', () => {
    const failures = [];

    for (const ipo of data) {
        if (typeof ipo.price === 'number' && ipo.price < 0) {
            failures.push(`${ipo.id}: price=${ipo.price}`);
        }
    }

    assert.deepEqual(failures, [], `Negative price values found:\n${failures.join('\n')}`);
});
