@echo off
echo ========================================
echo   Gestion des Surveillances - Startup
echo ========================================
echo.

REM Vérifier si Python est installé
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH
    echo Telechargez Python depuis https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe ou n'est pas dans le PATH
    echo Telechargez Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Python et Node.js sont installes
echo.

REM Demander le mode
echo Choisissez le mode de lancement:
echo [1] Mode Developpement (avec hot-reload)
echo [2] Installation des dependances
echo [3] Quitter
echo.
set /p choice="Votre choix (1-3): "

if "%choice%"=="1" goto dev_mode
if "%choice%"=="2" goto install
if "%choice%"=="3" goto end
goto end

:install
echo.
echo ========================================
echo   Installation des dependances
echo ========================================
echo.

echo [1/4] Installation Backend Python...
cd backend
if not exist "venv" (
    echo Creation de l'environnement virtuel...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo.
echo [2/4] Installation Frontend...
cd frontend
call npm install
cd ..

echo.
echo [OK] Installation terminee !
echo.
echo Lancez le script a nouveau et choisissez "Mode Developpement"
pause
goto end

:dev_mode
echo.
echo ========================================
echo   Demarrage en mode developpement
echo ========================================
echo.

REM Vérifier que les dépendances sont installées
if not exist "backend\venv\" (
    echo [ERREUR] Backend non installe. Choisissez d'abord l'option 2.
    pause
    exit /b 1
)

if not exist "frontend\node_modules\" (
    echo [ERREUR] Frontend non installe. Choisissez d'abord l'option 2.
    pause
    exit /b 1
)

echo [1/2] Demarrage du Backend Python sur http://localhost:8000
start "Backend API" cmd /k "cd backend && venv\Scripts\activate.bat && python main.py"

timeout /t 3 >nul

echo [2/2] Demarrage du Frontend Electron...
cd frontend
start "Frontend Dev" cmd /k "npm run dev"
timeout /t 5 >nul
start "Electron App" cmd /k "electron ."
cd ..

echo.
echo ========================================
echo   Application demarree avec succes !
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo Documentation: http://localhost:8000/api/docs
echo Frontend: http://localhost:5173
echo.
echo Appuyez sur une touche pour fermer cette fenetre
echo (Les autres fenetres resteront ouvertes)
pause >nul
goto end

:end
exit /b 0
