const fs = require('fs');

const dataPath = 'data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 1. Update Liftech Group Berhad
const liftech = data.find(x => x.id === 'liftech-group-berhad');
if (liftech) {
    liftech.os = 18.92;
    liftech.stage = 5;
    liftech.status = "Listed";
    liftech.openPrice = 0.275;
    liftech.closePrice = 0.275;
    liftech.currentPrice = 0.275;
    liftech.performance = "-5.17%";
    liftech.dailyChange = -5.17;
    console.log('Updated Liftech Group Berhad in data.json');
} else {
    console.log('Liftech Group Berhad not found!');
}

// 2. Update RNG Tech Berhad
const rng = data.find(x => x.id === 'rng-tech-berhad');
if (rng) {
    rng.os = 7.77;
    rng.stage = 4;
    rng.status = "Pre-Listing";
    console.log('Updated RNG Tech Berhad in data.json');
} else {
    console.log('RNG Tech Berhad not found!');
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
console.log('Successfully saved updates to data.json');
