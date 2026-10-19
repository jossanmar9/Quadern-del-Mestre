#!/bin/sh
# Afig el Quadern del Mestre al menú d'aplicacions de l'usuari (versió .tar.gz per a Linux).
#   ./installa.sh                 crea l'accés al menú
#   ./installa.sh --desinstalla   el lleva (les partides no s'esborren)
set -e
DIR="$(dirname "$(readlink -f "$0")")"
APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
FITXER="$APPS/quadern-del-mestre.desktop"

if [ "$1" = "--desinstalla" ]; then
  rm -f "$FITXER"
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" >/dev/null 2>&1 || true
  echo "S'ha llevat el Quadern del Mestre del menú. Les partides continuen a $DIR/partides."
  exit 0
fi

# Sense Tk no hi ha finestra: llavors l'accés obri un terminal, perquè es veja i es puga aturar
TERMINAL=false
python3 -c "import tkinter" >/dev/null 2>&1 || TERMINAL=true

chmod +x "$DIR/quadern-del-mestre.sh"
mkdir -p "$APPS"
sed -e "s|^Exec=.*|Exec=\"$DIR/quadern-del-mestre.sh\"|" \
    -e "s|^Icon=.*|Icon=$DIR/logo.png|" \
    -e "s|^Terminal=.*|Terminal=$TERMINAL|" \
    "$DIR/quadern-del-mestre.desktop" > "$FITXER"
chmod +x "$FITXER"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" >/dev/null 2>&1 || true
echo "Fet: el Quadern del Mestre ja és al menú d'aplicacions."

if [ "$TERMINAL" = true ]; then
  echo
  echo "Avís: falta Tk, i sense ell no es veu la finestra del Quadern (funciona en un terminal)."
  echo "Instal·la'l i torna a executar ./installa.sh:"
  echo "  Debian, Ubuntu:  sudo apt install python3-tk"
  echo "  Fedora:          sudo dnf install python3-tkinter"
  echo "  Arch, Manjaro:   sudo pacman -S tk"
  echo "  openSUSE:        sudo zypper install python3-tk"
fi
