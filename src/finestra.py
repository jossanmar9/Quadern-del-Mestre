# ---------------------------------------------------------------- finestra (Windows i Linux)
# Una finestreta amb l'adreça, el QR i la contrasenya del màster. Mentre està oberta, el servidor
# funciona; en tancar-la, es guarda tot i s'atura. Si no hi ha tkinter o pantalla, es fa servir la terminal.

FINESTRA_TEXTOS = {
    "ca": {
        "en_marxa": "En marxa · versió {v}",
        "entrar": "Per a entrar des d'un altre aparell",
        "escaneja": "Escaneja el codi amb la càmera del mòbil, o escriu l'adreça al navegador. "
                    "Cal estar a la mateixa wifi que aquest ordinador.",
        "sense_xarxa": "No s'ha trobat cap xarxa. Connecta aquest ordinador a la wifi i torna a obrir el programa.",
        "altres": "També: {u}",
        "contrasenya": "Contrasenya del màster",
        "partida": "Partida oberta",
        "copiar": "Copiar", "copiat": "Copiat",
        "navegador": "Obrir al navegador",
        "carpeta": "Carpeta de partides",
        "aturar": "Aturar",
        "peu": "Mentre aquesta finestra estiga oberta, el Quadern funciona.",
        "tancar_t": "Aturar el Quadern",
        "tancar_q": "Es guardarà tot i els jugadors es desconnectaran. Vols aturar-lo?",
        "port_t": "El port ja està en ús",
        "port_q": "El port {p} ja l'està fent servir un altre programa (potser el Quadern ja està obert).\n\n"
                  "Tanca'l, o arranca el Quadern amb un altre port: --port 9002",
    },
    "es": {
        "en_marxa": "En marcha · versión {v}",
        "entrar": "Para entrar desde otro dispositivo",
        "escaneja": "Escanea el código con la cámara del móvil, o escribe la dirección en el navegador. "
                    "Hay que estar en la misma wifi que este ordenador.",
        "sense_xarxa": "No se ha encontrado ninguna red. Conecta este ordenador a la wifi y vuelve a abrir el programa.",
        "altres": "También: {u}",
        "contrasenya": "Contraseña del máster",
        "partida": "Partida abierta",
        "copiar": "Copiar", "copiat": "Copiado",
        "navegador": "Abrir en el navegador",
        "carpeta": "Carpeta de partidas",
        "aturar": "Detener",
        "peu": "Mientras esta ventana esté abierta, el Quadern funciona.",
        "tancar_t": "Detener el Quadern",
        "tancar_q": "Se guardará todo y los jugadores se desconectarán. ¿Quieres detenerlo?",
        "port_t": "El puerto ya está en uso",
        "port_q": "El puerto {p} ya lo está usando otro programa (quizá el Quadern ya está abierto).\n\n"
                  "Ciérralo, o arranca el Quadern con otro puerto: --port 9002",
    },
}


def idioma_sistema():
    """«es» si el sistema està en castellà; si no, valencià."""
    if os.name == "nt":
        try:
            import ctypes
            return "es" if ctypes.windll.kernel32.GetUserDefaultUILanguage() & 0x3FF == 0x0A else "ca"
        except Exception:  # noqa: BLE001
            pass
    for var in ("LC_ALL", "LC_MESSAGES", "LANGUAGE", "LANG"):
        val = os.environ.get(var, "")
        if val:
            return "es" if val.lower().startswith("es") else "ca"
    return "ca"


def hi_ha_finestra():
    """Hi ha tkinter i una pantalla on mostrar la finestra?"""
    if os.name != "nt" and sys.platform != "darwin" and not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        return False
    try:
        import tkinter  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


def avis_finestra(titol, text):
    """Un missatge d'error en una finestra (per a l'executable de Windows, que no té terminal)."""
    try:
        import tkinter as tk
        from tkinter import messagebox
        r = tk.Tk()
        r.withdraw()
        messagebox.showerror(titol, text)
        r.destroy()
    except Exception:  # noqa: BLE001
        pass


def obrir_carpeta(path):
    try:
        if os.name == "nt":
            os.startfile(str(path))  # noqa: S606
        else:
            import subprocess
            subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", str(path)])
    except Exception:  # noqa: BLE001
        pass


