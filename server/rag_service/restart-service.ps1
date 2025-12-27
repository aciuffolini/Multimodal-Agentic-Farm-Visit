# Restart RAG Service Script
# This ensures the service loads the latest code and .env file

Write-Host "=== Restarting RAG Service ===" -ForegroundColor Cyan
Write-Host ""

# Check if service is running
Write-Host "1. Checking if service is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ⚠️  Service is running - you need to stop it first (Ctrl+C in the service window)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   After stopping, run this script again or start manually with:" -ForegroundColor Gray
    Write-Host "   python main.py" -ForegroundColor White
    exit 0
} catch {
    Write-Host "   ✅ Service is not running (good, we can start fresh)" -ForegroundColor Green
}

Write-Host ""

# Verify .env file
Write-Host "2. Verifying .env file..." -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    $envContent = Get-Content .env
    $hasKey = $envContent | Where-Object { $_ -match '^OPENAI_API_KEY=' }
    $hasProvider = $envContent | Where-Object { $_ -match '^EMBEDDING_PROVIDER=' }
    
    if ($hasKey) {
        Write-Host "   ✅ OPENAI_API_KEY found in .env" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  OPENAI_API_KEY not found in .env" -ForegroundColor Yellow
    }
    
    if ($hasProvider) {
        Write-Host "   ✅ EMBEDDING_PROVIDER found in .env" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  EMBEDDING_PROVIDER not found (will default to 'auto')" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Create .env file with:" -ForegroundColor Yellow
    Write-Host "   OPENAI_API_KEY=sk-your-key-here" -ForegroundColor White
    Write-Host "   EMBEDDING_PROVIDER=auto" -ForegroundColor White
    exit 1
}

Write-Host ""

# Test .env loading
Write-Host "3. Testing .env loading..." -ForegroundColor Yellow
python test_env.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ .env loading works correctly" -ForegroundColor Green
} else {
    Write-Host "   ❌ .env loading test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Start service
Write-Host "4. Starting RAG service..." -ForegroundColor Yellow
Write-Host "   Run this command:" -ForegroundColor Gray
Write-Host "   python main.py" -ForegroundColor White
Write-Host ""
Write-Host "   You should see:" -ForegroundColor Gray
Write-Host "   [INFO] Loaded .env from: ..." -ForegroundColor White
Write-Host "   [INFO] OPENAI_API_KEY loaded: set" -ForegroundColor White
Write-Host "   [INFO] Embedding provider config: openai" -ForegroundColor White
Write-Host "   [INFO] Embedding provider active: openai" -ForegroundColor White
Write-Host ""

