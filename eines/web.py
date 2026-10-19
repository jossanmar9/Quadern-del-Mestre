#!/usr/bin/env python3
"""Genera la web de presentació del Quadern del Mestre (GitHub Pages) en valencià i castellà.

Ús:  python3 eines/web.py [carpeta-eixida]        (per defecte, _site)

Agafa la versió de src/servidor.py, unes quantes captures de docs/imatges i el logotip.
Els manuals en PDF els afig el workflow (.github/workflows/web.yml) a la carpeta pdf/.
Sense dependències. Llicència GPL-3.0-or-later.
"""
import datetime
import html
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "https://github.com/jossanmar9/quadern-del-mestre"
WEB = "https://jossanmar9.github.io/quadern-del-mestre/"

CAPTURES = ["04-mapa-master", "05-mapa-jugador", "10-fitxa", "14-combat-master", "16-compendi",
            "13-conjurs", "18-diari", "19-master", "20-mobil", "21-fosc"]

T = {
    "ca": {
        "lang": "ca-valencia", "altre": "es", "altre_nom": "Castellano", "altre_url": "es/",
        "titol": "Quadern del Mestre: ajudant lliure per a partides de rol",
        "descripcio": "Programa lliure i gratuït per a dirigir partides de rol de 5a edició a casa, en valencià i "
                      "castellà: mapes amb boira de guerra, fitxes, combat i compendi SRD 5.2.1. Per a Windows i Linux.",
        "lema": "Ajudant lliure per a partides de rol",
        "hero": "Tota la partida, a la taula de casa.",
        "hero_text": "Un ordinador fa de servidor i la resta de la taula hi entra des del mòbil o el portàtil. "
                     "Mapes amb boira de guerra, fitxes, combat i el compendi de 5a edició. Sense Internet, sense "
                     "quotes i en valencià i castellà.",
        "baixa_win": "Baixa per a Windows", "baixa_linux": "Baixa per a Linux",
        "versio": "Versió {v} · Windows 10 i 11 · Ubuntu, Debian, Fedora, Arch… · Gratuït i lliure",
        "manual": "Llig el manual",
        "nav_que": "Què fa", "nav_veure": "Captures", "nav_com": "Com començar", "nav_codi": "Codi",
        "que_titol": "Què pots fer amb el Quadern",
        "que_intro": "Pensat per al màster que porta la partida a casa: tot en un lloc, i cada jugador amb el seu mòbil.",
        "moduls": [
            ("Mapes", "Imatge de fons o dibuixat a mà: terreny, parets, portes, portes secretes i finestres, amb la quadrícula ajustable."),
            ("Boira de guerra", "El màster revela les sales a mesura que s'hi entra. Els jugadors no reben res del que hi ha davall, ni les fitxes amagades."),
            ("Fitxes de personatge", "Completes, amb les regles de 2024: característiques, atacs, conjurs amb espais, inventari i estats. Les tirades es fan des de la fitxa."),
            ("Combat", "Iniciativa, torns i rondes, dany i curació. Calcula la dificultat de l'encontre, i els jugadors veuen «Ferit» en compte dels PG."),
            ("Compendi SRD 5.2.1", "330 criatures, 339 conjurs, objectes màgics, estats, equip, classes i regles, amb un preparador d'encontres."),
            ("Diari i documents", "Un diari de sessions que escriu tota la taula, i cartes, pistes i imatges que el màster ensenya quan vol."),
            ("Pestanya del màster", "Generadors de noms, PNJ, tavernes, botí i encontres, taules aleatòries pròpies i notes secretes."),
            ("Daus i mòbil", "Daus compartits amb avantatge i tirades secretes. Entrada amb QR, mode fosc i adaptat al mòbil."),
        ],
        "veure_titol": "Així es veu",
        "veure_intro": "Captures reals amb la partida d'exemple, «La cripta del rei oblidat».",
        "captures": {
            "04-mapa-master": "El mapa vist pel màster: la boira és transparent i les portes secretes porten una S.",
            "05-mapa-jugador": "El mateix mapa vist per un jugador: només les sales que el màster ha revelat.",
            "10-fitxa": "Una fitxa de personatge, amb totes les tirades a un clic.",
            "14-combat-master": "El combat: iniciativa, torns, punts de colp i estats.",
            "16-compendi": "El bestiari del compendi i el preparador d'encontres.",
            "13-conjurs": "Els conjurs d'un personatge, amb els espais de cada nivell.",
            "18-diari": "El diari de sessions, que escriu tota la taula.",
            "19-master": "La pestanya del màster: generadors, taules aleatòries i notes secretes.",
            "20-mobil": "Al mòbil, cada jugador porta la seua fitxa i mou la seua figura.",
            "21-fosc": "El mode fosc, per a les partides de nit.",
        },
        "com_titol": "Com començar",
        "passos": [
            ("Baixa'l", "Des de la pàgina de descàrregues. A Windows, <code>QuadernDelMestre-…-installador.exe</code> "
                        "(o el <code>.zip</code> portable). A Linux, el <code>.deb</code> per a Ubuntu i Debian, "
                        "o el <code>.tar.gz</code> per a la resta."),
            ("Obri'l", "S'obri una finestreta amb l'adreça, un codi QR i la contrasenya del màster, i el navegador "
                       "ja amb l'app. Mentre la finestra estiga oberta, el Quadern funciona."),
            ("Convida la taula", "Els jugadors escanegen el QR amb el mòbil i entren amb el seu nom. Per a provar-ho "
                                 "tot de seguida: <b>Partides → Crear la partida d'exemple</b>."),
        ],
        "dades_titol": "Tot es queda a casa",
        "dades": [
            "El Quadern funciona a la wifi de casa i no envia res a Internet.",
            "Els jugadors no han d'instal·lar res: només cal un navegador.",
            "Cada partida és un fitxer. Per a fer una còpia de seguretat, copia la carpeta de partides.",
        ],
        "req_titol": "Què cal",
        "req": ["Un ordinador amb Windows 10 o 11 de 64 bits, o amb Linux",
                "Uns 50 MB de disc",
                "Una wifi on estiguen l'ordinador i els aparells dels jugadors (no cal Internet)"],
        "docs_titol": "Manuals",
        "docs": [("manual-usuari.pdf", "Manual d'usuari, pas a pas amb captures"),
                 ("guia-installacio.pdf", "Guia d'instal·lació per a Windows i Linux")],
        "lliure_titol": "Programari lliure",
        "lliure": "El Quadern del Mestre es distribueix sota la llicència GPL-3.0 o posterior: el pots utilitzar, "
                  "estudiar, modificar i compartir. El codi és públic a GitHub.",
        "srd": "Inclou material del System Reference Document 5.2.1 de Wizards of the Coast LLC, amb llicència "
               "<a href=\"https://creativecommons.org/licenses/by/4.0/legalcode\">CC BY 4.0</a>. Les dades venen del "
               "projecte <a href=\"https://github.com/ismaelbase/compendio-srd\">Compendio SRD</a>; l'atribució "
               "completa és a <a href=\"" + REPO + "/blob/main/NOTICE.md\">NOTICE.md</a>.",
        "ia": "S'ha desenvolupat amb l'ajuda d'una intel·ligència artificial (Claude, d'Anthropic), i el logotip s'ha generat amb IA.",
        "codi": "Codi a GitHub",
        "errades": "Has trobat una errada o tens una proposta? Obri una incidència a GitHub.",
        "avis": "Projecte de fans no oficial, sense relació amb Wizards of the Coast. «Dungeons &amp; Dragons» i «D&amp;D» són marques dels seus propietaris.",
        "tema": "Mode fosc o clar",
    },
    "es": {
        "lang": "es", "altre": "ca", "altre_nom": "Valencià", "altre_url": "../",
        "titol": "Quadern del Mestre: ayudante libre para partidas de rol",
        "descripcio": "Programa libre y gratuito para dirigir partidas de rol de 5.ª edición en casa, en castellano y "
                      "valenciano: mapas con niebla de guerra, fichas, combate y compendio SRD 5.2.1. Para Windows y Linux.",
        "lema": "Ayudante libre para partidas de rol",
        "hero": "Toda la partida, en la mesa de casa.",
        "hero_text": "Un ordenador hace de servidor y el resto de la mesa entra desde el móvil o el portátil. "
                     "Mapas con niebla de guerra, fichas, combate y el compendio de 5.ª edición. Sin Internet, sin "
                     "cuotas y en castellano y valenciano.",
        "baixa_win": "Descargar para Windows", "baixa_linux": "Descargar para Linux",
        "versio": "Versión {v} · Windows 10 y 11 · Ubuntu, Debian, Fedora, Arch… · Gratuito y libre",
        "manual": "Leer el manual",
        "nav_que": "Qué hace", "nav_veure": "Capturas", "nav_com": "Cómo empezar", "nav_codi": "Código",
        "que_titol": "Qué puedes hacer con el Quadern",
        "que_intro": "Pensado para el máster que lleva la partida en casa: todo en un sitio, y cada jugador con su móvil.",
        "moduls": [
            ("Mapas", "Imagen de fondo o dibujado a mano: terreno, paredes, puertas, puertas secretas y ventanas, con la cuadrícula ajustable."),
            ("Niebla de guerra", "El máster revela las salas a medida que se entra. Los jugadores no reciben nada de lo que hay debajo, ni las fichas ocultas."),
            ("Fichas de personaje", "Completas, con las reglas de 2024: características, ataques, conjuros con espacios, inventario y estados. Las tiradas se hacen desde la ficha."),
            ("Combate", "Iniciativa, turnos y rondas, daño y curación. Calcula la dificultad del encuentro, y los jugadores ven «Herido» en lugar de los PG."),
            ("Compendio SRD 5.2.1", "330 criaturas, 339 conjuros, objetos mágicos, estados, equipo, clases y reglas, con un preparador de encuentros."),
            ("Diario y documentos", "Un diario de sesiones que escribe toda la mesa, y cartas, pistas e imágenes que el máster enseña cuando quiere."),
            ("Pestaña del máster", "Generadores de nombres, PNJ, tabernas, botín y encuentros, tablas aleatorias propias y notas secretas."),
            ("Dados y móvil", "Dados compartidos con ventaja y tiradas secretas. Entrada con QR, modo oscuro y adaptado al móvil."),
        ],
        "veure_titol": "Así se ve",
        "veure_intro": "Capturas reales con la partida de ejemplo, «La cripta del rey olvidado».",
        "captures": {
            "04-mapa-master": "El mapa visto por el máster: la niebla es transparente y las puertas secretas llevan una S.",
            "05-mapa-jugador": "El mismo mapa visto por un jugador: solo las salas que el máster ha revelado.",
            "10-fitxa": "Una ficha de personaje, con todas las tiradas a un clic.",
            "14-combat-master": "El combate: iniciativa, turnos, puntos de golpe y estados.",
            "16-compendi": "El bestiario del compendio y el preparador de encuentros.",
            "13-conjurs": "Los conjuros de un personaje, con los espacios de cada nivel.",
            "18-diari": "El diario de sesiones, que escribe toda la mesa.",
            "19-master": "La pestaña del máster: generadores, tablas aleatorias y notas secretas.",
            "20-mobil": "En el móvil, cada jugador lleva su ficha y mueve su figura.",
            "21-fosc": "El modo oscuro, para las partidas de noche.",
        },
        "com_titol": "Cómo empezar",
        "passos": [
            ("Descárgalo", "Desde la página de descargas. En Windows, <code>QuadernDelMestre-…-installador.exe</code> "
                           "(o el <code>.zip</code> portable). En Linux, el <code>.deb</code> para Ubuntu y Debian, "
                           "o el <code>.tar.gz</code> para el resto."),
            ("Ábrelo", "Se abre una ventanita con la dirección, un código QR y la contraseña del máster, y el navegador "
                       "ya con la app. Mientras la ventana esté abierta, el Quadern funciona."),
            ("Invita a la mesa", "Los jugadores escanean el QR con el móvil y entran con su nombre. Para probarlo "
                                 "todo enseguida: <b>Partidas → Crear la partida de ejemplo</b>."),
        ],
        "dades_titol": "Todo se queda en casa",
        "dades": [
            "El Quadern funciona en la wifi de casa y no envía nada a Internet.",
            "Los jugadores no tienen que instalar nada: solo hace falta un navegador.",
            "Cada partida es un archivo. Para hacer una copia de seguridad, copia la carpeta de partidas.",
        ],
        "req_titol": "Qué hace falta",
        "req": ["Un ordenador con Windows 10 u 11 de 64 bits, o con Linux",
                "Unos 50 MB de disco",
                "Una wifi en la que estén el ordenador y los dispositivos de los jugadores (no hace falta Internet)"],
        "docs_titol": "Manuales",
        "docs": [("manual-usuario.pdf", "Manual de usuario, paso a paso con capturas"),
                 ("guia-instalacion.pdf", "Guía de instalación para Windows y Linux")],
        "lliure_titol": "Software libre",
        "lliure": "El Quadern del Mestre se distribuye bajo la licencia GPL-3.0 o posterior: lo puedes usar, "
                  "estudiar, modificar y compartir. El código es público en GitHub.",
        "srd": "Incluye material del System Reference Document 5.2.1 de Wizards of the Coast LLC, con licencia "
               "<a href=\"https://creativecommons.org/licenses/by/4.0/legalcode\">CC BY 4.0</a>. Los datos vienen del "
               "proyecto <a href=\"https://github.com/ismaelbase/compendio-srd\">Compendio SRD</a>; la atribución "
               "completa está en <a href=\"" + REPO + "/blob/main/NOTICE.md\">NOTICE.md</a>.",
        "ia": "Se ha desarrollado con la ayuda de una inteligencia artificial (Claude, de Anthropic), y el logotipo se ha generado con IA.",
        "codi": "Código en GitHub",
        "errades": "¿Has encontrado un error o tienes una propuesta? Abre una incidencia en GitHub.",
        "avis": "Proyecto de fans no oficial, sin relación con Wizards of the Coast. «Dungeons &amp; Dragons» y «D&amp;D» son marcas de sus propietarios.",
        "tema": "Modo oscuro o claro",
    },
}

