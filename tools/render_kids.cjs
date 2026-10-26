// Renders Nectara's cast (tools/kids.html) to assets/world/kids/<kid>.webp and <kid>-inside.webp.
// Run from the repo root: node tools/render_kids.cjs [kid ...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const KIDS = ['amara', 'liam', 'saoirse', 'keon', 'mei', 'noor', 'ravi', 'eli'];
(async () => {
  const which = process.argv.slice(2).length ? process.argv.slice(2) : KIDS;
  const outDir = path.resolve(__dirname, '../assets/world/kids'); fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--allow-file-access-from-files'] });
  const anchors = {};
  for (const kid of which) for (const inside of [false, true]) {
    const p = await b.newPage();
    p.on('console', m => { if (/rror/.test(m.text())) console.log('C', kid, m.text()); });
    p.on('pageerror', e => console.log('ERR', kid, e.message));
    await p.goto('file://' + path.resolve(__dirname, 'kids.html') + '?kid=' + kid + (inside ? '&inside=1' : ''));
    let r = null;
    for (let i = 0; i < 300 && !r; i++) { await p.waitForTimeout(1000); r = await p.evaluate(() => window.RESULT || null); }
    if (!r) throw new Error('no render for ' + kid);
    const png = path.join(outDir, kid + (inside ? '-inside' : '') + '.png');
    fs.writeFileSync(png, Buffer.from(r.png.split(',')[1], 'base64'));
    if (inside) anchors[kid] = r.anchors;
    await p.close(); console.log('made', png);
  }
  console.log(JSON.stringify(anchors));
  await b.close();
})();
