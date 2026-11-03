@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instala Node.js 24.x desde https://nodejs.org y vuelve a ejecutar este archivo.
 pause
 exit /b 1
)
if not exist .env copy .env.example .env >nul
node --env-file-if-exists=.env server/index.mjs
pause
