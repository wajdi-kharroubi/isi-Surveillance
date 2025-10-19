#!/usr/bin/env pwsh
# =============================================================================
# Test Backend Executable
# Tests the PyInstaller-built backend executable
# =============================================================================

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "Testing Backend Executable..." -ForegroundColor Cyan
Write-Host ""

$backendExe = "$PROJECT_ROOT\backend\dist\surveillance_backend.exe"

if (-Not (Test-Path $backendExe)) {
    Write-Host "❌ Backend executable not found!" -ForegroundColor Red
    Write-Host "   Expected: $backendExe" -ForegroundColor Gray
    Write-Host "   Run build_backend_only.ps1 first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Backend executable found" -ForegroundColor Green
Write-Host "   Location: $backendExe" -ForegroundColor Gray

# Start backend
Write-Host ""
Write-Host "Starting backend..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$process = Start-Process -FilePath $backendExe -WorkingDirectory "$PROJECT_ROOT\backend\dist" -PassThru -NoNewWindow

# Wait for startup
Start-Sleep -Seconds 5

# Test if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "   Health check: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test URLs:" -ForegroundColor Cyan
    Write-Host "   API Docs: http://localhost:8000/api/docs" -ForegroundColor White
    Write-Host "   Health: http://localhost:8000/api/health" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "⚠️  Backend started but health check failed" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "Press Enter to stop the backend..."
Read-Host

# Stop backend
if (-Not $process.HasExited) {
    Write-Host "Stopping backend..." -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force
    Write-Host "✅ Backend stopped" -ForegroundColor Green
}
