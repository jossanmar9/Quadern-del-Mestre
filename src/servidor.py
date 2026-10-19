#!/usr/bin/env python3
#
# Quadern del Mestre — ajudant per a portar partides de rol de fantasia (5a edició, SRD 5.2.1).
# Copyright (C) 2026 Col·laboradors del Quadern del Mestre
#
# Aquest programa és programari lliure: el podeu redistribuir i/o modificar
# segons els termes de la Llicència Pública General de GNU publicada per la
# Free Software Foundation, ja siga la versió 3 de la Llicència o (a la vostra
# elecció) qualsevol versió posterior.
#
# Aquest programa es distribueix amb l'esperança que siga útil, però SENSE CAP
# GARANTIA; ni tan sols la garantia implícita de COMERCIABILITAT o ADEQUACIÓ A
# UN PROPÒSIT PARTICULAR. Vegeu la Llicència Pública General de GNU per a més
# detalls: <https://www.gnu.org/licenses/>.
#
# Inclou material del System Reference Document 5.2.1 («SRD 5.2.1») de Wizards of
# the Coast LLC, disponible a https://www.dndbeyond.com/srd, amb llicència Creative
# Commons Reconeixement 4.0 Internacional (https://creativecommons.org/licenses/by/4.0/legalcode).
# Projecte de fans no oficial, sense relació amb Wizards of the Coast.
"""
Quadern del Mestre (versió 1.1) — servidor local per a portar partides de rol.

Tot va en aquest únic fitxer: el servidor, la pàgina web i el compendi SRD 5.2.1.
Un ordinador l'executa i la resta s'hi connecta des del navegador.

Ús (a Windows, canvia python3 per py, o fes doble clic a arrancar-windows.bat):
    python3 quadern.py
    python3 quadern.py --contrasenya drac
    python3 quadern.py --partida "La cripta" --port 9002
    python3 quadern.py --sense-finestra        (només la terminal)
    python3 quadern.py --dades CARPETA          (on es guarden les partides)

En arrancar obri una finestreta (i la terminal) amb l'adreça, la contrasenya del màster i un
codi QR per a entrar des del mòbil.
Cada partida es guarda a partides/<nom>.json, i les imatges a partides/<nom>-fitxers/. Les dades
van al costat del programa, o a la carpeta de l'usuari si el programa està instal·lat.
"""
import argparse
import base64
import copy
import gzip
import json
import os
import queue
import re
import secrets
import shutil
import socket
import sys
import threading
import time
import unicodedata
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

VERSION = "1.1"
FROZEN = getattr(sys, "frozen", False)          # executable de Windows fet amb PyInstaller
DIR = Path(sys.executable).resolve().parent if FROZEN else Path(__file__).resolve().parent
INSTALLAT = (DIR / "installat").exists()       # el posen l'instal·lador de Windows i el paquet .deb


