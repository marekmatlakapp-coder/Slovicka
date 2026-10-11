// Skúška appky v jadre Safari (WebKit) s rozmermi iPhonu. Použitie: node test-iphone.cjs <adresa> <priečinok snímok>
const { webkit, devices } = require('D:/EMLU/tests/e2e/node_modules/playwright');
const url = process.argv[2], out = process.argv[3];
let ok = 0, zle = 0;
const over = (c, t) => { if (c) { ok++; console.log('✓', t); } else { zle++; console.log('✗', t); } };
(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const pg = await ctx.newPage();
  const chyby = []; pg.on('pageerror', e => chyby.push(e.message));
  await pg.goto(url);
  over(await pg.isVisible('text=Kto sa učí?'), 'iPhone: úvod sa otvorí');
  over(await pg.isVisible('text=Pridať na plochu'), 'iPhone: návod na pridanie na plochu cez Safari');
  await pg.screenshot({ path: out + '/i1-uvod.png' });
  await pg.fill('#meno', 'Manželka'); await pg.click('#novy button');
  await pg.click('[data-u="1"]');
  over(await pg.isVisible('text=English · úroveň 1'), 'iPhone: úroveň 1 sa otvorí');
  over(await pg.evaluate(() => 'speechSynthesis' in window), 'iPhone: čítanie nahlas je v Safari k dispozícii');
  // jedno kolo doplň vetu
  await pg.click('[data-m="vety"]');
  await pg.screenshot({ path: out + '/i2-veta.png' });
  for (let i = 0; i < 40 && !(await pg.isVisible('text=Hotovo')); i++) {
    const btns = await pg.$$('.opts button:not([disabled])'); if (btns.length) { await btns[i % 2 ? 0 : btns.length - 1].tap(); await pg.waitForTimeout(80); }
    if (await pg.isVisible('#dalej')) await pg.tap('#dalej'); else await pg.waitForTimeout(1000);
  }
  over(await pg.isVisible('.score'), 'iPhone: kolo dobehne do výsledku (ťukanie prstom)');
  over(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'iPhone: bez vodorovného posúvania');
  await pg.tap('#menu');
  // písanie na klávesnici
  await pg.click('[data-m="pisanie"]');
  const sl = await pg.evaluate(() => R.q[0].en.replace(/\s*\(.*?\)/g, ''));
  await pg.fill('#vstup', sl); await pg.tap('#over');
  over(await pg.isVisible('.res.ok'), 'iPhone: písanie uzná správnu odpoveď');
  await pg.tap('#koniec');
  await pg.reload();
  over(await pg.isVisible('text=English · úroveň 1') && (await pg.textContent('.hero')).includes('Manželka'), 'iPhone: po znovuotvorení pamätá profil a úroveň');
  await pg.screenshot({ path: out + '/i3-menu.png', fullPage: true });
  over(chyby.length === 0, 'iPhone: žiadne chyby ' + chyby.join(' | '));
  console.log(`\n${ok} ✓ / ${zle} ✗`);
  await b.close(); process.exit(zle ? 1 : 0);
})();
