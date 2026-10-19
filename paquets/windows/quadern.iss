; Instal·lador de Windows del Quadern del Mestre (Inno Setup 6).
; El fa GitHub en publicar una versió (.github/workflows/publica.yml):
;   ISCC /DVersio=1.1 /DOrigen=..\..\dist\QuadernDelMestre paquets\windows\quadern.iss
; Origen és la carpeta de PyInstaller (QuadernDelMestre.exe i _internal) amb el fitxer «installat»,
; que fa que les partides es guarden a %APPDATA%\QuadernDelMestre.
; Llicència GPL-3.0-or-later.

#ifndef Versio
  #define Versio "0.0"
#endif
#ifndef Origen
  #define Origen "..\..\dist\QuadernDelMestre"
#endif

[Setup]
AppId={{3DFD24D4-C409-487B-845F-2D1C1148B003}
AppName=Quadern del Mestre
AppVersion={#Versio}
AppVerName=Quadern del Mestre {#Versio}
AppPublisher=Quadern del Mestre
AppPublisherURL=https://jossanmar9.github.io/quadern-del-mestre/
AppSupportURL=https://github.com/jossanmar9/quadern-del-mestre/issues
AppUpdatesURL=https://github.com/jossanmar9/quadern-del-mestre/releases
DefaultDirName={localappdata}\Programs\QuadernDelMestre
DefaultGroupName=Quadern del Mestre
DisableProgramGroupPage=yes
DisableDirPage=auto
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\..\dist
OutputBaseFilename=QuadernDelMestre-{#Versio}-installador
SetupIconFile=..\..\logo.ico
UninstallDisplayIcon={app}\QuadernDelMestre.exe
UninstallDisplayName=Quadern del Mestre
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes

[Languages]
Name: "ca"; MessagesFile: "compiler:Languages\Catalan.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[CustomMessages]
ca.Manual=Manual d'usuari
es.Manual=Manual de usuario
ca.Partides=Carpeta de partides
es.Partides=Carpeta de partidas

[Tasks]
Name: "escriptori"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#Origen}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Dirs]
Name: "{userappdata}\QuadernDelMestre"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\Quadern del Mestre"; Filename: "{app}\QuadernDelMestre.exe"
Name: "{autodesktop}\Quadern del Mestre"; Filename: "{app}\QuadernDelMestre.exe"; Tasks: escriptori
Name: "{group}\{cm:Manual}"; Filename: "{app}\docs\manual-usuari.pdf"; Languages: ca; Check: FileExists(ExpandConstant('{app}\docs\manual-usuari.pdf'))
Name: "{group}\{cm:Manual}"; Filename: "{app}\docs\manual-usuario.pdf"; Languages: es; Check: FileExists(ExpandConstant('{app}\docs\manual-usuario.pdf'))
Name: "{group}\{cm:Partides}"; Filename: "{userappdata}\QuadernDelMestre"

[Run]
Filename: "{app}\QuadernDelMestre.exe"; Description: "{cm:LaunchProgram,Quadern del Mestre}"; Flags: nowait postinstall skipifsilent