def user_data_dir():
    """La carpeta de dades de l'usuari, per a quan el programa està instal·lat."""
    if os.name == "nt":
        return Path(os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming") / "QuadernDelMestre"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "Quadern del Mestre"
    return Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share") / "quadern-del-mestre"


def set_data_dir(path):
    global DATA_DIR, CAMP_DIR, TRASH_DIR, META
    DATA_DIR = Path(path).expanduser().resolve()
    CAMP_DIR = DATA_DIR / "partides"
    TRASH_DIR = CAMP_DIR / "esborrades"
    META = DATA_DIR / "quadern.json"     # sessions, noms, partida oberta i contrasenya del màster


set_data_dir(user_data_dir() if INSTALLAT else DIR)
MAX_UPLOAD = 20 * 1024 * 1024
IMG_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
WORDS = ("drac", "mag", "elf", "nan", "orc", "runa", "espasa", "torre", "llop", "corb", "foc", "gel",
         "lluna", "estel", "cripta", "bosc", "rei", "fada", "gegant", "tresor")

lock = threading.RLock()
state = {
    "docs": {},        # partida oberta: ruta -> dict
    "sessions": {},    # token -> {uid, dm}
    "users": {},       # uid -> nom (comú a totes les partides)
    "active": None,    # id de la partida oberta
    "password": "",    # contrasenya del màster
    "port": 8767,
}
clients = []
dirty = threading.Event()


# ---------------------------------------------------------------- emmagatzematge
def write_json(path, obj):
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def camp_file(cid):
    return CAMP_DIR / f"{cid}.json"


def files_dir(cid):
    return CAMP_DIR / f"{cid}-fitxers"


def slugify_plain(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]


def slugify(name):
    s = slugify_plain(name) or "partida"
    base, n = s, 2
    while camp_file(s).exists():
        s = f"{base}-{n}"
        n += 1
    return s


def camp_name(docs, cid):
    return ((docs.get("campaign/main") or {}).get("name") or "").strip() or cid


def list_campaigns():
    out = []
    for f in sorted(CAMP_DIR.glob("*.json")):
        cid = f.stem
        try:
            docs = state["docs"] if cid == state["active"] else read_json(f).get("docs", {})
        except Exception:  # noqa: BLE001
            continue
        out.append({
            "id": cid,
            "name": camp_name(docs, cid),
            "updated": int(f.stat().st_mtime * 1000),
            "characters": sum(1 for p in docs if p.count("/") == 1 and p.startswith("characters/")),
            "maps": sum(1 for p in docs if p.count("/") == 1 and p.startswith("maps/")),
            "sessions": sum(1 for p in docs if p.count("/") == 1 and p.startswith("journal/")),
            "active": cid == state["active"],
        })
    out.sort(key=lambda c: (not c["active"], -c["updated"]))
    return out


def save_now():
    with lock:
        meta = {"sessions": state["sessions"], "users": state["users"], "active": state["active"],
                "password": state["password"]}
        docs = {"docs": state["docs"]}
        cid = state["active"]
    write_json(META, meta)
    if cid:
        write_json(camp_file(cid), docs)


def saver():
    while True:
        dirty.wait()
        time.sleep(1.0)
        dirty.clear()
        try:
            save_now()
        except Exception as e:  # noqa: BLE001
            print(f"[!] No s'ha pogut guardar: {e}")


def activate(cid):
    """Carrega la partida `cid` com a oberta (qui crida té el lock i ja ha guardat l'anterior)."""
    try:
        docs = read_json(camp_file(cid)).get("docs", {})
    except FileNotFoundError:
        docs = {}
    except Exception as e:  # noqa: BLE001
        bad = camp_file(cid).with_suffix(".json.danyat")
        camp_file(cid).replace(bad)
        print(f"[!] No s'ha pogut llegir {cid}.json ({e}). L'he mogut a {bad.name}.")
        docs = {}
    state["docs"] = docs
    state["active"] = cid


def new_campaign(name):
    cid = slugify(name)
    write_json(camp_file(cid), {"docs": {"campaign/main": {"name": name}}})
    return cid


def load(wanted=None, password=None):
    CAMP_DIR.mkdir(parents=True, exist_ok=True)
    if META.exists():
        try:
            meta = read_json(META)
            state["sessions"] = meta.get("sessions", {})
            state["users"] = meta.get("users", {})
            state["active"] = meta.get("active")
            state["password"] = meta.get("password", "")
        except Exception as e:  # noqa: BLE001
            print(f"[!] No s'ha pogut llegir quadern.json ({e}). Els jugadors hauran de tornar a entrar.")
    if password:
        state["password"] = password
    if not state["password"]:
        state["password"] = f"{secrets.choice(WORDS)}-{secrets.randbelow(900) + 100}"
    if wanted:
        state["active"] = None
        match = None
        for c in list_campaigns():
            if wanted in (c["id"], c["name"]) or slugify_plain(wanted) == c["id"]:
                match = c["id"]
                break
        state["active"] = match or new_campaign(wanted)
    if not state["active"] or not camp_file(state["active"]).exists():
        existing = sorted(CAMP_DIR.glob("*.json"), key=lambda f: -f.stat().st_mtime)
        state["active"] = existing[0].stem if existing else new_campaign("Primera partida")
    activate(state["active"])
    save_now()


# ---------------------------------------------------------------- permisos i visibilitat
def valid_path(p):
    if not isinstance(p, str) or not p or len(p) > 300:
        return False
    segs = p.split("/")
    if len(segs) % 2 or len(segs) > 8:
        return False
    ok = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.")
    return all(s and s not in (".", "..") and set(s) <= ok for s in segs)


def deep_merge(a, b):
    if not isinstance(a, dict) or not isinstance(b, dict):
        return b
    out = dict(a)
    for k, v in b.items():
        out[k] = deep_merge(a[k], v) if isinstance(v, dict) and isinstance(a.get(k), dict) else v
    return out


def seg(path):
    return path.split("/")


def get_doc(path):
    s = seg(path)
    if s[0] == "users" and len(s) == 2:
        n = state["users"].get(s[1])
        return {"name": n} if n is not None else None
    return state["docs"].get(path)


def active_map():
    return (state["docs"].get("campaign/main") or {}).get("activeMap")


def cells_of(tok):
    try:
        x, y, size = int(tok.get("x", 0)), int(tok.get("y", 0)), max(1, int(tok.get("size", 1)))
    except (TypeError, ValueError):
        return []
    return [f"{x + i},{y + j}" for i in range(size) for j in range(size)]


def fog_hides(mp, key):
    fog = (mp or {}).get("fog") or {}
    return bool(fog.get("on")) and not (fog.get("rev") or {}).get(key)


HP_WORDS = ((0, "down"), (0.25, "critical"), (0.5, "bloodied"), (0.999, "hurt"))


def hp_word(hp, mx):
    try:
        hp, mx = float(hp), float(mx)
    except (TypeError, ValueError):
        return ""
    if mx <= 0:
        return ""
    r = hp / mx
    for lim, w in HP_WORDS:
        if r <= lim:
            return w
    return "healthy"


def visible_to(path, doc, sess):
    """El màster ho veu tot. Els jugadors no veuen el que és secret, ni el que tapa la boira."""
    if doc is None or sess["dm"]:
        return doc
    s = seg(path)
    if s[0].startswith("dm"):          # dmnotes, dmtables, dmmonsters: només el màster
        return None
    if s[0] == "maps":
        mp = state["docs"].get("maps/" + s[1])
        if not mp or s[1] != active_map():
            return None
        if len(s) == 2:
            fog = mp.get("fog") or {}
            if not fog.get("on"):
                return doc
            rev = fog.get("rev") or {}
            out = dict(doc)
            out["tiles"] = {k: v for k, v in (doc.get("tiles") or {}).items() if rev.get(k)}
            out["labels"] = [lb for lb in (doc.get("labels") or []) if rev.get(f"{lb.get('x')},{lb.get('y')}")]
            walls = {}
            for k, v in (doc.get("walls") or {}).items():
                try:
                    x, y, d = k.split(",")
                    x, y = int(x), int(y)
                except ValueError:
                    continue
                other = f"{x},{y - 1}" if d == "n" else f"{x - 1},{y}"
                if rev.get(f"{x},{y}") or rev.get(other):
                    walls[k] = "wall" if v == "secret" else v
            out["walls"] = walls
            return out
        if s[2] == "tokens":
            if doc.get("hidden"):
                return None
            cells = cells_of(doc)
            if cells and all(fog_hides(mp, c) for c in cells):
                return None
            return doc
        return doc
    if s[0] == "combat":
        out = dict(doc)
        lst = []
        for c in doc.get("list") or []:
            if c.get("hidden"):
                continue
            if c.get("kind") != "pc":
                word = hp_word(c.get("hp"), c.get("maxHp"))
                c = {k: v for k, v in c.items() if k not in ("hp", "maxHp", "tmp", "ac", "notes", "monster")}
                c["state"] = word
            lst.append(c)
        out["list"] = lst
        return out
    if s[0] == "handouts":
        if not doc.get("shown"):
            return None
        to = doc.get("to") or []
        if to and sess["uid"] not in to:
            return None
        return doc
    if s[0] == "characters" and doc.get("secret"):
        return None
    if s[0] == "rolls":
        out = dict(doc)
        out["list"] = [r for r in doc.get("list") or [] if not r.get("priv") or r.get("uid") == sess["uid"]]
        return out
    return doc


def can_write(path, mode, new, sess):
    s = seg(path)
    if s[0] == "users":
        return len(s) == 2 and s[1] == sess["uid"] and mode != "delete"
    if s[0] == "rolls":
        return False          # les tirades passen per /api/roll
    if sess["dm"]:
        return True
    docs = state["docs"]
    old = docs.get(path)
    uid = sess["uid"]

    def owned(doc):
        return doc is None or doc.get("ownerId") == uid

    def merged():
        if mode == "delete":
            return None
        return deep_merge(old or {}, new) if mode == "update" else new

    if s[0] == "characters" and len(s) == 2:
        m = merged()
        return owned(old) and (m is None or (m.get("ownerId") == uid and not m.get("secret")))
    if s[0] == "journal" and len(s) == 2:
        m = merged()
        return owned(old) and (m is None or m.get("ownerId") == uid)
    if s[0] == "maps" and len(s) == 4 and s[1] == active_map():
        if s[2] == "aoe":
            m = merged()
            return owned(old) and (m is None or m.get("ownerId") == uid)
        if s[2] == "tokens" and old is not None and mode != "delete":
            ch = docs.get("characters/" + str(old.get("charId")))
            if not ch or ch.get("ownerId") != uid:
                return False
            m = merged()
            same = all(m.get(k) == old.get(k) for k in set(old) | set(m) if k not in ("x", "y"))
            return same
    return False


# ---------------------------------------------------------------- actualitzacions en directe
class Client:
    def __init__(self, sess):
        self.sess = sess
        self.q = queue.Queue(maxsize=4000)

    def send(self, kind, payload):
        try:
            self.q.put_nowait((kind, payload))
        except queue.Full:
            pass


def snapshot_for(sess):
    with lock:
        out = {}
        for p, d in state["docs"].items():
            v = visible_to(p, d, sess)
            if v is not None:
                out[p] = v
        for uid, name in state["users"].items():
            out["users/" + uid] = {"name": name}
        return out


def related(paths):
    """Quan canvia un mapa o la partida, també canvia el que poden veure els jugadors dels seus fills."""
    docs = state["docs"]
    extra = []
    for p in paths:
        s = seg(p)
        if p == "campaign/main":
            extra += [k for k in docs if k.startswith("maps/")]
        elif s[0] == "maps" and len(s) == 2:
            extra += [k for k in docs if k.startswith(p + "/")]
    return list(dict.fromkeys(paths + extra))


def broadcast(changed):
    with lock:
        paths = related(changed)
        for c in list(clients):
            for p in paths:
                c.send("doc", {"path": p, "data": visible_to(p, get_doc(p), c.sess)})


def broadcast_event(kind, payload, dm_only=False):
    with lock:
        for c in list(clients):
            if dm_only and not c.sess["dm"]:
                continue
            c.send(kind, payload)


# ---------------------------------------------------------------- QR (sense dependències)
__QR__


__FINESTRA__


def lan_addresses():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(ip for ip in ips if not ip.startswith("127."))


def lan_urls():
    return [f"http://{ip}:{state['port']}" for ip in lan_addresses()]


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "Quadern/" + VERSION
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _send(self, code, body, ctype, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._send(code, body, "application/json; charset=utf-8", {"Cache-Control": "no-store"})

    def _raw(self, limit=2_000_000):
        n = int(self.headers.get("Content-Length") or 0)
        if n > limit:
            raise ValueError("massa gran")
        return self.rfile.read(n) if n else b""

    def _body(self):
        return json.loads(self._raw() or b"{}")

    def _query(self):
        return parse_qs(urlparse(self.path).query)

    def _session(self):
        tok = self.headers.get("X-Quadern-Token") or (self._query().get("t") or [""])[0]
        with lock:
            return state["sessions"].get(tok)

    # -- GET
    def do_GET(self):
        route = self.path.split("?")[0]
        if route in ("/", "/index.html"):
            return self._send(200, PAGE_BYTES, "text/html; charset=utf-8",
                              {"Cache-Control": "no-store", "X-Quadern-Version": VERSION})
        if route == "/api/hello":
            return self._json(200, {"quadern": 1, "version": VERSION})
        if route == "/api/srd":
            if "gzip" in (self.headers.get("Accept-Encoding") or ""):
                return self._send(200, SRD_GZ, "application/json; charset=utf-8",
                                  {"Content-Encoding": "gzip", "Cache-Control": "max-age=86400",
                                   "ETag": f'"srd-{VERSION}"'})
            return self._send(200, gzip.decompress(SRD_GZ), "application/json; charset=utf-8",
                              {"Cache-Control": "max-age=86400"})
        if route == "/api/invite":
            urls = lan_urls() or [f"http://localhost:{state['port']}"]
            return self._json(200, {"list": [{"url": u, "svg": qr_svg(u)} for u in urls]})
        if route.startswith("/fitxer/"):
            return self._file(route[len("/fitxer/"):])
        sess = self._session()
        if route in ("/api/campaigns", "/api/snapshot", "/api/events") and not sess:
            return self._json(401, {"error": "Sessió no vàlida. Torna a entrar."})
        if route == "/api/campaigns":
            with lock:
                return self._json(200, {"active": state["active"], "list": list_campaigns(),
                                        "password": state["password"] if sess["dm"] else None})
        if route == "/api/snapshot":
            with lock:
                return self._json(200, {"me": {"uid": sess["uid"], "dm": sess["dm"]},
                                        "campaign": state["active"], "docs": snapshot_for(sess)})
        if route == "/api/events":
            return self._events(sess)
        self._json(404, {"error": "No trobat"})

    def _file(self, name):
        sess = self._session()
        if not sess:
            return self._json(401, {"error": "Sessió no vàlida. Torna a entrar."})
        if not re.fullmatch(r"[a-f0-9]{16,40}\.(jpg|png|webp|gif)", name):
            return self._json(404, {"error": "No trobat"})
        f = files_dir(state["active"]) / name
        if not f.exists():
            return self._json(404, {"error": "No trobat"})
        ext = name.rsplit(".", 1)[1]
        ctype = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}[ext]
        return self._send(200, f.read_bytes(), ctype, {"Cache-Control": "private, max-age=31536000, immutable"})

    def _events(self, sess):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        try:
            self.wfile.write(b":" + b" " * 4096 + b"\nretry: 3000\n\n")
            self.wfile.flush()
        except OSError:
            return
        c = Client(sess)
        with lock:
            clients.append(c)
            first = {"me": {"uid": sess["uid"], "dm": sess["dm"]}, "campaign": state["active"],
                     "docs": snapshot_for(sess)}
        try:
            self._sse("snapshot", first)
            while True:
                try:
                    kind, payload = c.q.get(timeout=10)
                    self._sse(kind, payload)
                except queue.Empty:
                    self._sse("ping", {})
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with lock:
                if c in clients:
                    clients.remove(c)

    def _sse(self, kind, payload):
        data = json.dumps(payload, ensure_ascii=False)
        self.wfile.write(f"event: {kind}\ndata: {data}\n\n".encode("utf-8"))
        self.wfile.flush()

    # -- POST
    def do_POST(self):
        route = self.path.split("?")[0]
        if route == "/api/upload":
            return self._upload()
        try:
            body = self._body()
        except Exception:  # noqa: BLE001
            return self._json(400, {"error": "Petició mal formada"})
        if route == "/api/join":
            return self._join(body)
        if route == "/api/write":
            return self._write(body)
        if route == "/api/campaigns":
            return self._campaigns(body)
        if route == "/api/roll":
            return self._roll(body)
        if route == "/api/ping":
            return self._ping(body)
        self._json(404, {"error": "No trobat"})

    def _join(self, body):
        name = str(body.get("name") or "").strip()[:40]
        pw = str(body.get("password") or "").strip()
        old_tok = str(body.get("token") or "")
        with lock:
            sess = state["sessions"].get(old_tok)
            if sess:
                tok = old_tok
            else:
                if not name:
                    return self._json(400, {"error": "Escriu el teu nom."})
                if pw and not secrets.compare_digest(pw.lower(), state["password"].lower()):
                    return self._json(403, {"error": "La contrasenya del màster no és correcta."})
                tok = secrets.token_urlsafe(24)
                sess = {"uid": "u" + secrets.token_hex(6), "dm": bool(pw)}
                state["sessions"][tok] = sess
            if name:
                state["users"][sess["uid"]] = name
            dirty.set()
        if name:
            broadcast(["users/" + sess["uid"]])
        return self._json(200, {"token": tok, "uid": sess["uid"], "dm": sess["dm"]})

    def _write(self, body):
        sess = self._session()
        if not sess:
            return self._json(401, {"error": "Sessió no vàlida. Torna a entrar."})
        path, mode, data = body.get("path"), body.get("mode"), body.get("data")
        if not valid_path(path) or mode not in ("set", "update", "delete"):
            return self._json(400, {"error": "Petició mal formada"})
        if mode != "delete" and not isinstance(data, dict):
            return self._json(400, {"error": "Petició mal formada"})
        if mode != "delete" and len(json.dumps(data)) > 600_000:
            return self._json(413, {"error": "Document massa gran"})
        with lock:
            if body.get("camp") and body.get("camp") != state["active"]:
                return self._json(409, {"error": "S'ha obert una altra partida."})
            if not can_write(path, mode, data, sess):
                return self._json(403, {"error": "No tens permís per a canviar això."})
            if seg(path)[0] == "users":
                merged = deep_merge(get_doc(path) or {}, data) if mode == "update" else data
                state["users"][sess["uid"]] = str(merged.get("name") or "")[:40]
            else:
                docs = state["docs"]
                if mode == "delete":
                    docs.pop(path, None)
                    if seg(path)[0] == "maps" and len(seg(path)) == 2:   # esborra també les fitxes del mapa
                        for k in [k for k in docs if k.startswith(path + "/")]:
                            docs.pop(k, None)
                elif mode == "set":
                    docs[path] = data
                else:
                    docs[path] = deep_merge(docs.get(path) or {}, data)
            dirty.set()
        broadcast([path])
        return self._json(200, {"ok": True})

    def _roll(self, body):
        sess = self._session()
        if not sess:
            return self._json(401, {"error": "Sessió no vàlida. Torna a entrar."})
        r = body.get("roll")
        if not isinstance(r, dict) or len(json.dumps(r)) > 4000:
            return self._json(400, {"error": "Petició mal formada"})
        r = dict(r)
        r["uid"] = sess["uid"]
        r["ts"] = int(time.time() * 1000)
        r["priv"] = bool(r.get("priv")) and sess["dm"]
        with lock:
            doc = state["docs"].setdefault("rolls/main", {"list": []})
            doc["list"] = ([r] + list(doc.get("list") or []))[:80]
            dirty.set()
        broadcast(["rolls/main"])
        return self._json(200, {"ok": True})

    def _ping(self, body):
        sess = self._session()
        if not sess:
            return self._json(401, {"error": "Sessió no vàlida. Torna a entrar."})
        try:
            p = {"x": float(body.get("x")), "y": float(body.get("y")), "map": str(body.get("map") or ""),
                 "uid": sess["uid"], "dm": sess["dm"]}
        except (TypeError, ValueError):
            return self._json(400, {"error": "Petició mal formada"})
        broadcast_event("ping", p)
        return self._json(200, {"ok": True})

    def _upload(self):
        sess = self._session()
        if not sess:
            return self._json(401, {"error": "Sessió no vàlida. Torna a entrar."})
        kind = (self._query().get("kind") or [""])[0]
        if kind not in ("map", "handout", "portrait"):
            return self._json(400, {"error": "Petició mal formada"})
        if kind != "portrait" and not sess["dm"]:
            return self._json(403, {"error": "No tens permís per a canviar això."})
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        ext = IMG_TYPES.get(ctype)
        if not ext:
            return self._json(415, {"error": "Només es poden pujar imatges JPG, PNG, WebP o GIF."})
        try:
            data = self._raw(MAX_UPLOAD)
        except ValueError:
            return self._json(413, {"error": "La imatge és massa gran (màxim 20 MB)."})
        if not data:
            return self._json(400, {"error": "Petició mal formada"})
        with lock:
            d = files_dir(state["active"])
            d.mkdir(parents=True, exist_ok=True)
            name = secrets.token_hex(12) + "." + ext
            (d / name).write_bytes(data)
        return self._json(200, {"file": name})

    def _campaigns(self, body):
        sess = self._session()
        if not sess:
            return self._json(401, {"error": "Sessió no vàlida. Torna a entrar."})
        if not sess["dm"]:
            return self._json(403, {"error": "Només el màster pot gestionar les partides."})
        action = body.get("action")
        name = str(body.get("name") or "").strip()[:80]
        cid = str(body.get("id") or "")
        if cid and not re.fullmatch(r"[a-z0-9-]{1,60}", cid):
            return self._json(400, {"error": "Partida desconeguda."})
        switched = False
        with lock:
            if action == "create":
                if not name:
                    return self._json(400, {"error": "Posa-li un nom a la partida."})
                save_now()
                activate(new_campaign(name))
                switched = True
            elif action == "switch":
                if not camp_file(cid).exists():
                    return self._json(404, {"error": "Aquesta partida ja no existeix."})
                if cid != state["active"]:
                    save_now()
                    activate(cid)
                    switched = True
            elif action == "duplicate":
                if not camp_file(cid).exists():
                    return self._json(404, {"error": "Aquesta partida ja no existeix."})
                save_now()
                docs = read_json(camp_file(cid)).get("docs", {})
                new_name = name or (camp_name(docs, cid) + " (còpia)")
                docs = dict(docs)
                docs["campaign/main"] = {**(docs.get("campaign/main") or {}), "name": new_name}
                new_id = slugify(new_name)
                write_json(camp_file(new_id), {"docs": docs})
                if files_dir(cid).exists():
                    shutil.copytree(files_dir(cid), files_dir(new_id))
            elif action == "delete":
                if cid == state["active"]:
                    return self._json(400, {"error": "No pots esborrar la partida oberta. Obri'n una altra primer."})
                if not camp_file(cid).exists():
                    return self._json(404, {"error": "Aquesta partida ja no existeix."})
                TRASH_DIR.mkdir(exist_ok=True)
                stamp = time.strftime("%Y%m%d-%H%M%S")
                camp_file(cid).replace(TRASH_DIR / f"{cid}-{stamp}.json")
                if files_dir(cid).exists():
                    files_dir(cid).replace(TRASH_DIR / f"{cid}-{stamp}-fitxers")
            elif action == "password":
                pw = str(body.get("password") or "").strip()
                if len(pw) < 3:
                    return self._json(400, {"error": "La contrasenya ha de tindre almenys 3 lletres."})
                state["password"] = pw[:40]
            else:
                return self._json(400, {"error": "Acció desconeguda."})
            dirty.set()
            result = {"active": state["active"], "list": list_campaigns(), "password": state["password"]}
        if switched:
            save_now()
            broadcast_event("campaign", {"id": state["active"]})
        return self._json(200, result)


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)):
            return
        super().handle_error(request, client_address)


