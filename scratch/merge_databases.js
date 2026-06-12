const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const jsonPath = path.join(__dirname, '..', 'data.json');
const jsPath = path.join(__dirname, '..', 'data.js');

try {
    // 1. Fetch JSON strings from git
    console.log('Fetching remote and local databases from git...');
    const remoteData = JSON.parse(execSync('git show HEAD:data.json', { maxBuffer: 10*1024*1024 }));
    const localData = JSON.parse(execSync('git show 86f7f17:data.json', { maxBuffer: 10*1024*1024 }));
    
    console.log(`Loaded remote data (${remoteData.length} entries) and local data (${localData.length} entries).`);
    
    // Create maps for quick lookup
    const remoteMap = new Map(remoteData.map(item => [item.id, item]));
    
    // Merge
    const mergedData = localData.map(localItem => {
        const remoteItem = remoteMap.get(localItem.id);
        if (!remoteItem) {
            // If it's not in remote, just keep local (e.g. newly added offline)
            return localItem;
        }
        
        if (localItem.year < 2026) {
            // For historical, take the remote version entirely
            return remoteItem;
        }
        
        // For 2026:
        const merged = { ...localItem };
        
        // If it's listed (except MMCS), take daily updates from remote
        if (localItem.status === 'Listed' && localItem.id !== 'mm-computer') {
            const priceFields = ['currentPrice', 'performance', 'openPrice', 'highPrice', 'closePrice'];
            priceFields.forEach(field => {
                if (remoteItem[field] !== undefined) {
                    merged[field] = remoteItem[field];
                }
            });
        }
        
        return merged;
    });
    
    // Write out
    fs.writeFileSync(jsonPath, JSON.stringify(mergedData, null, 2), 'utf8');
    console.log('Saved merged data.json.');
    
    const jsContent = `const IPO_DATA = ${JSON.stringify(mergedData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = IPO_DATA;\n}\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('Saved merged data.js.');
    
    console.log('Merge complete.');
} catch (err) {
    console.error('Error during merge:', err);
    process.exit(1);
}
