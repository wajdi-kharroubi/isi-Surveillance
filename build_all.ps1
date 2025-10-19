#!/usr/bin/env pwsh
# =============================================================================
# Complete Build Script for Surveillance Application
# This script builds both backend and frontend, then packages everything
# =============================================================================

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Building Surveillance Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Step 1: Build Backend with PyInstaller
# =============================================================================
Write-Host "[1/4] Building Backend Executable..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

Set-Location "$PROJECT_ROOT\backend"

# Check if virtual environment exists
if (-Not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found. Please run setup first." -ForegroundColor Red
    Write-Host "   Run: python -m venv venv" -ForegroundColor Yellow
    Write-Host "   Then: .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "   Then: pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "   Activating virtual environment..." -ForegroundColor Gray
& ".\venv\Scripts\Activate.ps1"

# Install PyInstaller if not present
Write-Host "   Checking PyInstaller..." -ForegroundColor Gray
pip show pyinstaller > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Installing PyInstaller..." -ForegroundColor Gray
    pip install pyinstaller
}

# Clean previous builds
Write-Host "   Cleaning previous builds..." -ForegroundColor Gray
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

# Build with PyInstaller
Write-Host "   Running PyInstaller (this may take several minutes)..." -ForegroundColor Gray
pyinstaller build_backend.spec --clean --noconfirm

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}

if (Test-Path "dist\surveillance_backend.exe") {
    Write-Host "Backend executable created successfully!" -ForegroundColor Green
    $backendSize = (Get-Item "dist\surveillance_backend.exe").Length / 1MB
    Write-Host "   Size: $([math]::Round($backendSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "Backend executable not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# =============================================================================
# Step 2: Build Frontend (React with Vite)
# =============================================================================
Write-Host "[2/4] Building Frontend (React)..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

Set-Location "$PROJECT_ROOT\frontend"

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "   Installing Node.js dependencies..." -ForegroundColor Gray
    npm install
}

# Build React app
Write-Host "   Building React with Vite..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

if (Test-Path "dist\index.html") {
    Write-Host "Frontend built successfully!" -ForegroundColor Green
} else {
    Write-Host "Frontend build output not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# =============================================================================
# Step 3: Create Database Template (if doesn't exist)
# =============================================================================
Write-Host "[3/4] Preparing Database..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

Set-Location "$PROJECT_ROOT"

if (-Not (Test-Path "database")) {
    Write-Host "   Creating database directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path "database" -Force | Out-Null
}

if (-Not (Test-Path "database\surveillance.db")) {
    Write-Host "   Initializing empty database template..." -ForegroundColor Gray
    # The backend will create the database on first run
    Write-Host "   Database will be created on first launch." -ForegroundColor Gray
} else {
    Write-Host "   Using existing database." -ForegroundColor Gray
}

Write-Host "Database prepared!" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 4: Create LICENSE.txt if missing
# =============================================================================
if (-Not (Test-Path "$PROJECT_ROOT\frontend\LICENSE.txt")) {
    Write-Host "   Creating LICENSE.txt..." -ForegroundColor Gray
    @"
Gestion des Surveillances - Licence d'utilisation
==================================================

Copyright (c) 2025 [Votre Etablissement]

Ce logiciel est fourni a des fins internes uniquement.
Toute reproduction ou distribution non autorisee est strictement interdite.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
"@ | Out-File -FilePath "$PROJECT_ROOT\frontend\LICENSE.txt" -Encoding UTF8
}

# =============================================================================
# Step 5: Package with Electron Builder
# =============================================================================
Write-Host "[4/4] Packaging Electron Application..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

Set-Location "$PROJECT_ROOT\frontend"

# Check if backend exe exists for packaging
if (-Not (Test-Path "$PROJECT_ROOT\backend\dist\surveillance_backend.exe")) {
    Write-Host "Backend executable not found for packaging!" -ForegroundColor Red
    exit 1
}

Write-Host "   Running electron-builder (NSIS installer)..." -ForegroundColor Gray
npm run electron:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Electron packaging failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Show output location
$installerPath = Get-ChildItem "$PROJECT_ROOT\frontend\dist-electron" -Filter "*.exe" | Select-Object -First 1
if ($installerPath) {
    Write-Host "Installer created:" -ForegroundColor Cyan
    Write-Host "   $($installerPath.FullName)" -ForegroundColor White
    $installerSize = $installerPath.Length / 1MB
    Write-Host "   Size: $([math]::Round($installerSize, 2)) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now install the application on any Windows machine!" -ForegroundColor Green
} else {
    Write-Host "Installer not found in expected location." -ForegroundColor Yellow
    Write-Host "   Check: $PROJECT_ROOT\frontend\dist-electron" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test the installer on this machine" -ForegroundColor White
Write-Host "  2. Test on a clean Windows VM (recommended)" -ForegroundColor White
Write-Host "  3. Configure Windows Defender/Firewall if needed" -ForegroundColor White
Write-Host ""
