# Start RAG service with environment variables from .env file
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Read .env file and set environment variables
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "Set $key"
        }
    }
} else {
    Write-Host "[WARNING] .env file not found"
}

# Start the service
Write-Host "Starting RAG service with API key..."
python main.py

