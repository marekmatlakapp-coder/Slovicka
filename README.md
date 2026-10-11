# Slovíčka

Webová appka na slovíčka z angličtiny podľa učebníc (úrovne 1–6). Inštaluje sa z prehliadača na plochu mobilu, ide aj bez internetu, pokrok sa ukladá v zariadení.

- `index.html` je celá appka. Dáta kníh sú v poli `KNIHY` (každá kniha má `uroven` 1–6).
- `sw.js` zabezpečí fungovanie bez internetu. Pri väčšej zmene zvýš `CACHE` (napr. `slovicka-v2`).
- `manifest.webmanifest` a `ikona-*.png` slúžia na inštaláciu.

Zverejnenie: Render → Static Site, publish directory `.`, bez build príkazu.
