# Testy appky Samouk

Playwright sa berie z `D:\EMLU\tests\e2e\node_modules` (WebKit aj Chromium).

```
node tests/server.cjs 8777                                   # lokálny server pre D:\Slovicka
node tests/test-slovicka.cjs http://localhost:8777/ <snímky>  # celý preklik (122 kontrol k 11.10.2026)
node tests/test-iphone.cjs https://marekmatlakapp-coder.github.io/Slovicka/ <snímky>   # jadro Safari
node tests/kontrola-dat.cjs http://localhost:8777/            # počty, duplicitné preklady, vety bez slova
node tests/obrazky-list.cjs http://localhost:8777/ list.png   # všetky obrázky na jeden list (kontrola očami)
node tests/porovnaj-ngsl.cjs                                  # pokrytie kníh otvoreným slovníkom NGSL
```
