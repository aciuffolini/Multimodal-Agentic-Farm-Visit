Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Test Server for Farm Visit App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will start the API server on port 3000" -ForegroundColor Yellow
Write-Host "Keep this window open while testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    pause
    exit 1
}

# Check if test-server.js exists
if (-not (Test-Path "test-server.js")) {
    Write-Host "ERROR: test-server.js not found!" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    pause
    exit 1
}

# Start the server
Write-Host "Starting server on http://localhost:3000" -ForegroundColor Green
Write-Host ""
node test-server.js






