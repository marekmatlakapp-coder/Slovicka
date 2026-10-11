#!/usr/bin/env bash
# Zostaví Slovicka.apk z D:\Slovicka (index.html + písmo) bez Gradle.
# Použitie: bash zostav.sh <verzia_cislo> <verzia_nazov>   napr. bash zostav.sh 2 1.1
set -euo pipefail
VC="${1:-1}"; VN="${2:-1.0}"
SDK="D:/AndroidSDK"; BT="$SDK/build-tools/34.0.0"; JAR="$SDK/platforms/android-34/android.jar"
export JAVA_HOME="$SDK/jdk"; export PATH="/d/AndroidSDK/jdk/bin:$PATH"
A="D:/Slovicka/android"; B="$A/build"
PODPIS="$A/podpis/slovicka.jks"; HESLO_SUBOR="$A/podpis/heslo.txt"
rm -rf "$B"; mkdir -p "$B/assets/pismo" "$B/gen" "$B/obj" "$B/dex"

# 1) obsah appky
cp D:/Slovicka/index.html "$B/assets/"
cp D:/Slovicka/pismo/*.woff2 D:/Slovicka/pismo/pismo.css "$B/assets/pismo/"

# 2) zdroje + manifest
"$BT/aapt2.exe" compile --dir "$A/res" -o "$B/res.zip"
"$BT/aapt2.exe" link -o "$B/zaklad.apk" -I "$JAR" --manifest "$A/AndroidManifest.xml" -R "$B/res.zip" \
  --java "$B/gen" --min-sdk-version 24 --target-sdk-version 34 --version-code "$VC" --version-name "$VN" --auto-add-overlay

# 3) kód
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$JAR" -classpath "$BT/core-lambda-stubs.jar" -d "$B/obj" \
  "$A/src/sk/marek/slovicka/MainActivity.java" "$B/gen/sk/marek/slovicka/R.java"
(cd "$B/obj" && jar -c -M -f ../triedy.jar .)
cmd //c "$(cygpath -w "$BT/d8.bat") --lib $(cygpath -w "$JAR") --min-api 24 --output $(cygpath -w "$B/dex") $(cygpath -w "$B/triedy.jar")"
cp "$B/zaklad.apk" "$B/nepodpisane.apk"
(cd "$B/dex" && jar -u -M -f ../nepodpisane.apk classes.dex)
# assets cez jar (aapt2 na Windows zapisuje cesty so spätnou lomkou, Android by ich nenašiel)
(cd "$B" && jar -u -M -f nepodpisane.apk assets)

# 4) zarovnanie a podpis (rovnaký kľúč = aktualizácia bez straty pokroku)
"$BT/zipalign.exe" -f -p 4 "$B/nepodpisane.apk" "$B/zarovnane.apk"
if [ ! -f "$PODPIS" ]; then
  mkdir -p "$A/podpis"
  [ -f "$HESLO_SUBOR" ] || node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))" > "$HESLO_SUBOR"
  keytool -genkeypair -keystore "$PODPIS" -alias slovicka -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat "$HESLO_SUBOR")" -keypass "$(cat "$HESLO_SUBOR")" -dname "CN=Slovicka, O=Marek, C=SK"
fi
cmd //c "$(cygpath -w "$BT/apksigner.bat") sign --ks $(cygpath -w "$PODPIS") --ks-pass file:$(cygpath -w "$HESLO_SUBOR") --out $(cygpath -w "D:/Slovicka/Slovicka.apk") $(cygpath -w "$B/zarovnane.apk")"
cmd //c "$(cygpath -w "$BT/apksigner.bat") verify $(cygpath -w "D:/Slovicka/Slovicka.apk")" && echo "HOTOVO: D:/Slovicka/Slovicka.apk verzia $VN ($VC)"
