const fs = require('fs');
const files = ['../data.json', '../data.js', '../data_export.js'];
files.forEach(f => {
    try {
        let content = fs.readFileSync(f, 'utf8');
        if (f.endsWith('.json')) {
            let arr = JSON.parse(content);
            let item = arr.find(x => x.id === 'evocom-berhad');
            if (item) item.os = 3.6;
            fs.writeFileSync(f, JSON.stringify(arr, null, 4));
        } else {
            // Very simple replacement for js files
            const findStr = '"id": "evocom-berhad",';
            const replaceStr = '"id": "evocom-berhad",\n    "os": 3.6,';
            // Only replace if 'os: 3.6' is not already there
            if (content.includes(findStr) && !content.includes('"os": 3.6')) {
                content = content.replace(findStr, replaceStr);
                fs.writeFileSync(f, content);
            }
        }
        console.log(`Updated ${f}`);
    } catch(e) {
        console.log(`Failed ${f}: ${e.message}`);
    }
});
