#!/usr/bin/env python3
"""Construeix quadern.py: ajunta la pàgina web de src/web/, el compendi SRD de src/srd/,
el codi QR de src/qr.py i la finestra de src/finestra.py, i ho incrusta dins del servidor
src/servidor.py, perquè tot el programa siga un sol fitxer.

Ús:  python3 build.py
"""
import base64
import gzip
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "src" / "web"

# L'ordre importa: primer les dades i el nucli, després cada secció de l'app.
SCRIPTS = ["i18n.js", "dades.js", "nucli.js", "daus.js", "fitxes.js", "mapa.js", "combat.js",
           "compendi.js", "diari.js", "master.js", "so.js", "partides.js", "arrencada.js"]


def read(name):
    return (WEB / name).read_text(encoding="utf-8")


def data_uri(name):
    return "data:image/png;base64," + base64.b64encode((WEB / name).read_bytes()).decode()


def b64_lines(data):
    blob = base64.b64encode(data).decode()
    return "\n".join(blob[i:i + 100] for i in range(0, len(blob), 100))


def main():
    page = (
        "<title>Quadern del Mestre</title>\n"
        + read("fonts.html")
        + "<style>\n" + read("estil-base.css") + "\n" + read("estil.css") + "</style>\n"
        + read("cos.html").replace("__LOGO__", data_uri("logo.png"))
        + "<script>\n(() => {\n\"use strict\";\n" + "\n".join(read(s) for s in SCRIPTS) + "\n})();\n</script>\n"
    )
    html = (
        '<!doctype html>\n<html lang="ca">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        f'<link rel="icon" type="image/png" href="{data_uri("favicon.png")}">\n'
        f'<link rel="apple-touch-icon" href="{data_uri("logo.png")}">\n'
        "</head>\n<body>\n" + page + "\n</body>\n</html>\n"
    )
    server = (ROOT / "src" / "servidor.py").read_text(encoding="utf-8")
    for mark in ("__PAGE__", "__SRD__", "__QR__", "__FINESTRA__", "__ICONA__"):
        if mark not in server:
            raise SystemExit(f"src/servidor.py no té el marcador {mark}")
    qr = (ROOT / "src" / "qr.py").read_text(encoding="utf-8").strip()
    finestra = (ROOT / "src" / "finestra.py").read_text(encoding="utf-8").strip()
    out = ROOT / "quadern.py"
    out.write_text(server.replace("__QR__", qr).replace("__FINESTRA__", finestra)
                   .replace("__ICONA__", b64_lines((WEB / "logo.png").read_bytes()))
                   .replace("__PAGE__", b64_lines(gzip.compress(html.encode("utf-8"), 9)))
                   .replace("__SRD__", b64_lines((ROOT / "src" / "srd" / "srd-es.json.gz").read_bytes())),
                   encoding="utf-8")
    out.chmod(0o755)
    print(f"Fet: {out.name} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
