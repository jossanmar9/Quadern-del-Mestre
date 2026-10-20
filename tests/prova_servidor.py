#!/usr/bin/env python3
"""Proves automàtiques del servidor del Quadern del Mestre (sense dependències).

Arranca quadern.py en una carpeta temporal i comprova, com ho faria un navegador, que:
- els jugadors no reben res secret (fitxes amagades, boira, PG dels monstres, notes del màster…);
- els jugadors només poden canviar el que és seu;
- exportar, importar, les còpies de seguretat i restaurar funcionen;
- la boira automàtica revela el que veuen els personatges, i no a través de les parets.

Ús:  python3 build.py && python3 tests/prova_servidor.py
"""
import io
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PW = "drac123"


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Servidor:
    def __init__(self):
        self.dir = Path(tempfile.mkdtemp(prefix="quadern-prova-"))
        self.port = free_port()
        self.proc = subprocess.Popen(
            [sys.executable, str(ROOT / "quadern.py"), "--sense-finestra", "--sense-navegador", "--sense-qr",
             "--port", str(self.port), "--dades", str(self.dir), "--contrasenya", PW, "--partida", "Prova"],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            try:
                self.get("/api/hello")
                return
            except OSError:
                time.sleep(.1)
        raise RuntimeError("El servidor no arranca: " + self.proc.stderr.read().decode(errors="replace"))

    def stop(self):
        self.proc.terminate()
        try:
            self.proc.wait(10)
        except subprocess.TimeoutExpired:
            self.proc.kill()
        shutil.rmtree(self.dir, ignore_errors=True)

    def req(self, path, body=None, tok=None, raw=None, ctype="application/json"):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        r = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method="POST" if data is not None else "GET")
        if data is not None:
            r.add_header("Content-Type", ctype)
        if tok:
            r.add_header("X-Quadern-Token", tok)
        try:
            with urllib.request.urlopen(r, timeout=20) as resp:
                blob = resp.read()
                return resp.status, (json.loads(blob) if resp.headers.get_content_type() == "application/json" else blob)
        except urllib.error.HTTPError as e:
            blob = e.read()
            try:
                return e.code, json.loads(blob)
            except ValueError:
                return e.code, blob

    def get(self, path, tok=None):
        return self.req(path, tok=tok)

    def join(self, name, pw=None):
        st, d = self.req("/api/join", {"name": name, **({"password": pw} if pw else {})})
        assert st == 200, d
        return d["token"], d["uid"]

    def write(self, tok, path, data, mode="set"):
        return self.req("/api/write", {"path": path, "mode": mode, "data": data}, tok)[0]

    def snap(self, tok):
        st, d = self.get("/api/snapshot", tok)
        assert st == 200, d
        return d["docs"]


