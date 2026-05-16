@echo off
cd /d "%~dp0"
echo Starting portfolio at http://127.0.0.1:5173/index.html
echo.
start "" "http://127.0.0.1:5173/index.html"
"D:\NodeJs\node.exe" tools\local-server.cjs 5173 127.0.0.1
pause
