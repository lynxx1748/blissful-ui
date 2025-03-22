Write-Host "Starting BlissfulUI - A Replit-inspired Code Editor" -ForegroundColor Cyan
Write-Host "------------------------------------------------" -ForegroundColor Cyan

# Function to check dependencies
function Check-Dependencies {
    param (
        [string]$dir
    )
    if (-not (Test-Path "$dir\node_modules")) {
        Write-Host "Dependencies missing in $dir. Please run 'npm install' first." -ForegroundColor Red
        exit 1
    }
}

# Check dependencies
Check-Dependencies "server"
Check-Dependencies "client"

# Start server
Write-Host "Starting server..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\server
    npm start
}

# Wait a moment
Start-Sleep -Seconds 2

# Start client
Write-Host "Starting client..." -ForegroundColor Green
$clientJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\client
    npm start
}

# Handle termination
try {
    Wait-Job $serverJob, $clientJob
} finally {
    Stop-Job $serverJob, $clientJob
    Remove-Job $serverJob, $clientJob
} 