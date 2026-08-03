const fs = require('fs');
const path = require('path');

const rendererPath = path.join(__dirname, 'src', 'renderer.js');
const indexPath = path.join(__dirname, 'src', 'index.html');

const rendererCode = fs.readFileSync(rendererPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

// Find all document.getElementById("...") or document.getElementById('...')
const idPattern = /document\.getElementById\((["'])(.*?)\1\)/g;
const ids = new Set();
let match;
while ((match = idPattern.exec(rendererCode)) !== null) {
  ids.add(match[2]);
}

console.log(`Found ${ids.size} unique DOM IDs in renderer.js.`);

let missingCount = 0;
for (const id of ids) {
  // Simple check for id="..." or id='...'
  const hasIdDouble = indexHtml.includes(`id="${id}"`);
  const hasIdSingle = indexHtml.includes(`id='${id}'`);
  if (!hasIdDouble && !hasIdSingle) {
    console.log(`⚠️ Missing DOM ID: ${id}`);
    missingCount++;
  }
}

if (missingCount === 0) {
  console.log('✅ All DOM IDs exist in index.html!');
} else {
  console.log(`❌ Total missing DOM IDs: ${missingCount}`);
}
