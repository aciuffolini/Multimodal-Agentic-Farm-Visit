# Start All Servers Script with Health Checks
# Starts RAG service, Chat API server, and Vite dev server
# Includes automatic health verification

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Farm Visit ARAG System - Server Startup  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ragPath = Join-Path $scriptDir "..\..\server\rag_service"
$ragPath = Resolve-Path $ragPath

Write-Host "Servers to start:" -ForegroundColor White
Write-Host "  [1] RAG Service      -> http://localhost:8000" -ForegroundColor Yellow
Write-Host "  [2] Chat API Server  -> http://localhost:3000" -ForegroundColor Yellow
Write-Host "  [3] Vite Dev Server  -> http://localhost:5173" -ForegroundColor Yellow
Write-Host ""

# Function to test if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to wait for a port to become available
function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSeconds = 30)
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-Port -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    return $false
}

# Check for existing servers
Write-Host "Checking for existing servers..." -ForegroundColor Gray
$existingServers = @()
if (Test-Port -Port 8000) { $existingServers += "RAG (8000)" }
if (Test-Port -Port 3000) { $existingServers += "Chat API (3000)" }
if (Test-Port -Port 5173) { $existingServers += "Vite (5173)" }

if ($existingServers.Count -gt 0) {
    Write-Host "  Already running: $($existingServers -join ', ')" -ForegroundColor Yellow
} else {
    Write-Host "  No servers currently running" -ForegroundColor Gray
}
Write-Host ""

# Start RAG Service first (other services depend on it)
if (-not (Test-Port -Port 8000)) {
    Write-Host "[1/3] Starting RAG Service..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
        `$Host.UI.RawUI.WindowTitle = 'RAG Service :8000'
        cd '$ragPath'
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host '  RAG Service (port 8000)' -ForegroundColor Cyan
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host ''
        python main.py
"@
    Write-Host "      Waiting for RAG service..." -ForegroundColor Gray
    if (Wait-ForPort -Port 8000 -TimeoutSeconds 30) {
        Write-Host "      RAG Service started" -ForegroundColor Green
    } else {
        Write-Host "      RAG Service may still be starting..." -ForegroundColor Yellow
    }
} else {
    Write-Host "[1/3] RAG Service already running" -ForegroundColor Green
}

# Start Chat API Server
if (-not (Test-Port -Port 3000)) {
    Write-Host "[2/3] Starting Chat API Server..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
        `$Host.UI.RawUI.WindowTitle = 'Chat API :3000'
        cd '$scriptDir'
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host '  Chat API Server (port 3000)' -ForegroundColor Cyan
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host ''
        node test-server.js
"@
    Start-Sleep -Seconds 2
    if (Test-Port -Port 3000) {
        Write-Host "      Chat API Server started" -ForegroundColor Green
    } else {
        Write-Host "      Chat API Server starting..." -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/3] Chat API Server already running" -ForegroundColor Green
}

# Start Vite Dev Server
if (-not (Test-Port -Port 5173)) {
    Write-Host "[3/3] Starting Vite Dev Server..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
        `$Host.UI.RawUI.WindowTitle = 'Vite Dev :5173'
        cd '$scriptDir'
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host '  Vite Dev Server (port 5173)' -ForegroundColor Cyan
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host ''
        pnpm run dev
"@
    Start-Sleep -Seconds 3
    Write-Host "      Vite Dev Server starting..." -ForegroundColor Yellow
} else {
    Write-Host "[3/3] Vite Dev Server already running" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Verifying Server Health" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Wait a moment for servers to fully initialize
Start-Sleep -Seconds 3

# Health check results
$healthResults = @()

# Check RAG Service health
Write-Host "Checking RAG Service..." -ForegroundColor Gray
try {
    $ragHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    $embeddingStatus = if ($ragHealth.embedding_available) { "OK" } else { "No embeddings" }
    $healthResults += @{ Name = "RAG Service"; Status = "OK"; Details = "Provider: $($ragHealth.embedding_provider), Embedding: $embeddingStatus" }
    Write-Host "  RAG Service: OK" -ForegroundColor Green
} catch {
    $healthResults += @{ Name = "RAG Service"; Status = "FAILED"; Details = $_.Exception.Message }
    Write-Host "  RAG Service: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Chat API
Write-Host "Checking Chat API..." -ForegroundColor Gray
if (Test-Port -Port 3000) {
    $healthResults += @{ Name = "Chat API"; Status = "OK"; Details = "Port 3000 responding" }
    Write-Host "  Chat API: OK" -ForegroundColor Green
} else {
    $healthResults += @{ Name = "Chat API"; Status = "FAILED"; Details = "Port 3000 not responding" }
    Write-Host "  Chat API: FAILED" -ForegroundColor Red
}

# Check Vite Dev Server
Write-Host "Checking Vite Dev Server..." -ForegroundColor Gray
if (Test-Port -Port 5173) {
    $healthResults += @{ Name = "Vite Dev"; Status = "OK"; Details = "Port 5173 responding" }
    Write-Host "  Vite Dev: OK" -ForegroundColor Green
} else {
    $healthResults += @{ Name = "Vite Dev"; Status = "STARTING"; Details = "Port 5173 not yet responding" }
    Write-Host "  Vite Dev: Starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Ready!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open in browser:" -ForegroundColor White
Write-Host "  http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick test commands:" -ForegroundColor White
Write-Host "  curl http://localhost:8000/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:3000/" -ForegroundColor Gray
Write-Host ""

# Count successful services
$successCount = ($healthResults | Where-Object { $_.Status -eq "OK" }).Count
$totalCount = $healthResults.Count

if ($successCount -eq $totalCount) {
    Write-Host "All $totalCount services running!" -ForegroundColor Green
} else {
    Write-Host "$successCount/$totalCount services running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
