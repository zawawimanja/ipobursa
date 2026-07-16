/**
 * debug_sheets_js.js
 * Extract script from sifu-sheets.html and run syntax checks via node native VM.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'sifu-sheets.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract everything between <script> and </script> (specifically the main script block)
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptContent = '';

while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (content.includes('function calculateSheet') || content.includes('var ipoData')) {
        scriptContent = content;
        break;
    }
}

if (!scriptContent) {
    console.error('Could not find the main script block in sifu-sheets.html');
    process.exit(1);
}

// Basic syntax check using native vm
try {
    new vm.Script(scriptContent);
    console.log('✅ JavaScript inside sifu-sheets.html is syntactically CORRECT!');
} catch (err) {
    console.error('❌ JavaScript Syntax Error in sifu-sheets.html:');
    console.error(err.stack);
}
