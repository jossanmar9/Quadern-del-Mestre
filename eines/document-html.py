#!/usr/bin/env python3
"""Converteix un manual de docs/ (Markdown) en una pàgina HTML preparada per a imprimir en PDF.

Ús:  python3 eines/document-html.py docs/manual-usuari.md eixida.html

Després, el PDF es fa amb Chrome o Chromium:
     chrome --headless --no-pdf-header-footer --print-to-pdf=manual-usuari.pdf eixida.html

Només entén el Markdown que fan servir els manuals: títols, paràgrafs, llistes, taules, imatges
soles en un paràgraf (amb el peu en el text alternatiu), citacions, blocs de codi, enllaços,
**negreta**, *cursiva* i `codi`. Sense dependències.
"""
import base64
import html
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TEXTOS = {
    "ca": {"versio": "Versió {v}", "pagina": "Pàgina", "contingut": "Contingut",
           "peu": "Programari lliure (GPL-3.0) · Inclou material del SRD 5.2.1 (CC BY 4.0) · Projecte de fans no oficial"},
    "es": {"versio": "Versión {v}", "pagina": "Página", "contingut": "Contenido",
           "peu": "Software libre (GPL-3.0) · Incluye material del SRD 5.2.1 (CC BY 4.0) · Proyecto de fans no oficial"},
}


def versio():
    v = os.environ.get("QUADERN_VERSIO")
    if v:
        return v
    m = re.search(r'^VERSION = "([^"]+)"', (ROOT / "src" / "servidor.py").read_text(encoding="utf-8"), re.M)
    return m.group(1) if m else ""


def slug(text):
    """El mateix identificador que fa GitHub per als títols (perquè els enllaços #… funcionen igual)."""
    return re.sub(r"[^\w\- ]", "", text.lower()).replace(" ", "-")


def inline(text, base):
    codis = []

    def guarda_codi(m):
        codis.append(f"<code>{html.escape(m.group(1))}</code>")
        return f"\x00{len(codis) - 1}\x00"

    text = re.sub(r"`([^`]+)`", guarda_codi, text)
    text = html.escape(text, quote=False)
    text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", lambda m: f'<img src="{imatge(m.group(2), base)}" alt="{m.group(1)}">', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f'<a href="{enllac(m.group(2))}">{m.group(1)}</a>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", text)
    text = re.sub(r"(?<![\"=])(https?://[^\s<)]+)", r'<a href="\1">\1</a>', text)
    return re.sub(r"\x00(\d+)\x00", lambda m: codis[int(m.group(1))], text)


def imatge(src, base):
    if re.match(r"^[a-z]+:", src):
        return src
    return (base / src).resolve().as_uri()


def enllac(href):
    # Els enllaços a un altre manual apunten al seu PDF, que va al costat
    return re.sub(r"^([\w-]+)\.md(#.*)?$", lambda m: f"{m.group(1)}.pdf{m.group(2) or ''}", href)


