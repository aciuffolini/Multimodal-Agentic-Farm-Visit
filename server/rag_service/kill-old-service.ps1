# Kill process on port 8000
Write-Host "=== Killing process on port 8000 ===" -ForegroundColor Yellow

$connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($connections) {
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Found process: $($proc.ProcessName) (PID: $processId)" -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
            Write-Host "Killed process $processId" -ForegroundColor Green
        }
    }
    Write-Host ""
    Write-Host "✅ Port 8000 is now free" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now start the service:" -ForegroundColor Cyan
    Write-Host "  python main.py" -ForegroundColor White
} else {
    Write-Host "No process found on port 8000" -ForegroundColor Green
}

