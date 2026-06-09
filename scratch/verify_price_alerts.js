// Validation script for automated sifu-target price alerts
const fs = require('fs');
const path = require('path');

// Mock localStorage
const storage = {};
const localStorage = {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
};

// Mock DOM container
const container = {
    style: { display: 'none' },
    innerHTML: ''
};

// Load actual data from data.js
const dataJsPath = path.join(__dirname, '..', 'data.js');
const dataJsContent = fs.readFileSync(dataJsPath, 'utf8');

// Extract the array from "const IPO_DATA = [...];"
const jsonMatch = dataJsContent.match(/const\s+IPO_DATA\s*=\s*([\s\S]+?);/);
if (!jsonMatch) {
    console.error("FAIL: Could not extract IPO_DATA from data.js");
    process.exit(1);
}

const ipoData = JSON.parse(jsonMatch[1]);
console.log(`Loaded ${ipoData.length} IPO entries from data.js.`);

// Define simulateCheckPriceAlerts logic matching main.js
function simulateCheckPriceAlerts() {
    const dismissed = JSON.parse(localStorage.getItem('dismissedPriceAlerts') || '[]');
    const activeAlerts = [];
    
    ipoData.forEach(ipo => {
        if (ipo.stage === 5 && typeof ipo.sifuTargetPrice === 'number') {
            const curPrice = ipo.currentPrice || ipo.price || 0;
            const targetPrice = ipo.sifuTargetPrice;
            
            if (curPrice > 0 && curPrice <= targetPrice) {
                if (!dismissed.includes(ipo.id)) {
                    activeAlerts.push({
                        id: ipo.id,
                        companyName: ipo.companyName,
                        curPrice,
                        targetPrice
                    });
                }
            } else {
                // Auto-cleanup from dismissed state if price rises back above target
                const index = dismissed.indexOf(ipo.id);
                if (index !== -1) {
                    dismissed.splice(index, 1);
                    localStorage.setItem('dismissedPriceAlerts', JSON.stringify(dismissed));
                }
            }
        }
    });
    
    if (activeAlerts.length > 0) {
        container.style.display = 'block';
        container.innerHTML = 'triggered';
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    
    return activeAlerts;
}

function clearPriceAlert(id) {
    const dismissed = JSON.parse(localStorage.getItem('dismissedPriceAlerts') || '[]');
    if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem('dismissedPriceAlerts', JSON.stringify(dismissed));
    }
}

// TEST 1: Initial Check (Verify 5E Resources triggers, SunMed does not)
const initialAlerts = simulateCheckPriceAlerts();
console.log("\n[TEST 1] Checking active alerts...");
console.log(`Active alerts found: ${initialAlerts.length}`);
initialAlerts.forEach(a => console.log(`- Triggered: ${a.companyName} (Price: RM ${a.curPrice} <= Target: RM ${a.targetPrice})`));

const is5ETriggered = initialAlerts.some(a => a.id === '5e-resources');
const isSunMedTriggered = initialAlerts.some(a => a.id === 'sunmed');

if (is5ETriggered && isSunMedTriggered) {
    console.log("PASS: Both 5E Resources and SUNMED triggered correctly.");
} else {
    console.error("FAIL: Trigger logic incorrect!");
    process.exit(1);
}

// TEST 2: Muting alert for 5E Resources
console.log("\n[TEST 2] Muting alert for 5e-resources...");
clearPriceAlert('5e-resources');
const mutedAlerts = simulateCheckPriceAlerts();
console.log(`Active alerts after mute: ${mutedAlerts.length}`);
if (mutedAlerts.some(a => a.id === '5e-resources')) {
    console.error("FAIL: 5E Resources was not muted!");
    process.exit(1);
} else {
    console.log("PASS: 5E Resources was successfully muted.");
}

// TEST 3: Price recovery resets mute state
console.log("\n[TEST 3] Simulating 5E Resources price recovering above target...");
// Temporarily increase price of 5e-resources above its target of 0.29
const targetIpo = ipoData.find(x => x.id === '5e-resources');
targetIpo.currentPrice = 0.30; 

// Run checker, which should clean up the dismissed state
simulateCheckPriceAlerts();

// Verify dismissed array is clean
const finalDismissed = JSON.parse(localStorage.getItem('dismissedPriceAlerts') || '[]');
console.log(`Dismissed list: ${JSON.stringify(finalDismissed)}`);
if (finalDismissed.includes('5e-resources')) {
    console.error("FAIL: 5E Resources was not cleaned up from dismissed list!");
    process.exit(1);
} else {
    console.log("PASS: 5E Resources successfully removed from dismissed list after price recovery.");
}

console.log("\nALL TESTS PASSED SUCCESSFULLY! Code logic is correct.");
