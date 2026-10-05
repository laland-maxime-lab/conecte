@echo off
title Connect Pro - Bureau a Distance
echo ========================================================
echo   Lancement de Connect Pro - Controle a Distance P2P
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas detecte sur cet ordinateur.
    echo Telechargez et installez Node.js depuis https://nodejs.org
    echo Puis relancez ce fichier.
    pause
    exit /b
)

if not exist "node_modules" (
    echo Premier lancement detecte. Installation des dependances...
    call npm install
)

echo.
echo [OK] Demarrage du serveur Connect Pro...
echo Accessible en local sur : http://localhost:3000
echo.
call npm run dev
pause
