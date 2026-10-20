<p align="center"><img src="logo-nom.png" alt="Quadern del Mestre" width="280"></p>

<p align="center">
  <a href="../../releases/latest"><img src="https://img.shields.io/github/v/release/jossanmar9/quadern-del-mestre?label=versi%C3%B3&color=8C2A1C" alt="Última versió"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/llic%C3%A8ncia-GPL--3.0--or--later-2A1C10" alt="Llicència GPL-3.0-or-later"></a>
  <img src="https://img.shields.io/badge/Windows-10%20%7C%2011-A27419" alt="Windows 10 i 11">
  <img src="https://img.shields.io/badge/Linux-.deb%20%7C%20.tar.gz-A27419" alt="Linux">
</p>

**Valencià** · [Castellano](README.es.md)

# Quadern del Mestre

**Ajudant lliure per a dirigir partides de rol de 5a edició a casa.** Un ordinador fa de servidor i la resta de la taula hi entra des del navegador, mòbils inclosos: mapes amb boira de guerra, fitxes de personatge, combat, el compendi SRD 5.2.1, diari i documents. En valencià i castellà, i sense Internet.

Funciona a **Windows i Linux**. S'instal·la com qualsevol altre programa i les partides es queden a l'ordinador de casa.

🌐 **Web:** [jossanmar9.github.io/quadern-del-mestre](https://jossanmar9.github.io/quadern-del-mestre/) · ⬇️ **Descàrrega:** [última versió](../../releases/latest) · 📖 **Manual:** [en línia](docs/manual-usuari.md) i en PDF a cada versió

![El mapa amb la boira de guerra, vist pel màster](docs/imatges/ca/04-mapa-master.jpg)

## Contingut

- [Què fa](#què-fa)
- [Captures](#captures)
- [Instal·lació](#installació)
- [Primers passos](#primers-passos)
- [Dades i còpies de seguretat](#dades-i-còpies-de-seguretat)
- [Documentació](#documentació)
- [Per a desenvolupar](#per-a-desenvolupar)
- [Publicar una versió](#publicar-una-versió)
- [Col·laborar](#col·laborar)
- [Ús d'intel·ligència artificial](#ús-dintel·ligència-artificial)
- [Llicència](#llicència)

## Què fa

| Secció | Què fa |
|---|---|
| **Mapa** | Imatge de fons (Dungeondraft, Inkarnate, un escaneig…) amb la quadrícula ajustable, o dibuixat a mà: terreny, parets, portes, portes secretes, finestres, sales i etiquetes. Fitxes amb la vida a l'anell; cada jugador mou les seues. **Regle** en metres i **àrees d'efecte** (esfera, con, línia i cub). |
| **Boira de guerra** | El màster revela zones i els jugadors no reben res del que hi ha davall, ni les fitxes amagades. |
| **Personatges** | Fitxes completes amb les regles de 2024: característiques, habilitats, salvacions, PG, atacs, conjurs amb espais, inventari, monedes, estats, descansos i retrat. Totes les tirades es fan des de la fitxa. |
| **Combat** | Iniciativa, torns i rondes, dany i curació, estats i monstres amagats. Calcula la dificultat de l'encontre. Els jugadors veuen «Ferit» o «Malferit» en compte dels PG dels monstres. |
| **Compendi** | El SRD 5.2.1 amb la traducció oficial al castellà: 330 criatures, 339 conjurs, objectes màgics, estats, equip, classes i regles. Preparador d'encontres i monstres propis. |
| **Diari** | Un diari de sessions que escriu tota la taula, i documents (cartes, pistes, imatges) que el màster ensenya quan vol. |
| **Màster** | Generadors de noms, PNJ, tavernes, botí i encontres, taules aleatòries pròpies i notes secretes. |
| **Partides** | Diverses partides guardades, una partida d'exemple i la contrasenya del màster. |

A més: **daus** compartits amb avantatge, desavantatge i tirades secretes, entrada amb **QR**, **mode fosc** i adaptat al **mòbil**. Tot el programa està en **valencià i castellà**, i cada jugador tria el seu idioma.

## Captures

| | |
|---|---|
| ![Fitxa de personatge](docs/imatges/ca/10-fitxa.jpg) | ![Combat](docs/imatges/ca/14-combat-master.jpg) |
| Una fitxa de personatge, amb totes les tirades a un clic. | El combat: iniciativa, torns, punts de colp i estats. |
| ![Compendi](docs/imatges/ca/16-compendi.jpg) | ![El mapa vist per un jugador](docs/imatges/ca/05-mapa-jugador.jpg) |
| El bestiari i el preparador d'encontres. | El mateix mapa, vist per un jugador. |

Hi ha més captures, pas a pas, al [manual d'usuari](docs/manual-usuari.md).

## Instal·lació

**Requisits:** Windows 10 o 11 de 64 bits, o Linux amb escriptori, i uns 50 MB de disc. Els jugadors només necessiten un navegador i estar a la mateixa wifi. No cal Internet.

Baixa l'[última versió](../../releases/latest):

| Sistema | Fitxer |
|---|---|
| **Windows** (recomanat) | `QuadernDelMestre-X.Y-installador.exe`. No demana permisos d'administrador; crea l'accés al menú Inici i, si vols, a l'escriptori. |
| **Windows** portable | `QuadernDelMestre-X.Y-windows-portable.zip`. Descomprimeix-lo on vulgues (també en un llapis USB) i obri `QuadernDelMestre.exe`. |
| **Ubuntu, Debian, Linux Mint…** | `quadern-del-mestre_X.Y_all.deb`. Doble clic per a instal·lar-lo, o `sudo apt install ./quadern-del-mestre_X.Y_all.deb`. |
| **Altres Linux** | `QuadernDelMestre-X.Y-linux.tar.gz`. Descomprimeix-lo i obri `quadern-del-mestre.sh`; `./installa.sh` l'afig al menú. Cal Python 3 i, per a la finestra, Tk. |

El programa no està signat digitalment: a Windows, SmartScreen pot avisar. Prem **Més informació → Executa igualment**. La primera vegada, permet-li l'accés a les **xarxes privades** perquè hi puguen entrar els jugadors.

Més detalls, el tallafoc de Linux i com passar les partides de la versió 1.0, a la [guia d'instal·lació](docs/guia-installacio.md).

**Sense instal·lar res** (Linux, Mac o Windows amb Python 3.8 o més nou): baixa [`quadern.py`](quadern.py) i executa `python3 quadern.py`.

## Primers passos

1. Obri **Quadern del Mestre**. S'obri una finestreta amb l'adreça per als altres, un **codi QR** i la **contrasenya del màster**, i el navegador ja amb l'app. Mentre la finestra estiga oberta, el Quadern funciona; en tancar-la, ho guarda tot i s'atura.
2. Qui vol ser màster marca «Sóc el màster» i escriu la contrasenya. Els jugadors escanegen el QR amb el mòbil i entren només amb el nom.
3. Per a provar-ho tot de seguida, ves a **Partides → Crear la partida d'exemple**.

Opcions per al terminal:

```bash
quadern-del-mestre --contrasenya drac      # tria la contrasenya del màster
quadern-del-mestre --port 9002             # un altre port (el normal és el 8767)
quadern-del-mestre --partida "La cripta"   # obri (o crea) eixa partida
quadern-del-mestre --dades ~/Partides      # guarda les partides en una altra carpeta
quadern-del-mestre --sense-finestra        # sense finestra: tot al terminal, amb el QR
quadern-del-mestre --idioma es             # la finestra en castellà (per defecte, en valencià)
```

(A Windows, `QuadernDelMestre.exe`; amb el `.tar.gz`, `./quadern-del-mestre.sh`; sense instal·lar, `python3 quadern.py`.)

## Dades i còpies de seguretat

| Com està instal·lat | On es guarden les partides |
|---|---|
| Windows, amb l'instal·lador | `%APPDATA%\QuadernDelMestre` |
| Linux, amb el `.deb` | `~/.local/share/quadern-del-mestre` |
| Windows portable, `.tar.gz` o `python3 quadern.py` | La carpeta del programa |

Cada partida es guarda a `partides/<nom>.json`, i les seues imatges a `partides/<nom>-fitxers/`. Els jugadors, les sessions i la contrasenya del màster van a `quadern.json`. Per a fer una còpia de seguretat, copia la carpeta sencera; el botó **Carpeta de partides** de la finestra l'obri directament. En desinstal·lar, les partides no s'esborren.

## Documentació

| Document | Valencià | Castellano |
|---|---|---|
| Manual d'usuari | [manual-usuari.md](docs/manual-usuari.md) | [manual-usuario.md](docs/manual-usuario.md) |
| Guia d'instal·lació | [guia-installacio.md](docs/guia-installacio.md) | [guia-instalacion.md](docs/guia-instalacion.md) |

Els PDF es generen sols a partir d'aquests fitxers i van adjunts a cada [versió](../../releases/latest), dins dels paquets i a la [web](https://jossanmar9.github.io/quadern-del-mestre/).

## Per a desenvolupar

Només cal **Python 3.8 o més nou**, sense dependències. `quadern.py` es genera a partir de `src/`:

| Fitxer | Què hi ha |
|---|---|
| `src/servidor.py` | El servidor: permisos del màster, boira de guerra, imatges i on es guarden les dades |
| `src/finestra.py` | La finestreta amb l'adreça, el QR i la contrasenya (Tk) |
| `src/qr.py` | El generador de codis QR |
| `src/srd/srd-es.json.gz` | El compendi SRD 5.2.1 en castellà |
| `src/web/nucli.js`, `daus.js` | Utilitats, idioma, connexió, finestres i daus |
| `src/web/mapa.js` | L'editor de mapes |
| `src/web/fitxes.js`, `combat.js`, `compendi.js` | Fitxes, combat i compendi |
| `src/web/diari.js`, `master.js`, `partides.js` | Diari i documents, pestanya del màster, partides |
| `src/web/dades.js` | Regles: habilitats, estats, classes, espais de conjur, PX, generadors |
| `src/web/i18n.js` | Les traduccions al castellà (per a afegir un idioma, copia el bloc `es`) |
| `docs/` | Els manuals en Markdown i les captures |
| `paquets/` | L'instal·lador de Windows (Inno Setup) i els fitxers del menú de Linux |
| `eines/` | Comprovar traduccions, fer els manuals en PDF, els paquets de Linux i la web |

Després de canviar alguna cosa:

```bash
python3 build.py                          # torna a generar quadern.py
python3 eines/comprova-traduccions.py     # comprova que no falta cap traducció
python3 quadern.py                        # prova-ho
```

Altres eines:

```bash
python3 eines/paquet-linux.py             # fa el .deb i el .tar.gz a dist/
sh eines/manuals-pdf.sh dist/manuals      # fa els manuals en PDF (cal Chrome o Chromium)
python3 eines/web.py _site                # genera la web
```

## Publicar una versió

GitHub ho fa tot sol amb [`.github/workflows/publica.yml`](.github/workflows/publica.yml): prova el programa, fa l'instal·lador i el portable de Windows, el `.deb` i el `.tar.gz` de Linux i els manuals en PDF, i ho publica a [Releases](../../releases).

1. Canvia `VERSION` a `src/servidor.py` (per exemple, `"1.2"`) i torna a generar `quadern.py` amb `python3 build.py`.
2. Puja els canvis i una etiqueta en minúscula amb el mateix número:

```bash
git tag v1.2
git push origin main v1.2
```

Al cap d'uns minuts, la versió nova apareix a [Releases](../../releases). Si l'etiqueta i `VERSION` no coincideixen, la publicació s'atura i ho avisa.

La [web](https://jossanmar9.github.io/quadern-del-mestre/) es publica sola amb [`.github/workflows/web.yml`](.github/workflows/web.yml) cada vegada que es pugen canvis a `main` (cal **Settings → Pages → Source: GitHub Actions**).

## Col·laborar

Les propostes de millora i les correccions són benvingudes. Si has trobat una errada o tens una idea, obri una [incidència](../../issues).

## Ús d'intel·ligència artificial

Aquest projecte s'ha fet amb ajuda d'IA:
- **Imatges:** el logo s'ha generat amb IA.
- **Codi i documentació:** el programa, les traduccions, els README, els manuals, els paquets i la web s'han escrit amb un assistent d'IA (Claude, d'Anthropic) i s'han revisat a mà.

## Llicència

[GPL-3.0](LICENSE) o posterior. El podeu usar, copiar, modificar i compartir lliurement. Si en publiqueu una versió modificada, també ha de ser lliure i amb el codi obert.

El compendi inclou material del **SRD 5.2.1** de Wizards of the Coast LLC, amb llicència [Creative Commons Reconeixement 4.0](https://creativecommons.org/licenses/by/4.0/legalcode). Els detalls i el text d'atribució complet són a [NOTICE.md](NOTICE.md).

**Avís:** projecte de fans **no oficial**, sense relació amb Wizards of the Coast. «Dungeons & Dragons» i «D&D» són marques dels seus propietaris. El programa només inclou el material lliure del SRD 5.2.1.