def main():
    for name in ("stdout", "stderr"):  # l'executable de Windows no té terminal
        if getattr(sys, name) is None:
            setattr(sys, name, open(os.devnull, "w", encoding="utf-8"))
    for stream in (sys.stdout, sys.stderr):  # les consoles de Windows potser no parlen UTF-8
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            pass
    if os.name == "nt":
        os.system("")  # activa els colors ANSI de la consola de Windows (per al QR)
    ap = argparse.ArgumentParser(description="Servidor local del Quadern del Mestre")
    ap.add_argument("--port", type=int, default=8767)
    ap.add_argument("--contrasenya", default=os.environ.get("QUADERN_CONTRASENYA", ""),
                    help="contrasenya del màster (si no, se'n fa una i es recorda)")
    ap.add_argument("--partida", default="", help="nom de la partida que s'obri en arrancar (la crea si no existeix)")
    ap.add_argument("--dades", default=os.environ.get("QUADERN_DADES", ""),
                    help="carpeta on es guarden les partides (per defecte, al costat del programa, "
                         "o a la carpeta de l'usuari si està instal·lat)")
    ap.add_argument("--sense-finestra", action="store_true", help="no obri la finestra: només la terminal")
    ap.add_argument("--sense-navegador", action="store_true", help="no obri el navegador en arrancar")
    ap.add_argument("--sense-qr", action="store_true", help="no mostra el codi QR a la terminal")
    ap.add_argument("--idioma", choices=("ca", "es"), help="idioma de la finestra (per defecte, el del sistema)")
    a = ap.parse_args()
    if a.dades.strip():
        set_data_dir(a.dades.strip())
    amb_finestra = not a.sense_finestra and hi_ha_finestra()
    idioma = a.idioma or idioma_sistema()
    state["port"] = a.port
    try:
        srv = Server(("0.0.0.0", a.port), Handler)
    except OSError:
        print(f"\n  El port {a.port} ja està en ús: hi ha un altre programa (potser el Quadern ja obert) escoltant-hi.\n"
              f"  Tanca'l, o arranca en un altre port:   python3 quadern.py --port 9002\n")
        if amb_finestra:
            T = FINESTRA_TEXTOS[idioma]
            avis_finestra(T["port_t"], T["port_q"].format(p=a.port))
        sys.exit(1)
    load(a.partida.strip() or None, a.contrasenya.strip() or None)
    threading.Thread(target=saver, daemon=True).start()
    try:  # en apagar l'ordinador o tancar la sessió (Linux), es guarda igual que amb Ctrl+C
        import signal
        signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    except Exception:  # noqa: BLE001
        pass
    print(f"\n  Quadern del Mestre (versió {VERSION}) en marxa.\n")
    print(f"  En aquest ordinador:   http://localhost:{a.port}")
    urls = lan_urls()
    for u in urls:
        print(f"  Des de la xarxa:       {u}")
    print(f"\n  Contrasenya del màster: {state['password']}")
    if urls and not a.sense_qr and not amb_finestra:
        print("\n  Escaneja aquest codi amb el mòbil per a entrar:\n")
        try:
            print(qr_terminal(urls[0]))
        except Exception:  # noqa: BLE001
            pass
    print()
    print(f"  Partida oberta:         {camp_name(state['docs'], state['active'])}")
    print(f"  Partides guardades a:   {CAMP_DIR}")
    try:
        if amb_finestra:
            print("\n  Tanca la finestra del Quadern per a aturar-lo.\n")
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            finestra(srv, a.port, idioma, obrir_navegador=not a.sense_navegador)
            srv.shutdown()
        else:
            print("\n  Prem Ctrl+C per a aturar-lo" + (" o tanca aquesta finestra" if os.name == "nt" else "") + ".\n")
            if FROZEN and not a.sense_navegador:
                threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{a.port}")).start()
            srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        save_now()
        print("\n  Partida guardada. Fins la pròxima!\n")


# ---------------------------------------------------------------- pàgina web i compendi SRD (gzip + base64)
PAGE_BYTES = gzip.decompress(base64.b64decode("""
__PAGE__
"""))
SRD_GZ = base64.b64decode("""
__SRD__
""")
ICONA_PNG = "".join("""
__ICONA__
""".split())

if __name__ == "__main__":
    main()
