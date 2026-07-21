const fs = require('fs');
const execSync = require('child_process').execSync;

try {
    console.log('Reading local (ours) and remote (theirs) files from Git...');
    
    // Stage :2 is Ours (HEAD)
    const oursJson = execSync('git show :2:data.json', { maxBuffer: 15*1024*1024 }).toString();
    const ours = JSON.parse(oursJson);
    
    // Stage :3 is Theirs (MERGE_HEAD / origin/main)
    const theirsJson = execSync('git show :3:data.json', { maxBuffer: 15*1024*1024 }).toString();
    const theirs = JSON.parse(theirsJson);
    
    console.log(`Ours: ${ours.length} entries. Theirs: ${theirs.length} entries.`);
    
    const theirsMap = new Map(theirs.map(item => [item.id, item]));
    
    // Perform merge
    const merged = ours.map(ourItem => {
        const theirItem = theirsMap.get(ourItem.id);
        if (!theirItem) {
            // Keep local new entries
            return ourItem;
        }
        
        if (ourItem.year < 2026) {
            // Prefer remote (theirs) for historical data
            return theirItem;
        }
        
        // For 2026 entries, start with ourItem to keep KEB dates, GB Bond status, EGHI, etc.
        const item = { ...ourItem };
        
        // For listed IPOs, copy price updates from remote (except Stratus which we scraped)
        if (ourItem.status === 'Listed' && ourItem.id !== 'stratus-global') {
            const priceFields = ['currentPrice', 'performance', 'openPrice', 'highPrice', 'closePrice', 'avgTP', 'analystInsight'];
            priceFields.forEach(field => {
                if (theirItem[field] !== undefined) {
                    item[field] = theirItem[field];
                }
            });
        }
        
        return item;
    });
    
    // Check if there are any new items in theirs that we don't have
    const oursMap = new Map(ours.map(item => [item.id, item]));
    theirs.forEach(theirItem => {
        if (!oursMap.has(theirItem.id)) {
            console.log(`Adding missing remote item: ${theirItem.id}`);
            merged.push(theirItem);
        }
    });
    
    // Write out data.json
    fs.writeFileSync('./data.json', JSON.stringify(merged, null, 4), 'utf8');
    console.log('Wrote data.json');
    
    // Write out data.js
    const jsContent = 'var ipoData = ' + JSON.stringify(merged, null, 2) + ';\nvar IPO_DATA = ipoData;\nif (typeof module !== \'undefined\' && module.exports) { module.exports = ipoData; }\n';
    fs.writeFileSync('./data.js', jsContent, 'utf8');
    console.log('Wrote data.js');
    
    // Write out data_export.js
    const exportContent = 'const IPO_DATA = ' + JSON.stringify(merged, null, 2) + ';\n\nif (typeof module !== \'undefined\' && module.exports) {\n    module.exports = IPO_DATA;\n}\n';
    fs.writeFileSync('./data_export.js', exportContent, 'utf8');
    console.log('Wrote data_export.js');
    
    console.log('Merge resolution completed successfully.');
} catch (e) {
    console.error('Error resolving merge:', e.message);
    process.exit(1);
}
