const fs = require('fs');
const lines = fs.readFileSync('./src/renderer.js', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('taskbar')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
