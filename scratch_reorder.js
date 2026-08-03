const fs = require('fs');
const html = fs.readFileSync('src/index.html', 'utf8');

const bodyStart = html.indexOf('<div class="settings-body">');
const bodyEnd = html.indexOf('<div class="settings-group logout-group">');

if (bodyStart === -1 || bodyEnd === -1) {
  console.log('Could not find bounds');
  process.exit(1);
}

const bodyContent = html.substring(bodyStart + '<div class="settings-body">'.length, bodyEnd);

// More robust split mechanism based on <h4> titles
const blocks = [];
let currentBlock = '';
let currentTitle = null;

const lines = bodyContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<div class="settings-group">')) {
    if (currentBlock) blocks.push({ title: currentTitle, content: currentBlock });
    currentBlock = line + '\n';
    currentTitle = null;
  } else {
    currentBlock += line + '\n';
    const titleMatch = line.match(/<h4>(.*?)<\/h4>/);
    if (titleMatch) {
      currentTitle = titleMatch[1];
    }
  }
}
if (currentBlock) blocks.push({ title: currentTitle, content: currentBlock });

const extractedGroups = {};
for (const b of blocks) {
  if (b.title) {
    extractedGroups[b.title] = b.content.trim();
  }
}

const newOrder = [
  'Aesthetics',
  'Taskbar Mode',
  'Lyrics & Sync',
  'Integrations & Languages',
  'Last.fm Integration',
  'General',
  'Keyboard Shortcuts',
  'Listening History'
];

let newBodyContent = '\n';
for (const title of newOrder) {
  if (extractedGroups[title]) {
    let content = extractedGroups[title];
    if (title === 'Integrations & Languages') {
      content = content.replace('<h4>Integrations & Languages</h4>', '<h4>Integrations & Accounts</h4>');
    }
    if (title === 'Lyrics & Sync') {
      content = content.replace('<h4>Lyrics & Sync</h4>', '<h4>Lyrics & Translation</h4>');
    }
    newBodyContent += '          ' + content + '\n\n';
  } else {
    console.log('Missing: ' + title);
  }
}

const newHtml = html.substring(0, bodyStart + '<div class="settings-body">'.length) + newBodyContent + '          ' + html.substring(bodyEnd);
fs.writeFileSync('src/index.html', newHtml);
console.log('Success');
