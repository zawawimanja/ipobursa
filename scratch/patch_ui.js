const fs = require('fs');

// 1. Update ipo-decision.html
let html = fs.readFileSync('ipo-decision.html', 'utf8');

// Add hidden input for tp2
html = html.replace(
    '<input type="number" id="inp-tp" step="0.01" placeholder="0.42" oninput="decide()">',
    '<input type="number" id="inp-tp" step="0.01" placeholder="0.42" oninput="decide()">\n                        <input type="hidden" id="inp-tp2" value="">'
);

// Update quickLoad function signature
html = html.replace(
    'function quickLoad(ipo, tp, os, ofs) {',
    'function quickLoad(ipo, tp, os, ofs, tp2 = \'\') {'
);

// Update quickLoad body
html = html.replace(
    "document.getElementById('inp-ofs').value = ofs;",
    "document.getElementById('inp-ofs').value = ofs;\n            const tp2Input = document.getElementById('inp-tp2');\n            if (tp2Input) tp2Input.value = tp2;"
);

// Update initQuickPicks extraction
html = html.replace(
    'const tp = d.sifuTargetPrice;',
    'const tp = d.v3TargetPrice || d.sifuTargetPrice;\n                const tp2 = d.zone2TargetPrice || d.sifuTargetPrice;'
);

// Update initQuickPicks call
html = html.replace(
    "btn.onclick = () => quickLoad(ipo, tp, os || '', ofs || '');",
    "btn.onclick = () => quickLoad(ipo, tp, os || '', ofs || '', tp2);"
);

// Update decide() logic for zone 2
html = html.replace(
    'const zone2 = tp * 1.15;',
    "const tp2Input = document.getElementById('inp-tp2') ? parseFloat(document.getElementById('inp-tp2').value) : NaN;\n            const zone2 = (!isNaN(tp2Input) && tp2Input > tp) ? tp2Input : tp * 1.15;"
);

fs.writeFileSync('ipo-decision.html', html);
console.log('ipo-decision.html patched!');

// 2. Update data.json
let jsonData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
let srkkJson = jsonData.find(i => i.id === 'srkk-ai');
if (srkkJson) {
    srkkJson.v3TargetPrice = 0.36;
    srkkJson.zone2TargetPrice = 0.66;
    fs.writeFileSync('data.json', JSON.stringify(jsonData, null, 4));
    console.log('data.json patched!');
}

// 3. Update data.js
let jsData = fs.readFileSync('data.js', 'utf8');
jsData = jsData.replace(
    '"sifuTargetPrice": 0.66',
    '"sifuTargetPrice": 0.66,\n    "v3TargetPrice": 0.36,\n    "zone2TargetPrice": 0.66'
);
fs.writeFileSync('data.js', jsData);
console.log('data.js patched!');

// 4. Update data_export.js
if(fs.existsSync('data_export.js')) {
    let expData = fs.readFileSync('data_export.js', 'utf8');
    expData = expData.replace(
        '"sifuTargetPrice": 0.66',
        '"sifuTargetPrice": 0.66,\n    "v3TargetPrice": 0.36,\n    "zone2TargetPrice": 0.66'
    );
    fs.writeFileSync('data_export.js', expData);
    console.log('data_export.js patched!');
}