def blocs(md, base):
    """Markdown → llista de (tipus, html). El tipus serveix per a fer la portada i l'índex."""
    linies = md.replace("\r\n", "\n").split("\n")
    eixida, i = [], 0
    while i < len(linies):
        l = linies[i]
        if not l.strip():
            i += 1
            continue
        if l.startswith("```"):
            j = i + 1
            while j < len(linies) and not linies[j].startswith("```"):
                j += 1
            eixida.append(("codi", "<pre><code>" + html.escape("\n".join(linies[i + 1:j])) + "</code></pre>"))
            i = j + 1
            continue
        m = re.match(r"^(#{1,4})\s+(.*)$", l)
        if m:
            n, t = len(m.group(1)), m.group(2).strip()
            eixida.append((f"h{n}", t, f'<h{n} id="{slug(t)}">{inline(t, base)}</h{n}>'))
            i += 1
            continue
        if l.startswith("|") and i + 1 < len(linies) and re.match(r"^\|[\s\-:|]+\|\s*$", linies[i + 1]):
            fila = lambda s: [c.strip() for c in s.strip().strip("|").split("|")]  # noqa: E731
            cap = fila(l)
            cos = []
            j = i + 2
            while j < len(linies) and linies[j].startswith("|"):
                cos.append(fila(linies[j]))
                j += 1
            t = "<table><thead><tr>" + "".join(f"<th>{inline(c, base)}</th>" for c in cap) + "</tr></thead><tbody>"
            t += "".join("<tr>" + "".join(f"<td>{inline(c, base)}</td>" for c in r) + "</tr>" for r in cos)
            eixida.append(("taula", t + "</tbody></table>"))
            i = j
            continue
        m = re.match(r"^(\s*)([-*]|\d+\.)\s+", l)
        if m:
            ordenada = m.group(2)[0].isdigit()
            inici = int(m.group(2)[:-1]) if ordenada else 1
            items = []
            while i < len(linies) and re.match(r"^\s*([-*]|\d+\.)\s+", linies[i]):
                item = re.sub(r"^\s*([-*]|\d+\.)\s+", "", linies[i])
                i += 1
                while i < len(linies) and linies[i].startswith("   ") and linies[i].strip():
                    item += " " + linies[i].strip()
                    i += 1
                items.append(f"<li>{inline(item, base)}</li>")
            obri = (f'<ol start="{inici}">' if inici != 1 else "<ol>") if ordenada else "<ul>"
            eixida.append(("llista", obri + "".join(items) + ("</ol>" if ordenada else "</ul>")))
            continue
        if l.startswith(">"):
            text = []
            while i < len(linies) and linies[i].startswith(">"):
                text.append(linies[i].lstrip("> ").rstrip())
                i += 1
            eixida.append(("nota", f'<aside class="nota">{inline(" ".join(text), base)}</aside>'))
            continue
        text = []
        while i < len(linies) and linies[i].strip() and not re.match(r"^(#|```|\||>|\s*([-*]|\d+\.)\s)", linies[i]):
            text.append(linies[i].strip())
            i += 1
        p = " ".join(text)
        m = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", p)
        if m:
            eixida.append(("figura", f'<figure><img src="{imatge(m.group(2), base)}" alt="{html.escape(m.group(1))}">'
                                     f"<figcaption>{inline(m.group(1), base)}</figcaption></figure>"))
        else:
            eixida.append(("p", f"<p>{inline(p, base)}</p>"))
    return eixida


ESTIL = """
@page { size: A4; margin: 16mm 16mm 18mm;
  @bottom-left { content: "Quadern del Mestre · %(titol)s"; font: 8.5pt Georgia, serif; color: #8a7556; }
  @bottom-right { content: "%(pagina)s " counter(page) " / " counter(pages); font: 8.5pt Georgia, serif; color: #8a7556; } }
@page :first { @bottom-left { content: none } @bottom-right { content: none } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 10.5pt/1.5 "Alegreya", Georgia, "DejaVu Serif", serif; color: #2A1C10; }
h1, h2, h3 { font-family: "IM Fell English", Georgia, serif; font-weight: 400; color: #2A1C10; }
h2 { font-size: 21pt; margin: 0 0 10pt; padding-bottom: 5pt; border-bottom: 3px double #A88C5E; break-after: avoid; }
h2 .num { color: #8C2A1C; margin-right: 8pt; }
h3 { font-size: 13.5pt; margin: 14pt 0 4pt; break-after: avoid; }
.salts h2 { break-before: page; }
.seccio + .seccio h2 { margin-top: 20pt; }
.salts .seccio + .seccio h2 { margin-top: 0; }
p, li { orphans: 3; widows: 3; }
p { margin: 0 0 7pt; }
ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
li { margin: 2pt 0; }
li::marker { color: #8C2A1C; }
a { color: #8C2A1C; text-decoration: none; }
code { font: 9pt "DejaVu Sans Mono", Consolas, monospace; background: #F0E4C8; padding: 0 3pt; border-radius: 2pt; }
pre { background: #F4EAD2; border: 1px solid #C4AB80; border-radius: 3pt; padding: 7pt 10pt; margin: 0 0 9pt; break-inside: avoid; }
pre code { background: none; padding: 0; }
table { width: 100%%; border-collapse: collapse; margin: 4pt 0 10pt; font-size: 9.8pt; break-inside: auto; }
th { text-align: left; font: 600 8.5pt "Alegreya SC", Georgia, serif; letter-spacing: .06em; text-transform: uppercase; color: #8a6514;
  border-bottom: 1.5px solid #A88C5E; padding: 4pt 6pt; }
td { border-bottom: 1px solid #DCCBA6; padding: 4pt 6pt; vertical-align: top; }
tr { break-inside: avoid; }
td:first-child { white-space: nowrap; }
figure { margin: 6pt 0 12pt; break-inside: avoid; text-align: center; }
figure img { max-width: 100%%; max-height: 100mm; border: 1px solid #C4AB80; border-radius: 3pt; box-shadow: 0 2pt 6pt rgba(60,35,10,.18); }
figcaption { font-style: italic; color: #6F5A40; font-size: 9.5pt; margin-top: 4pt; }
.nota { border-left: 3px solid #A27419; background: #F7EFDC; padding: 6pt 10pt; margin: 6pt 0 10pt; color: #4d3c26; }
/* Portada */
.portada { break-after: page; min-height: 255mm; display: flex; flex-direction: column; text-align: center; padding-top: 18mm; }
.portada img.logo { width: 46mm; margin: 0 auto 8mm; }
.portada h1 { font-size: 32pt; margin: 0 0 6pt; }
.portada .sub { font-size: 12pt; color: #6F5A40; max-width: 140mm; margin: 0 auto 4pt; }
.portada .versio { font: 600 9pt "Alegreya SC", Georgia, serif; letter-spacing: .18em; color: #A27419; text-transform: uppercase; margin: 8pt 0 12mm; }
.index { text-align: left; columns: 2; column-gap: 12mm; max-width: 160mm; margin: 0 auto; border-top: 3px double #A88C5E; padding-top: 6mm; }
.index h3 { column-span: all; text-align: center; font-size: 12pt; margin: 0 0 4mm; }
.index a { display: flex; gap: 6pt; color: #2A1C10; padding: 2.5pt 0; break-inside: avoid; }
.index .n { color: #8C2A1C; min-width: 14pt; font-weight: 600; }
.portada .peu { margin-top: auto; font-size: 8.5pt; color: #8a7556; }
"""


