# Test RAG Service Script
# Run this after starting the service with: python main.py

Write-Host "=== Testing RAG Service ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if service is running
Write-Host "1. Checking if service is running on port 8000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Service is running!" -ForegroundColor Green
    Write-Host "   Response:" -ForegroundColor Gray
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "   ❌ Service is NOT running or not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Start the service with:" -ForegroundColor Yellow
    Write-Host "   python main.py" -ForegroundColor White
    exit 1
}

Write-Host ""

# Test 2: Test /health endpoint
Write-Host "2. Testing /health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    $health = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ Health check passed!" -ForegroundColor Green
    Write-Host "   Provider config: $($health.provider_config)" -ForegroundColor Gray
    Write-Host "   Provider active: $($health.provider_active)" -ForegroundColor Gray
    Write-Host "   OpenAI key set: $($health.openai_key_set)" -ForegroundColor Gray
    Write-Host "   Embedding available: $($health.embedding_available)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Test /rag/search endpoint
Write-Host "3. Testing /rag/search endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        query = "test"
        k = 5
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:8000/rag/search" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    $results = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ Search works!" -ForegroundColor Green
    Write-Host "   Found $($results.Count) results" -ForegroundColor Gray
    if ($results.Count -gt 0) {
        Write-Host "   First result:" -ForegroundColor Gray
        $results[0] | ConvertTo-Json -Depth 3
    }
} catch {
    Write-Host "   ❌ Search failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Tests Complete ===" -ForegroundColor Cyan