def finestra(srv, port, idioma, obrir_navegador):
    import tkinter as tk
    import tkinter.font as tkfont
    from tkinter import messagebox

    T = FINESTRA_TEXTOS[idioma]
    local = f"http://localhost:{port}"
    urls = lan_urls()

    root = tk.Tk(className="quadern-del-mestre")   # a Linux, lliga la finestra amb l'accés del menú
    root.title("Quadern del Mestre")
    root.resizable(False, False)
    try:
        root.iconphoto(True, tk.PhotoImage(data=ICONA_PNG))
    except Exception:  # noqa: BLE001
        pass

    # Colors i lletres del pergamí de l'app
    paper, carta, tinta, suau, linia, roig, or_, verd = ("#E9DCBC", "#F4EAD2", "#2A1C10", "#6F5A40",
                                                          "#C4AB80", "#8C2A1C", "#A27419", "#3E6A36")
    fams = set(tkfont.families(root))
    serif = next((f for f in ("Georgia", "Alegreya", "DejaVu Serif", "Liberation Serif", "Noto Serif",
                              "Times New Roman") if f in fams), "serif")
    F = lambda mida, gruix="normal": (serif, mida, gruix)  # noqa: E731
    root.configure(bg=paper)

    def boto(pare, text, ordre, principal=False):
        b = tk.Button(pare, text=text, command=ordre, font=F(11, "bold" if principal else "normal"),
                      bg=roig if principal else carta, fg="#FBEFDA" if principal else tinta,
                      activebackground="#A33A2A" if principal else paper,
                      activeforeground="#FBEFDA" if principal else tinta,
                      relief="flat", bd=0, highlightthickness=1, highlightbackground=roig if principal else linia,
                      padx=14, pady=7, cursor="hand2")
        return b

    def copiar(text, b):
        root.clipboard_clear()
        root.clipboard_append(text)
        b.configure(text=T["copiat"])
        root.after(1500, lambda: b.configure(text=T["copiar"]))

    cos = tk.Frame(root, bg=paper, padx=22, pady=18)
    cos.pack(fill="both")

    # Capçalera
    cap = tk.Frame(cos, bg=paper)
    cap.pack(fill="x")
    try:
        logo = tk.PhotoImage(data=ICONA_PNG).subsample(2)
        tk.Label(cap, image=logo, bg=paper).pack(side="left", padx=(0, 12))
        cap.logo = logo
    except Exception:  # noqa: BLE001
        pass
    tit = tk.Frame(cap, bg=paper)
    tit.pack(side="left", fill="x")
    tk.Label(tit, text="Quadern del Mestre", font=F(19), fg=tinta, bg=paper).pack(anchor="w")
    estat = tk.Frame(tit, bg=paper)
    estat.pack(anchor="w")
    tk.Label(estat, text="●", font=F(11), fg=verd, bg=paper).pack(side="left")
    tk.Label(estat, text=" " + T["en_marxa"].format(v=VERSION), font=F(11), fg=suau, bg=paper).pack(side="left")

    # Targeta amb l'adreça i el QR
    carta_f = tk.Frame(cos, bg=carta, highlightthickness=1, highlightbackground=linia, padx=16, pady=14)
    carta_f.pack(fill="x", pady=(16, 10))
    tk.Label(carta_f, text=T["entrar"].upper(), font=F(9, "bold"), fg=or_, bg=carta).pack(anchor="w")
    if urls:
        fila = tk.Frame(carta_f, bg=carta)
        fila.pack(fill="x", pady=(6, 8))
        tk.Label(fila, text=urls[0], font=F(15, "bold"), fg=tinta, bg=carta).pack(side="left")
        bc = boto(fila, T["copiar"], lambda: copiar(urls[0], bc))
        bc.configure(padx=10, pady=3, font=F(10))
        bc.pack(side="right")
        m = qr_matrix(urls[0])
        n = len(m) + 8
        cel = max(3, 196 // n)
        qr = tk.Canvas(carta_f, width=n * cel, height=n * cel, bg="#FFFFFF", highlightthickness=0)
        for y, row in enumerate(m):
            for x, v in enumerate(row):
                if v:
                    qr.create_rectangle((x + 4) * cel, (y + 4) * cel, (x + 5) * cel, (y + 5) * cel, fill="#000000", width=0)
        qr.pack(pady=(2, 8))
        tk.Label(carta_f, text=T["escaneja"], font=F(10), fg=suau, bg=carta, wraplength=380, justify="left").pack(anchor="w")
        if len(urls) > 1:
            tk.Label(carta_f, text=T["altres"].format(u=", ".join(urls[1:])), font=F(9), fg=suau, bg=carta,
                     wraplength=380, justify="left").pack(anchor="w", pady=(4, 0))
    else:
        tk.Label(carta_f, text=T["sense_xarxa"], font=F(11), fg=roig, bg=carta, wraplength=380,
                 justify="left").pack(anchor="w", pady=(6, 0))

    # Contrasenya i partida
    def dada(etiqueta, valor_var, copiable=False):
        f = tk.Frame(cos, bg=paper)
        f.pack(fill="x", pady=3)
        tk.Label(f, text=etiqueta, font=F(11), fg=suau, bg=paper).pack(side="left")
        if copiable:
            b = boto(f, T["copiar"], lambda: copiar(valor_var.get(), b))
            b.configure(padx=10, pady=2, font=F(10))
            b.pack(side="right")
        tk.Label(f, textvariable=valor_var, font=F(12, "bold"), fg=tinta, bg=paper).pack(side="right", padx=8)

    contrasenya = tk.StringVar(value=state["password"])
    partida = tk.StringVar(value=camp_name(state["docs"], state["active"]))
    dada(T["contrasenya"], contrasenya, copiable=True)
    dada(T["partida"], partida)

    # Botons
    botons = tk.Frame(cos, bg=paper)
    botons.pack(fill="x", pady=(14, 6))

    def aturar():
        if not messagebox.askokcancel(T["tancar_t"], T["tancar_q"], parent=root):
            return
        root.destroy()

    boto(botons, T["navegador"], lambda: webbrowser.open(local), principal=True).pack(side="left")
    boto(botons, T["carpeta"], lambda: obrir_carpeta(CAMP_DIR)).pack(side="left", padx=8)
    boto(botons, T["aturar"], aturar).pack(side="right")
    tk.Label(cos, text=T["peu"], font=F(9), fg=suau, bg=paper).pack(anchor="w", pady=(8, 0))

    def refresca():
        with lock:
            contrasenya.set(state["password"])
            partida.set(camp_name(state["docs"], state["active"]))
        root.after(2000, refresca)

    root.protocol("WM_DELETE_WINDOW", aturar)
    root.after(2000, refresca)
    if obrir_navegador:
        root.after(800, lambda: webbrowser.open(local))
    root.update_idletasks()
    w, h = root.winfo_reqwidth(), root.winfo_reqheight()
    root.geometry(f"+{max(0, (root.winfo_screenwidth() - w) // 2)}+{max(0, (root.winfo_screenheight() - h) // 3)}")
    root.mainloop()
