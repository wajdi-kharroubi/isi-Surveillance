# Script PowerShell pour build complet de l'application
# Executer toutes les etapes automatiquement

Write-Host "=== Build de l'Application Gestion Surveillances ===" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que nous sommes dans le bon repertoire
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "[ERREUR] Ce script doit etre execute depuis la racine du projet" -ForegroundColor Red
    exit 1
}

# Etape 1: Creer l'icone
Write-Host "[1/4] Creation de l'icone..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "scripts")) {
    New-Item -ItemType Directory -Path "scripts" | Out-Null
}

python scripts/create_icon.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ATTENTION] Erreur lors de la creation de l'icone" -ForegroundColor Yellow
    Write-Host "   L'application sera construite sans icone personnalisee" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Icone creee avec succes!" -ForegroundColor Green
}

Write-Host ""
Start-Sleep -Seconds 2

# Etape 2: Build du backend Python
Write-Host "[2/4] Compilation du backend Python..." -ForegroundColor Yellow
Write-Host ""

Set-Location backend

# Installer PyInstaller si necessaire
Write-Host "   Installation de PyInstaller..." -ForegroundColor Gray
pip install pyinstaller 2>&1 | Out-Null

Write-Host "   Compilation en cours (cela peut prendre quelques minutes)..." -ForegroundColor Gray
pyinstaller build_backend.spec --clean --noconfirm

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERREUR] Erreur lors de la compilation du backend" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "[OK] Backend compile avec succes!" -ForegroundColor Green
Set-Location ..

Write-Host ""
Start-Sleep -Seconds 2

# Etape 3: Build du frontend React
Write-Host "[3/4] Build du frontend React..." -ForegroundColor Yellow
Write-Host ""

Set-Location frontend

Write-Host "   Installation des dependances..." -ForegroundColor Gray
npm install

Write-Host "   Build de l'application React..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERREUR] Erreur lors du build du frontend" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "[OK] Frontend compile avec succes!" -ForegroundColor Green

Write-Host ""
Start-Sleep -Seconds 2

# Etape 4: Creer l'executable Electron
Write-Host "[4/4] Creation de l'executable Electron..." -ForegroundColor Yellow
Write-Host ""

Write-Host "   Packaging de l'application (cela peut prendre plusieurs minutes)..." -ForegroundColor Gray
npm run electron:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERREUR] Erreur lors de la creation de l'executable" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "[OK] Executable cree avec succes!" -ForegroundColor Green
Set-Location ..

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "=== BUILD TERMINE AVEC SUCCES! ===" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "L'installateur se trouve dans:" -ForegroundColor Cyan
Write-Host "   frontend\dist-electron\" -ForegroundColor White
Write-Host ""
Write-Host "Fichier de setup:" -ForegroundColor Cyan
$setupFiles = Get-ChildItem -Path "frontend\dist-electron" -Filter "*.exe" -Recurse
foreach ($file in $setupFiles) {
    Write-Host "   - $($file.Name)" -ForegroundColor White
}
Write-Host ""
Write-Host "Vous pouvez maintenant distribuer cet installateur!" -ForegroundColor Green
Write-Host ""
