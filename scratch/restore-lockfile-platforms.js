// Repairs a lockfile that npm regenerated on one platform: npm drops the native
// optional dependencies of every other OS/CPU, and `npm ci` then fails on the
// GitHub Linux runner with "Missing: @napi-rs/canvas-linux-x64-gnu from lock file".
const fs = require('fs');
const nodePath = require('path');
const lockPath = process.argv[2] || nodePath.join(__dirname, '..', 'package-lock.json');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

async function registryMeta(name, version) {
    const res = await fetch(`https://registry.npmjs.org/${name}/${version}`);
    if (!res.ok) throw new Error(`${name}@${version} -> HTTP ${res.status}`);
    return res.json();
}

(async () => {
    const added = [];
    for (const [fromPath, node] of Object.entries(lock.packages)) {
        const parentIsDev = node.dev === true;
        const segments = fromPath.split('/').filter(Boolean);
        for (const [name, spec] of Object.entries(node.optionalDependencies || {})) {
            if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(spec)) continue;
            const present = (() => {
                for (let depth = segments.length; depth >= 0; depth--) {
                    const base = segments.slice(0, depth).join('/');
                    if (lock.packages[(base ? base + '/' : '') + 'node_modules/' + name]) return true;
                }
                return false;
            })();
            if (present) continue;
            const meta = await registryMeta(name, spec);
            if (!meta.os && !meta.cpu) continue;
            const entry = {
                version: meta.version,
                resolved: meta.dist.tarball,
                integrity: meta.dist.integrity,
            };
            if (meta.cpu) entry.cpu = meta.cpu;
            entry.dev = parentIsDev;
            entry.license = meta.license;
            entry.optional = true;
            if (meta.os) entry.os = meta.os;
            if (meta.libc) entry.libc = meta.libc;
            entry.engines = meta.engines;
            lock.packages['node_modules/' + name] = entry;
            added.push(`${name}@${spec}`);
        }
    }
    const sorted = {};
    Object.keys(lock.packages).sort().forEach(key => { sorted[key] = lock.packages[key]; });
    lock.packages = sorted;
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    console.log(added.length ? `added ${added.length}: ${added.join(', ')}` : 'lockfile already complete');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