ICONA_WIN = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5.5 10 4.5v7H3zm8-1.2L21 3v8.5H11zM3 12.5h7v7L3 18.5zm8 0h10V21l-10-1.4z"/></svg>')
ICONA_LINUX = ('<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" '
               'stroke-linejoin="round"><path d="M12 3c-2.2 0-3.4 1.8-3.4 4.2 0 1.6-.4 2.7-1.4 4.1C5.8 13.2 5 15 5 16.8 '
               '5 19.3 7.6 21 12 21s7-1.7 7-4.2c0-1.8-.8-3.6-2.2-5.5-1-1.4-1.4-2.5-1.4-4.1C15.4 4.8 14.2 3 12 3z"/>'
               '<circle cx="10.3" cy="7.6" r=".6" fill="currentColor"/><circle cx="13.7" cy="7.6" r=".6" fill="currentColor"/>'
               '<path d="M10.6 9.8 12 10.8l1.4-1"/></svg>')


def versio():
    v = os.environ.get("QUADERN_VERSIO")
    if v:
        return v
    m = re.search(r'^VERSION = "([^"]+)"', (ROOT / "src" / "servidor.py").read_text(encoding="utf-8"), re.M)
    return m.group(1) if m else ""


def e(s):
    return html.escape(s, quote=True)


