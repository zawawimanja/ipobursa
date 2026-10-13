const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const VALID_STATUSES = new Set(['success', 'partial', 'failed', 'skipped']);

function readSyncStatus(root = projectRoot) {
    const file = path.join(root, 'sync-status.js');
    if (!fs.existsSync(file)) return {};
    const sandbox = { module: { exports: {} } };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { timeout: 1000 });
    return JSON.parse(JSON.stringify(sandbox.module.exports));
}

// Public status files must never contain credentials from request errors.
function safeMessage(message = '') {
    let result = String(message).replace(/[\r\n\t]+/g, ' ');
    for (const [key, value] of Object.entries(process.env)) {
        if (/(TOKEN|SECRET|PASSWORD|API_KEY|USERNAME|CHAT_ID|COOKIE)/i.test(key) && value) {
            result = result.split(value).join('[redacted]');
        }
    }
    return result
        .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
        .replace(/([?&](?:token|key|password|secret|access_token|api_key)=)[^\s&#]+/gi, '$1[redacted]')
        .replace(/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, '$1[redacted]@')
        .slice(0, 240);
}

function aggregateStatus(sources) {
    const statuses = Object.values(sources).map(source => source.status);
    const hasFailure = statuses.some(status => status === 'failed' || status === 'partial');
    const hasSuccess = statuses.includes('success');
    if (hasFailure) return hasSuccess || statuses.includes('partial') ? 'Partial' : 'Failed';
    if (hasSuccess) return 'Success';
    return 'Skipped';
}

function updateSourceStatus(name, update, root = projectRoot) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Invalid sync source name');
    const status = String(update.status || '').toLowerCase();
    if (!VALID_STATUSES.has(status)) throw new Error('Invalid sync source status');
    const now = new Date(update.now || Date.now());
    if (Number.isNaN(now.getTime())) throw new Error('Invalid sync status time');
    const current = readSyncStatus(root);
    const sources = current.sources || {};
    const previous = sources[name] || {};
    const source = {
        ...previous,
        status,
        lastSuccess: previous.lastSuccess || null,
        lastAttempt: now.toISOString(),
        message: safeMessage(update.message)
    };
    if (status === 'success') source.lastSuccess = now.toISOString();
    if (Object.prototype.hasOwnProperty.call(update, 'lastSuccess')) source.lastSuccess = update.lastSuccess;
    if (Object.prototype.hasOwnProperty.call(update, 'lastAttempt')) source.lastAttempt = update.lastAttempt;
    sources[name] = source;
    const result = {
        ...current,
        ...update.legacy,
        status: aggregateStatus(sources),
        sources
    };
    if (status === 'success') {
        const actualRefresh = new Date(source.lastSuccess);
        if (source.lastSuccess && !Number.isNaN(actualRefresh.getTime())) {
            result.lastSync = actualRefresh.toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour12: true });
        }
        result.source = name;
    }
    fs.writeFileSync(path.join(root, 'sync-status.js'),
        `const SYNC_STATUS = ${JSON.stringify(result, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = SYNC_STATUS;\n}\n`);
    return result;
}

module.exports = { updateSourceStatus, readSyncStatus, safeMessage, aggregateStatus };
