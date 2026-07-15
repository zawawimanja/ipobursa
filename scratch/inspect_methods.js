const p = require('pdf-parse');
console.log('Available keys:', Object.keys(p));
const PDFParse = p.PDFParse;
console.log('Constructor parameter names:', PDFParse.toString().match(/\((.*?)\)/)[0]);
const proto = PDFParse.prototype;
console.log('Prototype methods:', Object.getOwnPropertyNames(proto));
