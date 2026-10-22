const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// npm resolves a dependency by walking up the node_modules chain, like the installer does.
function lockEntryExists(fromPath, depName) {
    const segments = fromPath.split('/').filter(Boolean);
    for (let depth = segments.length; depth >= 0; depth--) {
        const base = segments.slice(0, depth).join('/');
        if (lock.packages[(base ? base + '/' : '') + 'node_modules/' + depName]) return true;
    }
    return false;
}

test('lockfile is committed and declares every direct dependency', () => {
    assert.equal(lock.lockfileVersion, 3);
    Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).forEach(name => {
        assert.ok(lock.packages['node_modules/' + name], `${name} is missing from the lock file`);
    });
});

test('every optional dependency in the dependency graph has a lock entry', () => {
    const missing = [];
    Object.entries(lock.packages).forEach(([fromPath, node]) => {
        Object.keys(node.optionalDependencies || {}).forEach(dep => {
            if (!lockEntryExists(fromPath, dep)) missing.push(`${fromPath || 'root'} -> ${dep}`);
        });
    });
    assert.deepEqual(missing, []);
});

test('native binaries for the GitHub runner and this machine are all present', () => {
    const variants = Object.entries(lock.packages)
        .filter(([key]) => key.startsWith('node_modules/@napi-rs/canvas-'))
        .map(([, node]) => `${(node.os || []).join()}|${(node.cpu || []).join()}|${(node.libc || []).join()}`);
    ['linux|x64|glibc', 'linux|x64|musl', 'win32|x64|'].forEach(expected => {
        assert.ok(variants.includes(expected), `missing lock entry for ${expected}`);
    });
});
