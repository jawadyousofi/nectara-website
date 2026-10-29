const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.json'))); const b = await chromium.launch();
  for (const p of pages) { const pg = await b.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 1 });
    const f = path.join(__dirname, p.n + '.html'); fs.writeFileSync(f, p.html); await pg.goto('file://' + f); await pg.waitForTimeout(150);
    await pg.screenshot({ path: path.join(__dirname, p.n + '.png') }); await pg.close(); }
  await b.close(); })();
