// Renders tools/inside_kid.html with headless Chromium and saves assets/world/inside-kid.png (+ organ positions in px).
// Run from the repo root: node tools/render_inside_kid.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 1500 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, 'inside_kid.html'));
  await p.waitForFunction(() => window.RESULT, null, { timeout: 30000 });
  const r = await p.evaluate(() => window.RESULT);
  fs.writeFileSync(path.resolve(__dirname, '../assets/world/inside-kid.png'), Buffer.from(r.png.split(',')[1], 'base64'));
  console.log(JSON.stringify(r.anchors));
  await b.close();
})();
