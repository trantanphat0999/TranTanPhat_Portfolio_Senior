@echo off
cd /d "%~dp0"
call npm run admin:local
if errorlevel 1 pause
