// Quick script to find all global assignments that don't have a corresponding declaration
const fs = require('fs');
const code = fs.readFileSync('src/renderer.js', 'utf8');

// Find all top-level variable declarations (let/var/const at line start or with only whitespace)
const declPattern = /(?:^|\n)\s*(?:let|var|const)\s+([a-zA-Z_$][\w$]*)/g;
const declared = new Set();
let m;
while ((m = declPattern.exec(code)) !== null) {
  // Extract all vars from comma-separated declarations
  const line = code.substring(code.lastIndexOf('\n', m.index) + 1, code.indexOf('\n', m.index + m[0].length));
  const varNames = line.replace(/^(let|var|const)\s+/, '').split(',').map(v => v.trim().split(/[\s=;]/)[0]);
  varNames.forEach(v => { if (v) declared.add(v); });
}

// Find all "bare" assignments at various indent levels that look like global state
const assignPattern = /(?:^|\n)\s{0,4}([a-zA-Z_$][\w$]*)\s*=[^=]/g;
const assigned = new Set();
while ((m = assignPattern.exec(code)) !== null) {
  const name = m[1];
  // Skip common false positives
  if (['if', 'else', 'for', 'while', 'return', 'const', 'let', 'var', 'function', 'class', 'true', 'false', 'null', 'this'].includes(name)) continue;
  if (!declared.has(name)) {
    assigned.add(name);
  }
}

console.log('Potentially undeclared globals:');
[...assigned].sort().forEach(v => console.log(' -', v));
