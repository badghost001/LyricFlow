const fs = require('fs');
const content = fs.readFileSync('subagent_views.txt', 'utf8');

const regex = /(?:option|improvement|#\d)[\s\S]{1,100}/gi;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`Match at index ${match.index}:`);
  console.log(match[0]);
  console.log('-----------------------------------');
}
