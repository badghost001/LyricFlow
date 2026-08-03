const { pinyin } = require('pinyin-pro');

const trackName = "大展鴻圖(Blueprint Supreme)";

async function test() {
  console.log("Pinyin Test:");
  try {
    const py = pinyin(trackName, { toneType: 'none', type: 'string', nonZh: 'consecutive' });
    console.log(py);
  } catch (e) {
    console.error("Pinyin Error:", e);
  }
}
test();
