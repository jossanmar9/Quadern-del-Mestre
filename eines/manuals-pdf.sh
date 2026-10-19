#!/bin/sh
# Fa els manuals en PDF (docs/*.md → CARPETA/*.pdf) amb Chrome o Chromium sense pantalla.
# Ús:  sh eines/manuals-pdf.sh CARPETA
# El navegador es pot triar amb la variable CHROME (per defecte, el primer que es trobe).
set -e
ARREL="$(cd "$(dirname "$0")/.." && pwd)"
EIXIDA="${1:?Indica la carpeta on deixar els PDF}"
mkdir -p "$EIXIDA"
EIXIDA="$(cd "$EIXIDA" && pwd)"
if [ -z "$CHROME" ]; then
  for c in google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
  done
fi
[ -n "$CHROME" ] || { echo "No s'ha trobat Chrome ni Chromium" >&2; exit 1; }
TMP="$(mktemp -d)"
for d in manual-usuari manual-usuario guia-installacio guia-instalacion; do
  python3 "$ARREL/eines/document-html.py" "$ARREL/docs/$d.md" "$TMP/$d.html"
  "$CHROME" --headless=new --no-sandbox --disable-gpu --no-first-run --user-data-dir="$TMP/perfil" \
    --virtual-time-budget=15000 --no-pdf-header-footer --print-to-pdf="$EIXIDA/$d.pdf" "file://$TMP/$d.html" 2>/dev/null
  [ -s "$EIXIDA/$d.pdf" ] || { echo "No s'ha generat $d.pdf" >&2; exit 1; }
  echo "Fet: $d.pdf"
done
rm -rf "$TMP"
