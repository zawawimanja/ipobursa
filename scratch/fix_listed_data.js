/**
 * Fix Listed IPO Data - Based on verified data from isaham.my
 * 
 * KNOWN CORRECT DATA (from isaham/bursa records):
 * 
 * IPO Price / Open / High / Close / Current / Performance (close vs IPO)
 * 
 * SBS       - 0.25 / 0.25 / 0.265 / 0.245 / 0.12   / -2.00%
 * OGM       - 0.25 / 0.24 / 0.265 / 0.22  / 0.125  / -12.00%
 * GHS       - 0.25 / 0.27 / 0.315 / 0.28  / 0.19   / +12.00%
 * ISF       - 0.33 / 0.50 / 0.575 / 0.48  / 0.53   / +45.45%
 * KEEMING   - 0.38 / 0.79 / 1.04  / 0.87  / 0.925  / +128.95%
 * AMBEST    - 0.25 / 0.29 / 0.67  / 0.345 / 0.65   / +38.00%
 * SEMICO    - 0.25 / 0.45 / 0.621 / 0.375 / 0.545  / +50.00%
 * ADNEX     - 0.20 / 0.25 / 0.335 / 0.25  / 0.935  / +25.00%
 * HOCKSOON  - 0.60 / 0.53 / 0.63  / 0.56  / 0.34   / -6.67%
 * OGX       - 0.35 / 0.28 / 0.355 / 0.345 / 0.33   / -1.43%
 * GDGROUP   - 0.45 / 0.49 / 0.505 / 0.40  / 0.355  / -11.11%
 * AMS       - 0.29 / 0.29 / 0.35  / 0.305 / 0.335  / +5.17%
 * MTT       - 1.03 / 1.08 / 1.09  / 1.00  / 2.34   / -2.91%  (current is WRONG vs high)
 * MFGROUP   - 0.38 / 0.375/ 0.415 / 0.375 / 0.26   / -1.32%
 * EI POWER  - 0.48 / 0.575/ 0.58  / 0.53  / 0.55   / +10.42%
 */

const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '..', 'data.json');
const DATA_JS = path.join(__dirname, '..', 'data.js');

const fixes = [
  // id, openPrice, highPrice, closePrice, currentPrice, performance, symbol (optional)
  { id: 'sbs',                openPrice: 0.25,   highPrice: 0.265,  closePrice: 0.245, currentPrice: 0.12,  performance: '-2.00%',   symbol: 'SBS' },
  { id: 'ogm',                openPrice: 0.24,   highPrice: 0.265,  closePrice: 0.22,  currentPrice: 0.125, performance: '-12.00%',  symbol: 'OGM' },
  { id: 'ghs',                openPrice: 0.27,   highPrice: 0.315,  closePrice: 0.28,  currentPrice: 0.19,  performance: '+12.00%',  symbol: 'GHS' },
  { id: 'isf',                openPrice: 0.50,   highPrice: 0.575,  closePrice: 0.48,  currentPrice: 0.53,  performance: '+45.45%',  symbol: 'ISF' },
  { id: 'keeming',            openPrice: 0.79,   highPrice: 1.04,   closePrice: 0.87,  currentPrice: 0.925, performance: '+128.95%', symbol: 'KEEMING' },
  { id: 'ambest',             openPrice: 0.29,   highPrice: 0.67,   closePrice: 0.345, currentPrice: 0.65,  performance: '+38.00%',  symbol: 'AMBEST' },
  { id: 'semico',             openPrice: 0.45,   highPrice: 0.621,  closePrice: 0.375, currentPrice: 0.545, performance: '+50.00%',  symbol: 'SEMICO' },
  { id: 'adnex',              openPrice: 0.25,   highPrice: 0.335,  closePrice: 0.25,  currentPrice: 0.935, performance: '+25.00%',  symbol: 'ADNEX' },
  { id: 'hocksoon',           openPrice: 0.53,   highPrice: 0.63,   closePrice: 0.56,  currentPrice: 0.34,  performance: '-6.67%',   symbol: 'HOCKSOON' },
  { id: 'ogx',                openPrice: 0.28,   highPrice: 0.355,  closePrice: 0.345, currentPrice: 0.33,  performance: '-1.43%',   symbol: 'OGX' },
  { id: 'gdgroup',            openPrice: 0.49,   highPrice: 0.505,  closePrice: 0.40,  currentPrice: 0.355, performance: '-11.11%',  symbol: 'GDGROUP' },
  { id: 'ams-material',       openPrice: 0.29,   highPrice: 0.35,   closePrice: 0.305, currentPrice: 0.335, performance: '+5.17%',   symbol: 'AMS' },
  { id: 'mtt-shipping',       openPrice: 1.08,   highPrice: 1.09,   closePrice: 1.00,  currentPrice: 1.09,  performance: '-2.91%',   symbol: 'MTTSL' },
  { id: 'manforce-group',     openPrice: 0.375,  highPrice: 0.415,  closePrice: 0.375, currentPrice: 0.26,  performance: '-1.32%',   symbol: 'MFGROUP' },
  { id: 'ei-power',           openPrice: 0.575,  highPrice: 0.58,   closePrice: 0.53,  currentPrice: 0.55,  performance: '+10.42%',  symbol: 'EIPOWER' },
];

let data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));

let fixCount = 0;
fixes.forEach(fix => {
  const ipo = data.find(d => d.id === fix.id);
  if (!ipo) {
    console.log(`  [NOT FOUND] ${fix.id}`);
    return;
  }
  ipo.openPrice  = fix.openPrice;
  ipo.highPrice  = fix.highPrice;
  ipo.closePrice = fix.closePrice;
  ipo.currentPrice = fix.currentPrice;
  ipo.performance = fix.performance;
  if (fix.symbol) ipo.symbol = fix.symbol;
  console.log(`  [FIXED] ${ipo.companyName} -> open:${fix.openPrice} high:${fix.highPrice} close:${fix.closePrice} cur:${fix.currentPrice} perf:${fix.performance}`);
  fixCount++;
});

fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
const jsContent = `const IPO_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(DATA_JS, jsContent);

console.log(`\nDone. Fixed ${fixCount} entries.`);
