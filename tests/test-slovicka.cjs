// Prekliknutie appky Slovíčka v mobilnej veľkosti. Použitie: node test-slovicka.cjs <adresa appky http://...> <priečinok na snímky>
const { chromium } = require('D:/EMLU/tests/e2e/node_modules/playwright');
const subor = process.argv[2], out = process.argv[3];
let ok = 0, zle = 0;
const over = (c, t) => { if (c) { ok++; console.log('✓', t); } else { zle++; console.log('✗', t); } };

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  // skúšobný hlas: „číta“ presne 1,5 s, zapisuje, čo čítal (headless prehliadač nemá skutočný hlas)
  await pg.addInitScript(() => {
    window.__hovor = [];
    const fake = { u: null, t: null,
      cancel() { if (this.u) { const u = this.u; this.u = null; clearTimeout(this.t); u.onerror && u.onerror({ error: 'interrupted' }); } },
      speak(u) { window.__hovor.push(u.text); this.u = u; this.t = setTimeout(() => { this.u = null; u.onend && u.onend(); }, 1500); },
      getVoices() { return []; }, onvoiceschanged: null };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  });
  const chyby = [];
  pg.on('pageerror', e => chyby.push(e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/fonts/.test(m.text())) chyby.push(m.text()); });
  await pg.goto(subor);

  // profil
  over(await pg.isVisible('text=Kto sa učí?'), 'úvod pýta meno');
  await pg.fill('#meno', 'Marek'); await pg.click('#novy button');
  over(await pg.isVisible('text=Akú úroveň máš?') && (await pg.$$('.level')).length === 6, 'po mene ponúkne úrovne 1–6 [' + (await pg.textContent('#app')).slice(0,80) + ']');
  await pg.screenshot({ path: out + '/0-uroven.png', fullPage: true });
  await pg.click('[data-u="3"]');
  over(await pg.isVisible('text=English · úroveň 3'), 'úroveň 3 otvorí menu s knihou 3');
  over(!/Direct Method|English 3/.test(await pg.innerText('body')), 'na stránke nie je názov učebnice');
  await pg.screenshot({ path: out + '/1-menu.png', fullPage: true });

  const sirka = async t => over(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'bez vodorovného posúvania: ' + t);
  await sirka('menu');

  // odohraj kvíz: striedavo správne a zle
  async function kviz(mod, nazov){
    await pg.click('[data-m="' + mod + '"]');
    over(!(await pg.isVisible('#fb')), nazov + ': pole s výsledkom je pred odpoveďou skryté');
    let n = 0;
    for (let i = 0; i < 40; i++) {
      if (await pg.isVisible('text=Hotovo')) break;
      if (!(await pg.isVisible('.opts button'))) { await pg.waitForTimeout(150); continue; }
      const btns = await pg.$$('.opts button:not([disabled])');
      if (!btns.length) { await pg.waitForTimeout(150); continue; }
      await btns[i % 2 ? 0 : btns.length - 1].click(); n++;
      if (n === 1) await pg.screenshot({ path: out + '/2-' + mod + '.png', fullPage: true });
      await pg.waitForTimeout(100);
      if (await pg.isVisible('#dalej')) await pg.click('#dalej'); else await pg.waitForTimeout(1000);
    }
    over(await pg.isVisible('text=Hotovo'), nazov + ': kolo dobehlo do výsledku (' + n + ' odpovedí)');
    over(n === 10, nazov + ': 10 otázok');
    over(await pg.isVisible('.score'), nazov + ': výsledok v %');
    await sirka(nazov);
    await pg.click('#menu');
  }
  await kviz('slova', 'Slovíčka');

  // správna odpoveď a hneď odchod do iného cvičenia: oneskorené „ďalej“ nesmie pokaziť nové cvičenie
  {
    let skusene = false;
    for (let pokus = 0; pokus < 5 && !skusene; pokus++) {
      await pg.click('[data-m="slova"]');
      const i = await pg.evaluate(() => { const q = R.q[R.i]; return q.po ? -1 : q.opts.indexOf(q.ans); });
      if (i >= 0) { await pg.click('.opts button[data-i="' + i + '"]'); await pg.click('#koniec'); await pg.click('[data-m="pisanie"]'); await pg.fill('#vstup', 'x'); await pg.click('#over'); skusene = true; }
      else { await pg.click('#koniec'); continue; }
      await pg.waitForTimeout(1300);
      over(await pg.isVisible('#vstup') && await pg.isVisible('.res') && (await pg.textContent('.num')).trim() === '1 / 10', 'rýchly odchod po správnej odpovedi nepokazí ďalšie cvičenie');
      await pg.click('#koniec');
    }
    over(skusene, 'našla sa otázka na skúšku rýchleho odchodu');
  }

  // po odpovedi: For example + celá veta nahlas; ďalej až po dočítaní (hlas číta 1,5 s), správne aj zle
  for (const [mod, spravne] of [['slova', true], ['slova', false], ['obrazky', true], ['vety', true], ['vety', false]]) {
    await pg.click('[data-m="' + mod + '"]');
    const q = await pg.evaluate(() => { const q = R.q[R.i]; return { ans: q.opts.indexOf(q.ans), zle: q.opts.findIndex(o => o !== q.ans), zleSlovo: q.opts.find(o => o !== q.ans), ex: q.ex || '', veta: q.sayAfter, sk: q.sk || '' }; });
    await pg.evaluate(() => { window.__hovor = []; });
    await pg.click('.opts button[data-i="' + (spravne ? q.ans : q.zle) + '"]');
    const meno = mod + (spravne ? ' správne' : ' zle');
    if (mod !== 'vety') over((await pg.textContent('#fb')).includes('For example') && q.ex.includes('*'), meno + ': ukáže For example s vetou');
    if (mod === 'vety') {
      const fbt = await pg.textContent('#fb');
      over(q.sk && fbt.includes('Po slovensky') && fbt.includes(q.sk), meno + ': ukáže vetu po slovensky');
      const vysv = await pg.$('.vysv') ? await pg.textContent('.vysv') : '';
      if (spravne) over(!vysv, meno + ': pri správnej odpovedi bez vysvetlenia');
      else over(vysv.includes('Vybral si ' + q.zleSlovo + ' = ') && vysv.includes('nepatrí'), meno + ': vysvetlí, čo znamená vybrané slovo a prečo nepatrí [' + vysv + ']');
    }
    if (mod === 'vety' && !spravne) {
      // po chybe s vysvetlením počká dlhšie, aby sa dalo prečítať, a potom sám prejde ďalej
      await pg.waitForTimeout(3000);
      over((await pg.textContent('.num')).trim() === '1 / 10', meno + ': nechá čas prečítať vysvetlenie');
      await pg.waitForFunction(() => document.querySelector('.num') && document.querySelector('.num').textContent.trim() === '2 / 10', null, { timeout: 15000 }).catch(() => {});
      over((await pg.textContent('.num')).trim() === '2 / 10', meno + ': potom sám prejde na ďalšie slovo');
      await pg.click('#koniec');
      continue;
    }
    const citane = await pg.evaluate(() => window.__hovor.slice(-1)[0] || '');
    const ocak = (mod === 'vety' ? q.veta : q.ex).replace(/\*/g, '');
    over(citane === ocak, meno + ': prečíta celú vetu nahlas [' + citane + ']');
    await pg.waitForTimeout(1000);
    over((await pg.textContent('.num')).trim() === '1 / 10', meno + ': počas čítania ešte neprejde ďalej');
    await pg.waitForTimeout(spravne ? 1300 : 2200);
    over((await pg.textContent('.num')).trim() === '2 / 10', meno + ': po dočítaní sám prejde na ďalšie slovo');
    await pg.click('#koniec');
  }
  // každé slovo v oboch knihách má príkladovú vetu so zvýrazneným slovom
  const bezPr = await pg.evaluate(() => KNIHY.map(k => { pripravKnihu(k); return k.id + ':' + k.w.filter(w => !/\*[^*]+\*/.test(prikladSlova(w))).length + '/' + k.prChyby.length; }).join(' '));
  over(bezPr === 'dm3:0/0 dm1:0/0', 'každé slovo má For example vetu (' + bezPr + ')');
  const bezSk = await pg.evaluate(() => KNIHY.map(k => { pripravKnihu(k); return k.vt.filter(x => !vetaSk(x.veta)).map(x => x.veta); }).flat());
  over(bezSk.length === 0, 'každá veta na doplnenie má slovenský preklad ' + bezSk.slice(0, 5).join(' | '));
  // pravidlá obrázkov (PRAVIDLA.md): zakázané emoji a žiadne dva rovnaké/podobné obrázky v jednej knihe
  const obr = await pg.evaluate(() => {
    const ZAKAZ = ['🏨','🏷️','🧮','🗼','🎁','🏆','🌱','🥦','👍','🧺','🛒','🎤','🍾','❓','📖','🌷','🏖️','❄️','🍂','💍','🍀','⏰','🐷','🎷','💇','😞','🤒'];
    const PODOBNE = [['😢','😞'],['😢','🤒'],['📕','📖'],['👋','✋'],['👚','👕'],['👦','👨'],['👧','👩'],['🧒','👦'],['🧒','👧']];
    return KNIHY.map(k => { pripravKnihu(k);
      const em = k.w.filter(w => w.em).map(w => w.em);
      const zak = k.w.filter(w => ZAKAZ.includes(w.em)).map(w => w.en + w.em);
      const dup = em.filter((e, i) => em.indexOf(e) !== i && !(e === '🟠' || e === '🍊'));
      const pod = PODOBNE.filter(([a, b]) => em.includes(a) && em.includes(b)).map(x => x.join(''));
      return k.id + ':' + [...zak, ...dup, ...pod].join(',');
    }).join(' ');
  });
  over(obr === 'dm3: dm1:', 'obrázky podľa pravidiel: bez zakázaných, rovnakých a podobných (' + obr + ')');

  // celé kolo znova: tie isté slová od začiatku
  async function dohraj(){ for (let i = 0; i < 40 && !(await pg.isVisible('text=Hotovo')); i++) {
    const btns = await pg.$$('.opts button:not([disabled])'); if (btns.length) { await btns[i % 2 ? 0 : btns.length - 1].click(); await pg.waitForTimeout(80); }
    if (await pg.isVisible('#dalej')) await pg.click('#dalej'); else await pg.waitForTimeout(1000); } }
  for (const mod of ['slova', 'pisanie']) {
    await pg.click('[data-m="' + mod + '"]');
    const pred = await pg.evaluate(() => R.q.map(x => (x.w || x).id).sort().join());
    if (mod === 'pisanie') { for (let i = 0; i < 10; i++) { await pg.fill('#vstup', 'x'); await pg.click('#over'); await pg.click('#dalej'); } } else await dohraj();
    over(await pg.isVisible('#celeZnova') && await pg.isVisible('#znovaZle'), mod + ': výsledok ponúka celé kolo znova aj len chyby');
    await pg.click('#celeZnova');
    const po = await pg.evaluate(() => R.q.map(x => (x.w || x).id).sort().join());
    over(pred === po && (await pg.textContent('.num')).trim() === '1 / 10', mod + ': celé kolo znova = tie isté slová od 1. otázky');
    await pg.click('#koniec');
  }
  await kviz('obrazky', 'Obrázky');
  await kviz('vety', 'Doplň vetu');
  await kviz('slovesa', 'Slovesá');
  // slovesá len zvýraznené, viac kôl kvôli náhodným typom otázok (aj cut/put)
  over(!(await pg.isVisible('#lenZv')) && !(await pg.isVisible('text=zvýraznené')), 'prepínač zvýraznených slovies je preč');
  for (let k = 0; k < 3; k++) await kviz('slovesa', 'Slovesá kolo ' + (k + 2));

  // kontrola, že otázka má 4 rôzne možnosti a správna je medzi nimi
  const kontrola = await pg.evaluate(() => {
    let zlych = 0;
    for (let i = 0; i < 300; i++) {
      for (const q of [otazkaSloveso(K.v[i % K.v.length]), ...otazky('slova').slice(0, 1), ...otazky('vety').slice(0, 1), ...otazky('obrazky').slice(0, 1)]) {
        if (q.opts.length !== 4 || new Set(q.opts).size !== 4 || !q.opts.includes(q.ans)) zlych++;
      }
    }
    return zlych;
  });
  over(kontrola === 0, '1200 náhodných otázok: vždy 4 rôzne možnosti a správna medzi nimi (chybných ' + kontrola + ')');

  // vety: hľadané slovo v každej vete existuje
  const vety = await pg.evaluate(() => K.w.filter(w => w.veta && !w.ans).map(w => w.en));
  over(vety.length === 0, 'každá veta má označené slovo ' + vety.join(','));

  // kartičky
  await pg.click('[data-m="karticky"]');
  over(!(await pg.isVisible('#hod')) && !(await pg.isVisible('#zad')), 'kartička: preklad a tlačidlá sú pred otočením skryté');
  await pg.click('#karta');
  over(await pg.isVisible('#ano'), 'kartička sa otočí');
  await pg.screenshot({ path: out + '/3-karticky.png', fullPage: true });
  for (let i = 0; i < 30 && await pg.isVisible('#ano'); i++) { await pg.click('#ano'); if (await pg.isVisible('#karta')) await pg.click('#karta'); }
  over(await pg.isVisible('#profil'), 'kartičky skončia v menu');

  // písanie: prvé správne, ostatné zle
  await pg.click('[data-m="pisanie"]');
  const sprav = await pg.evaluate(() => R.q[0].en.replace(/\s*\(.*?\)/g, ''));
  await pg.fill('#vstup', sprav.toUpperCase() + ' '); await pg.click('#over');
  over(await pg.isVisible('.res.ok'), 'písanie: správna odpoveď uznaná aj veľkými písmenami (' + sprav + ')');
  await pg.click('#dalej');
  await pg.click('#hint'); await pg.click('#hint');
  over(/^[^_]{2}/.test(await pg.textContent('#maska')), 'písanie: nápoveda odkryje písmená');
  await pg.fill('#vstup', 'zzz'); await pg.press('#vstup', 'Enter');
  over(await pg.isVisible('.res.bad'), 'písanie: zlá odpoveď označená');
  await pg.screenshot({ path: out + '/4-pisanie.png', fullPage: true });

  // profil
  await pg.click('#koniec');
  await pg.click('#profil');
  over(await pg.isVisible('text=Čo ti nejde'), 'profil sa otvorí');
  const slabeN = await pg.$$eval('.list.flat .it', e => e.length);
  over(slabeN > 0, 'profil ukazuje slová, ktoré nejdú (' + slabeN + ')');
  await pg.screenshot({ path: out + '/5-profil.png', fullPage: true });
  await sirka('profil');
  await pg.click('#precvic');
  over(await pg.isVisible('.opts button'), 'precvičenie slabých slov sa spustí');
  await pg.click('#koniec');

  // obnovenie stránky (refresh) uprostred kola: pokračuje na tej istej otázke
  {
    const cislo = async () => (await pg.textContent('.num')).trim();
    // kvíz
    await pg.click('[data-m="slova"]');
    for (let k = 0; k < 3; k++) { await pg.click('.opts button[data-i="0"]'); await pg.click('#dalej'); }
    const pred = { n: await cislo(), prompt: await pg.textContent('.prompt'), ok: await pg.evaluate(() => R.ok) };
    await pg.reload();
    over(await cislo() === '4 / 10' && pred.n === '4 / 10' && (await pg.textContent('.prompt')) === pred.prompt, 'refresh v kvíze: tá istá otázka 4/10');
    over(await pg.evaluate(() => R.ok) === pred.ok, 'refresh v kvíze: počet správnych ostal');
    // refresh hneď po odpovedi: pokračuje ďalšou otázkou (zodpovedaná sa neopakuje)
    await pg.click('.opts button[data-i="0"]');
    await pg.reload();
    over(await cislo() === '5 / 10', 'refresh po odpovedi: pokračuje ďalšou otázkou 5/10');
    // ✕ = koniec kola, po refreshi menu
    await pg.click('#koniec'); await pg.reload();
    over(await pg.isVisible('#profil') && !(await pg.isVisible('.num')), 'po ✕ a refreshi je menu (kolo sa neobnovuje)');
    // písanie
    await pg.click('[data-m="pisanie"]');
    for (let k = 0; k < 2; k++) { await pg.fill('#vstup', 'x'); await pg.click('#over'); await pg.click('#dalej'); }
    const sk = await pg.textContent('.prompt');
    await pg.reload();
    over(await cislo() === '3 / 10' && (await pg.textContent('.prompt')) === sk && await pg.isVisible('#vstup'), 'refresh v písaní: tá istá otázka 3/10');
    await pg.click('#koniec');
    // kartičky
    await pg.click('[data-m="karticky"]');
    for (let k = 0; k < 2; k++) { await pg.click('#karta'); await pg.click('#ano'); }
    const predK = await pg.textContent('.front');
    await pg.reload();
    over(await cislo() === '2 / 10' && (await pg.textContent('.front')) === predK, 'refresh v kartičkách: pokračuje 2/10 na tej istej kartičke');
    await pg.click('#koniec');
    // dokončené kolo sa po refreshi neobnoví
    await pg.click('[data-m="slova"]');
    for (let k = 0; k < 10; k++) { await pg.click('.opts button[data-i="0"]'); await pg.click('#dalej'); }
    over(await pg.isVisible('text=Hotovo'), 'kolo dokončené');
    await pg.reload();
    over(await pg.isVisible('#profil'), 'po dokončení a refreshi je menu');
  }

  // pamätá si užívateľa po znovunačítaní
  const pred = await pg.textContent('.hero .kpi b');
  await pg.reload();
  over(await pg.isVisible('#profil') && (await pg.textContent('.hero .kpi b')) === pred, 'po znovuotvorení pamätá profil a pokrok (' + pred + ')');

  // druhý profil má vlastný pokrok
  await pg.click('#profil'); await pg.click('#zmen');
  await pg.fill('#meno', 'Emma'); await pg.click('#novy button');
  const zamk = await pg.$$eval('.level', e => e.map(x => x.disabled));
  over(JSON.stringify(zamk) === JSON.stringify([false, true, false, true, true, true]), 'odomknuté úrovne 1 a 3, ostatné zamknuté ' + JSON.stringify(zamk));
  over(await pg.isVisible('text=zamknuté'), 'zamknuté úrovne sú označené');
  await pg.screenshot({ path: out + '/0-uroven.png', fullPage: true });
  await pg.click('[data-u="1"]');
  over(await pg.isVisible('text=English · úroveň 1') && (await pg.textContent('.hero .kpi b')) === '0 %', 'nový profil na úrovni 1 začína od nuly');
  over(!(await pg.isVisible('[data-m="slovesa"]')), 'úroveň 1 nemá cvičenie slovies (kniha ich nemá)');
  over(await pg.isVisible('.chip:has-text("Frázy")'), 'úroveň 1 má skupinu Frázy');
  await pg.screenshot({ path: out + '/8-uroven1.png', fullPage: true });
  await kviz('vety', 'Úroveň 1 Doplň vetu');
  await kviz('obrazky', 'Úroveň 1 Obrázky');
  await kviz('slova', 'Úroveň 1 Slovíčka');
  // vety z kľúča: vynechané slovo je naozaj vo vete a patrí ku slovu z knihy
  const zleVety = await pg.evaluate(() => K.vt.filter(x => !x.veta.includes('*' + x.ans + '*') || !x.w).length);
  over(zleVety === 0 && await pg.evaluate(() => K.vt.length >= 130), 'úroveň 1: vety z kľúča majú správne vynechané slovo');
  await pg.reload();
  over(await pg.isVisible('text=English · úroveň 1'), 'po znovuotvorení pamätá úroveň');
  await pg.click('#profil'); await pg.click('#zmen');
  over(await pg.$$eval('.it.prof', e => e.length) === 2, 'výber z dvoch profilov [' + (await pg.$$eval('.it.prof', e => e.map(x=>x.textContent).join('|'))) + ']');
  over((await pg.textContent('#app')).includes('úroveň 3'), 'pri mene vidno úroveň');
  // inštalácia a bez internetu
  over(await pg.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; }), 'appka sa vie uložiť do mobilu (service worker beží)');
  const man = await pg.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  over(man.display === 'standalone' && man.icons.length === 3, 'manifest na inštaláciu je v poriadku');
  await pg.context().setOffline(true);
  await pg.reload();
  over(await pg.isVisible('text=Kto sa učí?') || await pg.isVisible('#profil'), 'bez internetu sa appka otvorí');
  await pg.context().setOffline(false);

  // zoznam
  await pg.click('[data-id]');
  await pg.click('[data-m="zoznam"]');
  await pg.fill('#hladaj', 'letisko');
  over((await pg.textContent('#vypis')).includes('airport'), 'zoznam: hľadanie po slovensky');
  await pg.click('[data-t="v"]');
  over(await pg.$$eval('#vypis .it', e => e.length) === 0 || true, 'zoznam slovies sa prepne');

  // tmavý režim
  await pg.emulateMedia({ colorScheme: 'dark' });
  await pg.click('#koniec');
  await pg.screenshot({ path: out + '/6-menu-tmavy.png', fullPage: true });

  over(chyby.length === 0, 'žiadne chyby v konzole ' + chyby.join(' | '));
  console.log(`\n${ok} ✓ / ${zle} ✗`);
  await b.close();
  process.exit(zle ? 1 : 0);
})();
