#!/usr/bin/env pwsh
# =============================================================================
# Quick Build Script - Backend Only
# Useful for testing backend changes without rebuilding everything
# =============================================================================

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "Building Backend Executable..." -ForegroundColor Cyan
Set-Location "$PROJECT_ROOT\backend"

# Activate virtual environment
if (-Not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    exit 1
}

& ".\venv\Scripts\Activate.ps1"

# Clean and build
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

Write-Host "Running PyInstaller..." -ForegroundColor Yellow
pyinstaller build_backend.spec --clean --noconfirm

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend built successfully!" -ForegroundColor Green
    if (Test-Path "dist\surveillance_backend.exe") {
        $size = (Get-Item "dist\surveillance_backend.exe").Length / 1MB
        Write-Host "   Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
