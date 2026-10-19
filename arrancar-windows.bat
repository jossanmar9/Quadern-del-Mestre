@echo off
rem Quadern del Mestre - doble clic per a arrancar el servidor (si no fas servir QuadernDelMestre.exe).
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 quadern.py
) else (
  python quadern.py
)
echo.
pause
