// Kontrola dát kníh v appke (počty, vety bez slova, duplicitné preklady, skupiny).
const { chromium } = require('D:/EMLU/tests/e2e/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto(process.argv[2]);
  const r = await pg.evaluate(() => KNIHY.map(k => {
    pripravKnihu(k);
    const sk = {}; k.w.forEach(w => (sk[w.sk] = sk[w.sk] || []).push(w.en));
    const en = {}; k.w.forEach(w => (en[w.en.toLowerCase()] = (en[w.en.toLowerCase()] || 0) + 1));
    const skup = {}; k.w.forEach(w => { const g = skupinaNazov(skupina(w.L)); skup[g] = (skup[g] || 0) + 1; });
    const zlaL = k.w.filter(w => !(w.L >= 1 && w.L <= 100) && !(w.L > 1000 && w.L < 1100)).map(w => w.en + ' ' + w.L);
    const vetySlov = new Set(k.vt.map(x => x.w.id)).size;
    return { id: k.id, slov: k.w.length, obrazkov: k.w.filter(w => w.em).length, viet: k.vt.length, slovSVetou: vetySlov, slovies: k.v.length,
      vetyBezSlova: k.vtChyby, zlaLekcia: zlaL, rovnakyPreklad: Object.entries(sk).filter(([, v]) => v.length > 1),
      rovnakeSlovo: Object.entries(en).filter(([, n]) => n > 1).map(([e]) => e), skupiny: skup };
  }));
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
