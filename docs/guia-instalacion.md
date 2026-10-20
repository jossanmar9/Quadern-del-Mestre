# Guía de instalación

Cómo instalar el Quadern del Mestre en el ordenador que hará de servidor, en Windows o en Linux. Los jugadores no tienen que instalar nada: solo necesitan un navegador y la misma wifi.

Todo se descarga de la página de [descargas](https://github.com/jossanmar9/quadern-del-mestre/releases/latest).

## Qué hace falta

- **Windows 10 u 11** de 64 bits, o **Linux** con escritorio (Ubuntu, Debian, Linux Mint, Fedora, Arch…).
- Unos 50 MB de disco.
- El ordenador y los dispositivos de los jugadores, en la **misma wifi**. No hace falta Internet.

## Windows

Hay dos versiones; elige una.

**Instalador (recomendado):** `QuadernDelMestre-X.Y-installador.exe`

1. Descárgalo y ábrelo. No pide permisos de administrador.
2. Windows SmartScreen puede avisar de que es un programa de un editor desconocido, porque no está firmado digitalmente. Pulsa **Más información → Ejecutar de todas formas**.
3. Sigue los pasos. Se crea el acceso en el menú Inicio y, si quieres, en el escritorio.

**Portable:** `QuadernDelMestre-X.Y-windows-portable.zip`

1. Descomprímelo donde quieras, también en un lápiz USB.
2. Abre `QuadernDelMestre.exe` de dentro de la carpeta.

En la versión portable, las partidas se guardan dentro de la misma carpeta, así que puedes llevártela con todos los datos.

**La primera vez**, Windows pregunta si el programa puede usar la red. Marca **Redes privadas** y pulsa **Permitir acceso**. Si no lo haces, los jugadores no podrán entrar. Comprueba también que la wifi de casa está configurada como red privada.

**Actualizar:** con el Quadern cerrado, ejecuta el instalador de la versión nueva. Las partidas se conservan.

**Desinstalar:** desde *Configuración → Aplicaciones*. Las partidas no se borran.

## Linux

### Ubuntu, Debian, Linux Mint y similares: el paquete .deb

1. Descarga `quadern-del-mestre_X.Y_all.deb`.
2. Haz doble clic para abrirlo con el instalador de software y pulsa **Instalar**. Desde el terminal también se puede hacer:

```
sudo apt install ./quadern-del-mestre_X.Y_all.deb
```

3. Abre **Quadern del Mestre** desde el menú de aplicaciones (en la sección de juegos).

El paquete instala también lo que necesita (Python 3 y Tk) y la orden `quadern-del-mestre` para arrancarlo desde el terminal.

**Actualizar:** instala el `.deb` de la versión nueva. **Desinstalar:** `sudo apt remove quadern-del-mestre`. Las partidas no se borran.

### Otras distribuciones: el .tar.gz

1. Comprueba que tienes Python 3 y Tk. Casi todas las distribuciones traen Python; si no tienes Tk, el Quadern funciona igual pero sin la ventana, solo en el terminal.

| Distribución | Orden para instalar Tk |
|---|---|
| Fedora | `sudo dnf install python3-tkinter` |
| Arch, Manjaro | `sudo pacman -S tk` |
| openSUSE | `sudo zypper install python3-tk` |
| Debian, Ubuntu | `sudo apt install python3-tk` |

2. Descarga `QuadernDelMestre-X.Y-linux.tar.gz` y descomprímelo donde quieras:

```
tar xzf QuadernDelMestre-X.Y-linux.tar.gz
cd QuadernDelMestre-X.Y-linux
./quadern-del-mestre.sh
```

3. Si quieres el acceso en el menú de aplicaciones, ejecuta una vez `./installa.sh`. Para quitarlo: `./installa.sh --desinstalla`.

Como en la versión portable de Windows, las partidas se guardan dentro de esa carpeta.

**Cortafuegos:** si tienes (por ejemplo `ufw`), abre el puerto para que entren los jugadores: `sudo ufw allow 8767/tcp`.

## Mac y otros sistemas

No hay paquete para Mac, pero funciona con Python 3.8 o más nuevo. Descarga `quadern.py` del [repositorio](https://github.com/jossanmar9/quadern-del-mestre) y, en el terminal:

```
python3 quadern.py
```

## Dónde se guardan las partidas

| Cómo está instalado | Carpeta |
|---|---|
| Windows, con el instalador | `%APPDATA%\QuadernDelMestre` |
| Linux, con el `.deb` | `~/.local/share/quadern-del-mestre` |
| Windows portable, `.tar.gz` o `python3 quadern.py` | La misma carpeta del programa |

Dentro está la carpeta `partides` (cada partida y sus imágenes) y el archivo `quadern.json` (jugadores y contraseña del máster). El botón **Carpeta de partidas** de la ventana la abre directamente.

Para hacer una copia de seguridad, copia esa carpeta entera. Si quieres guardar los datos en otro sitio (por ejemplo, una carpeta sincronizada con la nube), arranca con `--dades CARPETA`.

### Pasar las partidas de la versión 1.0

La versión 1.0 guardaba las partidas junto a `QuadernDelMestre.exe`. Si ahora usas el instalador o el `.deb`:

1. Cierra el Quadern.
2. Copia la carpeta `partides` y el archivo `quadern.json` de la carpeta antigua a la carpeta nueva de la tabla anterior.
3. Vuelve a abrir el Quadern.

Si sigues con la versión portable, solo tienes que copiar esos dos a la carpeta nueva.

## Opciones

El Quadern acepta estas opciones al arrancarlo desde el terminal (`quadern-del-mestre` con el `.deb`, `./quadern-del-mestre.sh` con el `.tar.gz`, `QuadernDelMestre.exe` en Windows o `python3 quadern.py`):

| Opción | Qué hace |
|---|---|
| `--contrasenya drac` | Elige la contraseña del máster. |
| `--port 9002` | Usa otro puerto (el normal es el 8767). |
| `--partida "La cripta"` | Abre esa partida al arrancar (la crea si no existe). |
| `--dades CARPETA` | Guarda las partidas en esa carpeta. |
| `--sense-finestra` | No abre la ventana: todo va al terminal, con el QR. Útil en un servidor sin pantalla. |
| `--sense-navegador` | No abre el navegador al arrancar. |
| `--sense-qr` | No muestra el QR en el terminal. |
| `--idioma ca` | Muestra la ventana en valenciano (`es` para castellano). Por defecto, en valenciano. |

## Si algo no funciona

| Qué pasa | Qué hacer |
|---|---|
| Windows no deja abrir el programa | Es el aviso de SmartScreen: **Más información → Ejecutar de todas formas**. |
| Los demás no pueden entrar | Misma wifi, red privada y el programa permitido en el cortafuegos (ver más arriba). |
| En Linux no se abre la ventana | Falta Tk: instálalo con la orden de tu distribución. Mientras tanto, la información sale en el terminal. |
| «El puerto ya está en uso» | Ya hay otro Quadern abierto. Ciérralo o arranca con `--port 9002`. |
