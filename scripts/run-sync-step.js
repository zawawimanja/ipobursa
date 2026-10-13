#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { updateSourceStatus, readSyncStatus } = require('../lib/sync-health');

const projectRoot = path.join(__dirname, '..');

function runSyncStep(argv, options = {}) {
    const root = options.root || projectRoot;
    const run = options.spawnSync || spawnSync;
    const env = options.env || process.env;
    const [source, ...remaining] = argv;
    if (!source || !remaining.length) throw new Error('Usage: run-sync-step.js <source> [--managed-status] <script> [args...]');

    const managedStatus = remaining[0] === '--managed-status';
    if (managedStatus) remaining.shift();
    const [script, ...args] = remaining;
    if (!script) throw new Error('A sync script or --skip is required');
    if (script === '--skip') {
        updateSourceStatus(source, { status: 'skipped', message: args.join(' ') || 'Sync skipped.' }, root);
        return 0;
    }

    const before = readSyncStatus(root);
    const result = run(process.execPath, [path.resolve(root, script), ...args], {
        cwd: root, env, stdio: 'inherit', shell: false
    });
    const exitCode = Number.isInteger(result.status) ? result.status : 1;
    // Managed scripts record detailed results, including partial runs and daily guards.
    const after = readSyncStatus(root);
    if (managedStatus && JSON.stringify(after.sources?.[source]) !== JSON.stringify(before.sources?.[source])) {
        return exitCode;
    }
    if (managedStatus && exitCode === 0 && after.sources?.[source]) return 0;

    updateSourceStatus(source, {
        status: exitCode === 0 ? 'success' : 'failed',
        message: exitCode === 0 ? 'Sync completed.' : `Sync failed (exit ${exitCode}).`
    }, root);
    return exitCode;
}

if (require.main === module) {
    try {
        process.exitCode = runSyncStep(process.argv.slice(2));
    } catch (error) {
        console.error('Unable to record sync result:', error.message);
        process.exitCode = 1;
    }
}

module.exports = { runSyncStep };