def document(md_path):
    md_path = Path(md_path)
    l = "es" if re.search(r"usuario|instalacion|-es\b", md_path.stem) else "ca"
    T = TEXTOS[l]
    bs = blocs(md_path.read_text(encoding="utf-8"), md_path.parent)
    titol = next((b[1] for b in bs if b[0] == "h1"), md_path.stem)
    # Portada: el títol, el que hi ha abans de la primera secció i l'índex
    entrada, k = [], 0
    while k < len(bs) and bs[k][0] != "h2":
        if bs[k][0] != "h1":
            entrada.append(bs[k][-1].replace("<p>", '<p class="sub">', 1))
        k += 1
    seccions, n = [], 0
    for b in bs[k:]:
        if b[0] == "h2":
            n += 1
            seccions.append([(b[1], f'<h2 id="{slug(b[1])}"><span class="num">{n}</span>{inline(b[1], md_path.parent)}</h2>')])
        else:
            seccions[-1].append((None, b[-1]))
    index = "".join(f'<a href="#{slug(s[0][0])}"><span class="n">{i}</span>{html.escape(s[0][0])}</a>'
                    for i, s in enumerate(seccions, 1))
    logo = "data:image/png;base64," + base64.b64encode((ROOT / "logo.png").read_bytes()).decode()
    cos = "".join('<section class="seccio">' + "".join(h for _, h in s) + "</section>" for s in seccions)
    estil = ESTIL % {"titol": titol.replace('"', ""), "pagina": T["pagina"]}
    return f"""<!doctype html>
<html lang="{'es' if l == 'es' else 'ca-valencia'}">
<head>
<meta charset="utf-8">
<title>{html.escape(titol)} · Quadern del Mestre</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,600;1,400&family=Alegreya+SC:wght@600&family=IM+Fell+English&display=swap">
<style>{estil}</style>
</head>
<body class="{'salts' if len(seccions) >= 10 else ''}">
<div class="portada">
  <img class="logo" src="{logo}" alt="">
  <h1>{html.escape(titol)}</h1>
  {''.join(entrada)}
  <div class="versio">Quadern del Mestre · {T['versio'].format(v=versio())}</div>
  <nav class="index"><h3>{T['contingut']}</h3>{index}</nav>
  <div class="peu">{T['peu']}</div>
</div>
{cos}
</body>
</html>
"""


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    Path(sys.argv[2]).write_text(document(sys.argv[1]), encoding="utf-8")


if __name__ == "__main__":
    main()
