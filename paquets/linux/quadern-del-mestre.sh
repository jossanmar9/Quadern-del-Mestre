#!/bin/sh
# Arranca el Quadern del Mestre des d'aquesta carpeta (versió .tar.gz per a Linux).
# Les partides es guarden ací mateix, a la carpeta «partides».
# Opcions: ./quadern-del-mestre.sh --help
cd "$(dirname "$(readlink -f "$0")")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "Cal Python 3 per a fer anar el Quadern del Mestre. Instal·la'l amb el gestor de paquets de la teua distribució." >&2
  exit 1
fi
exec python3 quadern.py "$@"
