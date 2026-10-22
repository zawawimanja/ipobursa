#!/usr/bin/env node
// Job health must reflect what the runner can actually reach. Sources blocked from the
// runner IP are reported as warnings; a source the runner normally completes must fail the job.
// Each workflow only checks the sources it ran itself, so it cannot go red for another run.
const path = require('node:path');
const { readSyncStatus } = require('../lib/sync-health');

const WORKING_SOURCES = ['klse', 'i3investor', 'shariah', 'target-calculation', 'ipo-pages', 'group-archive'];
const BLOCKED_SOURCES = ['miti-portal', 'miti-applicants', 'balloting', 'isaham-api'];

function evaluate(sources = {}, required = WORKING_SOURCES) {
    const errors = [];
    const warnings = [];
    required.forEach(name => {
        const source = sources[name];
        if (!source) return errors.push(`${name} did not report a status.`);
        if (source.status === 'failed') return errors.push(`${name} failed: ${source.message || 'no message'}`);
        if (source.status === 'partial') return warnings.push(`${name} partial: ${source.message || 'no message'}`);
        if (source.status === 'skipped') return warnings.push(`${name} was skipped: ${source.message || 'no message'}`);
        return null;
    });
    Object.entries(sources).forEach(([name, source]) => {
        if (!BLOCKED_SOURCES.includes(name) || source.status === 'success') return;
        warnings.push(`${name} is ${source.status}: ${source.message || 'no message'}`);
    });
    return { errors, warnings };
}

function parseArgs(argv) {
    const onlyIndex = argv.indexOf('--only');
    if (onlyIndex === -1) return {};
    const only = String(argv[onlyIndex + 1] || '').split(',').map(name => name.trim()).filter(Boolean);
    if (!only.length) throw new Error('Usage: check-sync-sources.js [--only <source,source>]');
    return { only };
}

function main(root = path.join(__dirname, '..'), argv = process.argv.slice(2)) {
    const { only } = parseArgs(argv);
    let sources;
    try {
        sources = readSyncStatus(root).sources;
    } catch (error) {
        console.error(`::error::sync-status.js could not be read: ${error.message}`);
        return { errors: ['sync-status.js is unreadable.'], warnings: [] };
    }
    const required = only
        ? only.map(name => {
            if (!WORKING_SOURCES.includes(name)) throw new Error(`Unknown sync source: ${name}`);
            return name;
        })
        : WORKING_SOURCES;
    const { errors, warnings } = evaluate(sources, required);
    warnings.forEach(message => console.log(`::warning::${message}`));
    if (errors.length) {
        errors.forEach(message => console.error(`::error::${message}`));
        console.error('Pipeline broken: a source this workflow is expected to complete did not succeed. Existing data was preserved.');
        return { errors, warnings };
    }
    console.log(`Sync pipeline finished: ${warnings.length} source(s) reported above, no blocking failure.`);
    return { errors, warnings };
}

if (require.main === module) {
    try {
        if (main().errors.length) process.exitCode = 1;
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { evaluate, parseArgs, main, WORKING_SOURCES, BLOCKED_SOURCES };
