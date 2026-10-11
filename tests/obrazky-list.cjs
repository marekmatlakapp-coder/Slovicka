// Vykreslí všetky obrázky (emoji) so slovami na jeden list pre kontrolu očami.
const { chromium } = require('D:/EMLU/tests/e2e/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1400, height: 800 } });
  await pg.goto(process.argv[2]);
  const html = await pg.evaluate(() => KNIHY.map(k => { pripravKnihu(k);
    return '<h2>' + k.id + '</h2><div class="g">' + k.w.filter(w => w.em).map(w => '<div><span>' + w.em + '</span><b>' + w.en + '</b></div>').join('') + '</div>'; }).join(''));
  await pg.setContent('<style>body{font-family:sans-serif;margin:10px}.g{display:grid;grid-template-columns:repeat(12,1fr);gap:6px}.g div{border:1px solid #ccc;border-radius:8px;text-align:center;padding:4px}.g span{font-size:44px;display:block}.g b{font-size:12px}</style>' + html);
  await pg.screenshot({ path: process.argv[3], fullPage: true });
  await b.close();
})();
