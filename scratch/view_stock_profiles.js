const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
if (!fs.existsSync(dataJsonPath)) {
    console.error('data.json not found!');
    process.exit(1);
}

const ipoData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

const ids = ['inspace-creation', '5e-resources', 'manforce-group', 'teamstr'];
ids.forEach(id => {
    console.log(`\n=== PROFILE: ${id} ===`);
    const profile = ipoData.find(x => x.id === id);
    if (profile) {
        console.log(profile);
    } else {
        console.log('Not found');
    }
});