class Proves(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (ROOT / "quadern.py").exists():
            raise SystemExit("Falta quadern.py: executa primer python3 build.py")
        cls.s = Servidor()
        cls.dm, cls.dm_uid = cls.s.join("Màster", PW)
        cls.pj, cls.pj_uid = cls.s.join("Jugadora")
        cls.altre, cls.altre_uid = cls.s.join("Altre")

    @classmethod
    def tearDownClass(cls):
        cls.s.stop()

    # ---------------------------------------------------------------- entrada
    def test_contrasenya_dolenta(self):
        st, d = self.s.req("/api/join", {"name": "Intrús", "password": "no"})
        self.assertEqual(st, 403)

    def test_sense_sessio(self):
        self.assertEqual(self.s.get("/api/snapshot")[0], 401)
        self.assertEqual(self.s.get("/api/export?id=prova")[0], 401)

    # ---------------------------------------------------------------- el que no ha de veure un jugador
    def test_secrets_del_master(self):
        s = self.s
        self.assertEqual(s.write(self.dm, "dmnotes/n1", {"title": "Secret", "body": "El rei és un vampir"}), 200)
        self.assertEqual(s.write(self.dm, "handouts/h1", {"title": "Carta", "shown": False}), 200)
        self.assertEqual(s.write(self.dm, "handouts/h2", {"title": "Només per a l'altre", "shown": True, "to": [self.altre_uid]}), 200)
        self.assertEqual(s.write(self.dm, "characters/pnj", {"name": "Espia", "npc": True, "secret": True, "ownerId": self.dm_uid}), 200)
        docs = s.snap(self.pj)
        for p in ("dmnotes/n1", "handouts/h1", "handouts/h2", "characters/pnj"):
            self.assertNotIn(p, docs, p)
        self.assertIn("handouts/h2", s.snap(self.altre))
        self.assertIn("dmnotes/n1", s.snap(self.dm))

    def test_pg_dels_monstres(self):
        s = self.s
        s.write(self.dm, "combat/main", {"active": True, "round": 1, "turn": 0, "list": [
            {"id": "a", "name": "Zombi", "kind": "npc", "hp": 3, "maxHp": 15, "ac": 8, "notes": "x"},
            {"id": "b", "name": "Ocult", "kind": "npc", "hp": 9, "maxHp": 9, "hidden": True}]})
        lst = s.snap(self.pj)["combat/main"]["list"]
        self.assertEqual([r["name"] for r in lst], ["Zombi"])
        self.assertNotIn("hp", lst[0])
        self.assertNotIn("ac", lst[0])
        self.assertEqual(lst[0]["state"], "critical")

    def test_boira_i_fitxes_amagades(self):
        s = self.s
        s.write(self.dm, "maps/m1", {"name": "Cova", "cols": 10, "rows": 10, "tiles": {"1,1": "stone", "8,8": "stone"},
                                     "labels": [{"x": 8, "y": 8, "text": "Tresor", "kind": "text"}],
                                     "walls": {"8,8,n": "secret"}, "fog": {"on": True, "rev": {"1,1": 1}}})
        s.write(self.dm, "campaign/main", {"activeMap": "m1"}, "update")
        s.write(self.dm, "maps/m1/tokens/t1", {"x": 1, "y": 1, "name": "Visible"})
        s.write(self.dm, "maps/m1/tokens/t2", {"x": 8, "y": 8, "name": "Sota la boira"})
        s.write(self.dm, "maps/m1/tokens/t3", {"x": 1, "y": 1, "name": "Amagada", "hidden": True})
        docs = s.snap(self.pj)
        self.assertIn("maps/m1/tokens/t1", docs)
        self.assertNotIn("maps/m1/tokens/t2", docs)
        self.assertNotIn("maps/m1/tokens/t3", docs)
        mp = docs["maps/m1"]
        self.assertEqual(mp["tiles"], {"1,1": "stone"})
        self.assertEqual(mp["labels"], [])
        # i una porta secreta revelada es veu com a paret
        s.write(self.dm, "maps/m1", {"fog": {"rev": {"8,8": 1}}}, "update")
        self.assertEqual(s.snap(self.pj)["maps/m1"]["walls"], {"8,8,n": "wall"})
        # un mapa que no s'ensenya no l'envia
        s.write(self.dm, "maps/m2", {"name": "Secret", "cols": 5, "rows": 5})
        self.assertNotIn("maps/m2", s.snap(self.pj))

    def test_tirades_secretes(self):
        s = self.s
        s.req("/api/roll", {"roll": {"label": "Secreta", "total": 20, "priv": True}}, self.dm)
        s.req("/api/roll", {"roll": {"label": "Pública", "total": 3}}, self.dm)
        labels = [r["label"] for r in s.snap(self.pj)["rolls/main"]["list"]]
        self.assertIn("Pública", labels)
        self.assertNotIn("Secreta", labels)

    # ---------------------------------------------------------------- permisos dels jugadors
    def test_permisos(self):
        s = self.s
        self.assertEqual(s.write(self.pj, "characters/meu", {"name": "Aina", "ownerId": self.pj_uid}), 200)
        self.assertEqual(s.write(self.altre, "characters/meu", {"name": "Robada"}, "update"), 403)
        self.assertEqual(s.write(self.pj, "characters/meu", {"secret": True}, "update"), 403)
        self.assertEqual(s.write(self.pj, "characters/nou", {"name": "D'un altre", "ownerId": self.altre_uid}), 403)
        self.assertEqual(s.write(self.pj, "combat/main", {"list": []}), 403)
        self.assertEqual(s.write(self.pj, "dmnotes/x", {"title": "x"}), 403)
        self.assertEqual(s.write(self.pj, "maps/m1", {"fog": {"on": False}}, "update"), 403)
        self.assertEqual(s.req("/api/campaigns", {"action": "create", "name": "x"}, self.pj)[0], 403)
        self.assertEqual(s.get("/api/export?id=prova", self.pj)[0], 403)

    def test_moure_la_seua_fitxa(self):
        s = self.s
        s.write(self.dm, "maps/m3", {"name": "Pont", "cols": 10, "rows": 10})
        s.write(self.dm, "campaign/main", {"activeMap": "m3"}, "update")
        s.write(self.pj, "characters/c1", {"name": "Aina", "ownerId": self.pj_uid})
        s.write(self.dm, "maps/m3/tokens/a", {"x": 1, "y": 1, "charId": "c1", "name": "Aina"})
        s.write(self.dm, "maps/m3/tokens/b", {"x": 2, "y": 2, "name": "Llop"})
        self.assertEqual(s.write(self.pj, "maps/m3/tokens/a", {"x": 3, "y": 4}, "update"), 200)
        self.assertEqual(s.write(self.pj, "maps/m3/tokens/a", {"name": "Altre nom"}, "update"), 403)
        self.assertEqual(s.write(self.pj, "maps/m3/tokens/b", {"x": 5, "y": 5}, "update"), 403)
        self.assertEqual(s.write(self.altre, "maps/m3/tokens/a", {"x": 0, "y": 0}, "update"), 403)

    # ---------------------------------------------------------------- boira automàtica
    def test_visio(self):
        s = self.s
        # Dues sales separades per una paret amb una porta tancada a (5,2)
        walls = {f"5,{y},w": "wall" for y in range(5)}
        walls["5,2,w"] = "door"
        s.write(self.dm, "maps/v", {"name": "Visió", "cols": 10, "rows": 5, "units": 1.5, "walls": walls, "tiles": {},
                                    "fog": {"on": True, "auto": True, "dist": 9, "rev": {}}})
        s.write(self.dm, "campaign/main", {"activeMap": "v"}, "update")
        s.write(self.pj, "characters/ull", {"name": "Exploradora", "ownerId": self.pj_uid})
        s.write(self.dm, "maps/v/tokens/e", {"x": 1, "y": 2, "charId": "ull", "name": "Exploradora"})
        rev = s.snap(self.dm)["maps/v"]["fog"]["rev"]
        self.assertTrue(rev.get("4,2"), "veu la seua sala")
        self.assertTrue(rev.get("0,0"), "veu les cantonades de la sala")
        self.assertFalse(rev.get("6,2"), "no veu a través de la porta tancada")
        self.assertFalse(rev.get("8,0"))
        # obri la porta: ara veu l'altra sala per la porta
        s.write(self.dm, "maps/v", {"walls": {"5,2,w": "open"}}, "update")
        rev = s.snap(self.dm)["maps/v"]["fog"]["rev"]
        self.assertTrue(rev.get("6,2"))
        self.assertTrue(rev.get("7,2"))
        # la distància de visió (9 m = 6 caselles) talla
        self.assertFalse(rev.get("8,2") and rev.get("9,2"))
        # un PNJ no revela res
        s.write(self.dm, "characters/pnj2", {"name": "Guia", "npc": True, "ownerId": self.dm_uid})
        s.write(self.dm, "maps/v/tokens/g", {"x": 9, "y": 4, "charId": "pnj2", "name": "Guia"})
        self.assertFalse(s.snap(self.dm)["maps/v"]["fog"]["rev"].get("9,4"))
        # el jugador també ho veu revelat
        self.assertIn("6,2", s.snap(self.pj)["maps/v"]["fog"]["rev"])

    # ---------------------------------------------------------------- partides: exportar, importar i còpies
    def test_exportar_i_importar(self):
        s = self.s
        s.write(self.dm, "journal/j1", {"title": "Sessió 1", "ownerId": self.dm_uid})
        st, img = s.req("/api/upload?kind=map", raw=b"\x89PNG\r\n\x1a\n" + b"0" * 100, tok=self.dm, ctype="image/png")
        self.assertEqual(st, 200, img)
        s.write(self.dm, "maps/fons", {"name": "Amb fons", "cols": 5, "rows": 5, "bg": {"file": img["file"]}})
        st, lst = s.get("/api/campaigns", self.dm)
        cid = lst["active"]
        st, blob = s.get(f"/api/export?id={cid}", self.dm)
        self.assertEqual(st, 200)
        z = zipfile.ZipFile(io.BytesIO(blob))
        self.assertIn("partida.json", z.namelist())
        self.assertIn("fitxers/" + img["file"], z.namelist())
        info = json.loads(z.read("partida.json"))
        self.assertEqual(info["format"], "quadern-del-mestre")
        self.assertIn("journal/j1", info["docs"])
        # importar-la crea una partida nova amb el mateix contingut i les imatges
        self.assertEqual(s.req("/api/import", raw=blob, tok=self.pj, ctype="application/zip")[0], 403)
        st, d = s.req("/api/import", raw=blob, tok=self.dm, ctype="application/zip")
        self.assertEqual(st, 200, d)
        new = d["imported"]
        self.assertNotEqual(new, cid)
        self.assertTrue(any(c["id"] == new and "(importada)" in c["name"] for c in d["list"]))
        self.assertTrue((s.dir / "partides" / f"{new}-fitxers" / img["file"]).exists())
        docs = json.loads((s.dir / "partides" / f"{new}.json").read_text(encoding="utf-8"))["docs"]
        self.assertIn("journal/j1", docs)
        # un fitxer qualsevol no s'importa
        st, d = s.req("/api/import", raw=b"no soc un zip", tok=self.dm, ctype="application/zip")
        self.assertEqual(st, 400)
        zb = io.BytesIO()
        with zipfile.ZipFile(zb, "w") as zz:
            zz.writestr("partida.json", json.dumps({"docs": {"../../fora": {}}}))
        self.assertEqual(s.req("/api/import", raw=zb.getvalue(), tok=self.dm, ctype="application/zip")[0], 400)

    def test_copies_i_restaurar(self):
        s = self.s
        cid = s.get("/api/campaigns", self.dm)[1]["active"]
        s.write(self.dm, "dmnotes/abans", {"title": "Abans de la còpia"})
        # en obrir una partida amb contingut se'n fa una còpia (una de buida, no)
        st, d = s.req("/api/campaigns", {"action": "create", "name": "Una altra"}, self.dm)
        other = d["active"]
        self.assertEqual(s.req("/api/campaigns", {"action": "backups", "id": other}, self.dm)[1]["list"], [])
        s.req("/api/campaigns", {"action": "switch", "id": cid}, self.dm)
        st, d = s.req("/api/campaigns", {"action": "backups", "id": cid}, self.dm)
        self.assertEqual(st, 200)
        self.assertTrue(any(b["reason"] == "obrir" for b in d["list"]), "en obrir la partida es fa una còpia")
        st, d = s.req("/api/campaigns", {"action": "backup", "id": cid}, self.dm)
        self.assertEqual(st, 200)
        bid = d["list"][0]["id"]
        self.assertTrue(bid.endswith("-ma"))
        s.write(self.dm, "dmnotes/despres", {"title": "Després de la còpia"})
        st, d = s.req("/api/campaigns", {"action": "restore", "id": cid, "backup": bid}, self.dm)
        self.assertEqual(st, 200, d)
        docs = s.snap(self.dm)
        self.assertIn("dmnotes/abans", docs)
        self.assertNotIn("dmnotes/despres", docs)
        # el que hi havia abans de restaurar també es guarda
        lst = s.req("/api/campaigns", {"action": "backups", "id": cid}, self.dm)[1]["list"]
        self.assertTrue(any(b["reason"] == "abans" for b in lst))
        self.assertEqual(s.req("/api/campaigns", {"action": "restore", "id": cid, "backup": "../x"}, self.dm)[0], 404)
        self.assertEqual(s.req("/api/campaigns", {"action": "backups", "id": cid}, self.pj)[0], 403)

    # ---------------------------------------------------------------- llapis i música
    def test_llapis(self):
        st, _ = self.s.req("/api/draw", {"map": "m1", "pts": [[1, 1], [2, 2]], "col": "#8C2A1C"}, self.pj)
        self.assertEqual(st, 200)
        self.assertEqual(self.s.req("/api/draw", {"map": "m1", "pts": [[1, 1]]}, self.pj)[0], 400)

    def test_musica_nomes_del_master(self):
        s = self.s
        self.assertEqual(s.req("/api/upload?kind=audio", raw=b"ID3" + b"0" * 50, tok=self.pj, ctype="audio/mpeg")[0], 403)
        st, d = s.req("/api/upload?kind=audio", raw=b"ID3" + b"0" * 50, tok=self.dm, ctype="audio/mpeg")
        self.assertEqual(st, 200, d)
        self.assertTrue(d["file"].endswith(".mp3"))
        self.assertEqual(s.get("/fitxer/" + d["file"], self.dm)[0], 200)
        self.assertEqual(s.get("/fitxer/" + d["file"], self.pj)[0], 404)
        self.assertEqual(s.req("/api/upload?kind=audio", raw=b"x", tok=self.dm, ctype="image/png")[0], 415)


if __name__ == "__main__":
    unittest.main(verbosity=2)
