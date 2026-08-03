const fs = require('fs');
const path = require('path');
const messagesDir = 'C:\\Users\\badghost\\.gemini\\antigravity-cli\\brain\\8533d04e-ae5a-43cc-a245-bd4582f917dc\\.system_generated\\messages';

if (fs.existsSync(messagesDir)) {
  const files = fs.readdirSync(messagesDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(messagesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      try {
        const parsed = JSON.parse(content);
        if (parsed.content) {
          const matchText = parsed.content.toLowerCase();
          if (matchText.includes('option') || matchText.includes('improvement') || matchText.includes('pinyin') || matchText.includes('genius')) {
            if (matchText.includes('assets\\icon.png') || matchText.includes('idat')) continue;
            console.log(`FOUND in ${file} (sender: ${parsed.sender}):`);
            console.log(parsed.content.substring(0, 1000));
            console.log('==================================================');
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
}
