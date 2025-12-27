# Create .env file for Farm Visit App
# Run: .\create-env.ps1

$envFile = Join-Path $PSScriptRoot ".env"

if (Test-Path $envFile) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Cancelled." -ForegroundColor Gray
        exit
    }
}

Write-Host "Creating .env file..." -ForegroundColor Green

$content = @"
# Farm Visit App - Environment Variables
# DO NOT commit this file to git (it's in .gitignore)

# OpenAI API Key (Client-Side)
# Used for AI processing (photo captions, audio transcripts)
VITE_OPENAI_API_KEY=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

# RAG Service URL
# URL for semantic search and sync service
VITE_RAG_SERVER_URL=http://localhost:8000

# Chat API URL
# Leave empty to use Vite proxy (http://localhost:3000)
# Or set to production API URL for Android builds
VITE_API_URL=
"@

$content | Out-File -FilePath $envFile -Encoding utf8 -NoNewline

Write-Host "✅ .env file created!" -ForegroundColor Green
Write-Host ""
Write-Host "File location: $envFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Restart your dev server for changes to take effect!" -ForegroundColor Yellow
Write-Host "   Stop server (Ctrl+C) and run: pnpm run dev" -ForegroundColor Yellow

