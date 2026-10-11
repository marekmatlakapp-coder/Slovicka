// Porovnanie slovníka kníh 1 a 3 s otvoreným zoznamom NGSL 1.2 (CC BY-SA 4.0).
const fs = require('fs');
const D = __dirname + '/ngsl-data/'; // stiahnuť: newgeneralservicelist.com/s/NGSL_12_stats.csv, NGSL_12_lemmatized_for_research.csv, SUP_lemmatized.csv
const bezBom = t => t.replace(/^\uFEFF/, '');
// tvar → [lemma, poradie]
const rank = {};
bezBom(fs.readFileSync(D + 'NGSL_12_stats.csv', 'utf8')).split(/\r?\n/).slice(1).forEach(r => { const [l, rk] = r.split(','); if (l) rank[l.toLowerCase()] = +rk; });
const forma = {};
bezBom(fs.readFileSync(D + 'NGSL_12_lemmatized_for_research.csv', 'utf8')).split(/\r?\n/).filter(r => r && !r.startsWith('##')).forEach(r => {
  const t = r.split(',').map(x => x.trim().toLowerCase()).filter(Boolean); t.forEach(f => { if (!forma[f]) forma[f] = t[0]; });
});
const sup = {};
bezBom(fs.readFileSync(D + 'SUP_lemmatized.csv', 'utf8')).split(/\r?\n/).filter(Boolean).forEach(r => { const t = r.split(',').map(x => x.trim().toLowerCase()).filter(Boolean); t.forEach(f => sup[f] = t[0]); });
// bežné skrátené tvary → slová NGSL
const skrat = { "aren't": 'be', "isn't": 'be', "can't": 'can', "don't": 'do', "doesn't": 'do', "i'm": 'be', "i'll": 'will', "it's": 'be', "that's": 'that', "'s": "'s" };
const najdi = slovo => { const w = slovo.toLowerCase(); if (skrat[w]) return { kde: 'ngsl', lemma: skrat[w] }; if (forma[w]) return { kde: 'ngsl', lemma: forma[w] }; if (sup[w]) return { kde: 'sup', lemma: sup[w] }; return null; };

const s = fs.readFileSync('D:/Slovicka/index.html', 'utf8');
const vysledky = {};
for (const m of s.matchAll(/id:'(dm\d)'[\s\S]*?slova:`([\s\S]*?)`/g)) {
  const id = m[1];
  const slova = m[2].trim().split('\n').map(r => r.split('|')[0].trim());
  const kat = { ngsl: [], sup: [], fraza: [], fraza_ciastocne: [], vlastne: [], chyba: [] };
  const pasma = { '1–1000': 0, '1001–2000': 0, '2001–2809': 0 };
  for (const en of slova) {
    const cist = en.replace(/\(.*?\)/g, ' ').replace(/\.\.\.|[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokeny = cist.split(/[ \-]/).filter(Boolean);
    const velke = /^[A-Z]/.test(en) && !/^(I |I'|OK|TV|CD|SMS|T-shirt|Net$)/.test(en);
    if (tokeny.length === 1) {
      const r = najdi(tokeny[0]);
      if (r && r.kde === 'ngsl') { kat.ngsl.push(en); const rk = rank[r.lemma] || 9999; pasma[rk <= 1000 ? '1–1000' : rk <= 2000 ? '1001–2000' : '2001–2809']++; }
      else if (r && r.kde === 'sup') kat.sup.push(en);
      else if (velke) kat.vlastne.push(en);
      else kat.chyba.push(en);
    } else {
      const r = tokeny.map(najdi);
      if (r.every(Boolean)) kat.fraza.push(en);
      else if (velke && r.some(x => !x)) kat.vlastne.push(en);
      else kat.fraza_ciastocne.push(en + ' [' + tokeny.filter((t, i) => !r[i]).join(' ') + ']');
    }
  }
  vysledky[id] = { spolu: slova.length, kat, pasma };
}
const pct = (a, b) => Math.round(a / b * 100) + ' %';
for (const [id, v] of Object.entries(vysledky)) {
  const k = v.kat, n = v.spolu;
  console.log(`\n=== ${id}: ${n} slov`);
  console.log('v NGSL (jednotlivé slovo):', k.ngsl.length, pct(k.ngsl.length, n), JSON.stringify(v.pasma));
  console.log('v doplnku NGSL (dni, mesiace, čísla):', k.sup.length, pct(k.sup.length, n));
  console.log('fráza zložená len zo slov NGSL:', k.fraza.length, pct(k.fraza.length, n));
  console.log('fráza čiastočne mimo NGSL:', k.fraza_ciastocne.length, pct(k.fraza_ciastocne.length, n));
  console.log('vlastné mená, krajiny, národnosti:', k.vlastne.length, pct(k.vlastne.length, n));
  console.log('jednotlivé slovo mimo NGSL:', k.chyba.length, pct(k.chyba.length, n));
  console.log('POKRYTÉ (NGSL + doplnok + frázy z NGSL slov):', pct(k.ngsl.length + k.sup.length + k.fraza.length, n),
    '| bez vlastných mien:', pct(k.ngsl.length + k.sup.length + k.fraza.length, n - k.vlastne.length));
  console.log('-- mimo NGSL:', k.chyba.join(', '));
  console.log('-- frázy čiastočne mimo:', k.fraza_ciastocne.join(', '));
}
fs.writeFileSync(__dirname + '/porovnanie-ngsl.json', JSON.stringify(vysledky, null, 1));
