# Script d'Installation Automatique des Dépendances
# À distribuer avec l'application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation des Dependances Python" -ForegroundColor Cyan
Write-Host "Gestion des Surveillances v1.0.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Python est installé
Write-Host "[1/3] Verification de Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python detecte: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Python n'est pas installe ou pas dans PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Veuillez installer Python 3.10+ depuis:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT: Cochez 'Add Python to PATH' lors de l'installation" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

Write-Host ""

# Déterminer le chemin d'installation
$backendPath = ""
if (Test-Path "C:\Program Files\Gestion Surveillances\resources\backend") {
    $backendPath = "C:\Program Files\Gestion Surveillances\resources\backend"
} elseif (Test-Path "${env:LOCALAPPDATA}\Programs\Gestion Surveillances\resources\backend") {
    $backendPath = "${env:LOCALAPPDATA}\Programs\Gestion Surveillances\resources\backend"
} elseif (Test-Path ".\backend") {
    $backendPath = ".\backend"
} else {
    Write-Host "[ERREUR] Impossible de trouver le dossier backend" -ForegroundColor Red
    Write-Host "Verifiez que l'application est bien installee" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

Write-Host "[2/3] Dossier backend trouve: $backendPath" -ForegroundColor Green
Write-Host ""

# Installer les dépendances
Write-Host "[3/3] Installation des dependances..." -ForegroundColor Yellow
Write-Host "Cela peut prendre quelques minutes..." -ForegroundColor Gray
Write-Host ""

try {
    Set-Location $backendPath
    pip install -r requirements.txt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Installation reussie!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Vous pouvez maintenant lancer l'application:" -ForegroundColor Cyan
        Write-Host "- Raccourci bureau" -ForegroundColor White
        Write-Host "- Menu Demarrer > Gestion Surveillances" -ForegroundColor White
        Write-Host ""
    } else {
        throw "Erreur lors de l'installation"
    }
} catch {
    Write-Host ""
    Write-Host "[ERREUR] Echec de l'installation des dependances" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "1. Verifiez votre connexion Internet" -ForegroundColor White
    Write-Host "2. Relancez ce script en tant qu'Administrateur" -ForegroundColor White
    Write-Host "3. Essayez manuellement:" -ForegroundColor White
    Write-Host "   cd `"$backendPath`"" -ForegroundColor Gray
    Write-Host "   pip install -r requirements.txt" -ForegroundColor Gray
    Write-Host ""
}

Read-Host "Appuyez sur Entree pour quitter"
