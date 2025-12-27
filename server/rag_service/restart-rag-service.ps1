# Restart RAG Service with API key loaded from .env
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Stopping existing RAG service..."
Get-Process | Where-Object {
    $_.Path -like "*python*" -and 
    (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*main.py*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "Loading .env file..."
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "[OK] Environment variables loaded"
} else {
    Write-Host "[WARNING] .env file not found"
}

Write-Host "Starting RAG service..."
Write-Host "Service will be available at: http://localhost:8000"
Write-Host "Press Ctrl+C to stop"
Write-Host ""

python main.py