def pagina(t, l, base, v):
    descarrega = REPO + "/releases/latest"
    moduls = "".join(f'<div class="modul"><dt>{e(n)}</dt><dd>{e(d)}</dd></div>' for n, d in t["moduls"])
    passos = "".join(f"<li><h3>{e(n)}</h3><p>{d}</p></li>" for n, d in t["passos"])
    dades = "".join(f"<li>{e(d)}</li>" for d in t["dades"])
    req = "".join(f"<li>{e(d)}</li>" for d in t["req"])
    docs = "".join(f'<li><a href="{base}pdf/{e(f)}">{e(n)}</a> <span class="pes">PDF</span></li>' for f, n in t["docs"])
    primera = CAPTURES[0]
    miniatures = ""
    for i, c in enumerate(CAPTURES):
        src = f"{base}img/{l}/{c}.jpg"
        actual = ' aria-current="true"' if i == 0 else ""
        miniatures += (f'<li><button type="button" data-src="{e(src)}" data-peu="{e(t["captures"][c])}"{actual} '
                       f'aria-label="{e(t["captures"][c])}"><img src="{e(src)}" alt="" loading="lazy"></button></li>')
    any_ = datetime.date.today().year
    return f"""<!doctype html>
<html lang="{t['lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(t['titol'])}</title>
<meta name="description" content="{e(t['descripcio'])}">
<meta property="og:title" content="{e(t['titol'])}">
<meta property="og:description" content="{e(t['descripcio'])}">
<meta property="og:image" content="{WEB}img/{l}/{primera}.jpg">
<link rel="icon" href="{base}img/icona.png">
<link rel="alternate" hreflang="{t['altre']}" href="{t['altre_url']}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&family=Alegreya+SC:wght@500&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}estil.css">
<script>try{{var t=localStorage.getItem('qdm-tema');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
</head>
<body>
<header class="barra">
  <a class="marca" href="./"><img src="{base}img/icona.png" alt="" width="40" height="40"><span>Quadern del Mestre</span></a>
  <nav aria-label="Seccions">
    <a href="#que">{t['nav_que']}</a>
    <a href="#captures">{t['nav_veure']}</a>
    <a href="#comencar">{t['nav_com']}</a>
    <a href="{REPO}">{t['nav_codi']}</a>
    <a class="idioma" href="{t['altre_url']}" hreflang="{t['altre']}" lang="{t['altre']}">{t['altre_nom']}</a>
    <button class="tema" type="button" id="tema" title="{t['tema']}" aria-label="{t['tema']}">◐</button>
  </nav>
</header>

<main>
<section class="hero">
  <div class="hero-text">
    <p class="lema">{t['lema']}</p>
    <h1>{t['hero']}</h1>
    <p class="entrada">{t['hero_text']}</p>
    <div class="accions">
      <a class="boto" data-so="win" href="{descarrega}">{ICONA_WIN}{t['baixa_win']}</a>
      <a class="boto" data-so="linux" href="{descarrega}">{ICONA_LINUX}{t['baixa_linux']}</a>
    </div>
    <p class="versio">{t['versio'].format(v=v)} · <a href="{base}pdf/{t['docs'][0][0]}">{t['manual']}</a></p>
  </div>
  <figure class="hero-captura">
    <img src="{base}img/{l}/{primera}.jpg" alt="{e(t['captures'][primera])}" width="1500" height="938">
  </figure>
</section>

<section id="que" class="seccio">
  <div class="cap">
    <h2>{t['que_titol']}</h2>
    <p>{t['que_intro']}</p>
  </div>
  <dl class="moduls">{moduls}</dl>
</section>

<section id="captures" class="seccio galeria">
  <div class="cap">
    <h2>{t['veure_titol']}</h2>
    <p>{t['veure_intro']}</p>
  </div>
  <figure class="principal">
    <img id="captura" src="{base}img/{l}/{primera}.jpg" alt="{e(t['captures'][primera])}">
    <figcaption id="peu">{e(t['captures'][primera])}</figcaption>
  </figure>
  <ul class="miniatures" aria-label="{t['veure_titol']}">{miniatures}</ul>
</section>

<section id="comencar" class="seccio">
  <div class="cap"><h2>{t['com_titol']}</h2></div>
  <ol class="passos">{passos}</ol>
  <div class="accions">
    <a class="boto" data-so="win" href="{descarrega}">{ICONA_WIN}{t['baixa_win']}</a>
    <a class="boto" data-so="linux" href="{descarrega}">{ICONA_LINUX}{t['baixa_linux']}</a>
  </div>
</section>

<section class="seccio dues">
  <div>
    <h2>{t['dades_titol']}</h2>
    <ul class="punts">{dades}</ul>
  </div>
  <div>
    <h2>{t['req_titol']}</h2>
    <ul class="punts">{req}</ul>
    <h2 class="h2-segon">{t['docs_titol']}</h2>
    <ul class="docs">{docs}</ul>
  </div>
</section>

<section class="seccio lliure">
  <h2>{t['lliure_titol']}</h2>
  <p>{t['lliure']}</p>
  <p class="nota">{t['srd']}</p>
  <p class="nota">{t['ia']}</p>
  <p><a class="boto secundari" href="{REPO}">{t['codi']}</a></p>
  <p class="nota"><a href="{REPO}/issues">{t['errades']}</a></p>
</section>
</main>

<footer class="peu">
  <div class="orla" aria-hidden="true"><span>✦</span></div>
  <p><img src="{base}img/icona.png" alt="" width="28" height="28"> <span>Quadern del Mestre, {any_}.</span> <a href="{REPO}/blob/main/LICENSE">GPL-3.0-or-later</a></p>
  <p class="avis">{t['avis']}</p>
</footer>

<script>
(function(){{
  var root=document.documentElement;
  // Destaca el botó de descàrrega del sistema del visitant
  var linux=/Linux|X11/.test(navigator.userAgent)&&!/Android/.test(navigator.userAgent);
  document.querySelectorAll('.boto[data-so]').forEach(function(b){{
    if(b.dataset.so!==(linux?'linux':'win'))b.classList.add('secundari');
  }});
  // Galeria
  document.querySelectorAll('.miniatures button').forEach(function(b){{
    b.addEventListener('click',function(){{
      var img=document.getElementById('captura');
      img.src=b.dataset.src;img.alt=b.dataset.peu;
      document.getElementById('peu').textContent=b.dataset.peu;
      document.querySelectorAll('.miniatures button').forEach(function(x){{x.removeAttribute('aria-current')}});
      b.setAttribute('aria-current','true');
    }});
  }});
  // Mode fosc o clar (segueix el sistema fins que es tria)
  document.getElementById('tema').addEventListener('click',function(){{
    var fosc=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme=fosc?'light':'dark';
    try{{localStorage.setItem('qdm-tema',root.dataset.theme)}}catch(e){{}}
  }});
}})();
</script>
</body>
</html>
"""


def main():
    eixida = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "_site").resolve()
    for d in ("", "es", "img/ca", "img/es", "pdf"):
        (eixida / d).mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / "src" / "web" / "logo.png", eixida / "img" / "icona.png")
    shutil.copy(Path(__file__).with_name("web.css"), eixida / "estil.css")
    for l in ("ca", "es"):
        for c in CAPTURES:
            shutil.copy(ROOT / "docs" / "imatges" / l / f"{c}.jpg", eixida / "img" / l / f"{c}.jpg")
    v = versio()
    (eixida / "index.html").write_text(pagina(T["ca"], "ca", "", v), encoding="utf-8")
    (eixida / "es" / "index.html").write_text(pagina(T["es"], "es", "../", v), encoding="utf-8")
    (eixida / ".nojekyll").write_text("")
    print(f"Web generada a {eixida}")


if __name__ == "__main__":
    main()
