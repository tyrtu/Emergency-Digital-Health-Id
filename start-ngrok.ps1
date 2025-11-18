# PowerShell script to start backend, frontend, and ngrok tunnel
# Usage: .\start-ngrok.ps1
# 
# This script uses a SINGLE ngrok tunnel for the frontend.
# API calls are proxied through Vite dev server to the backend.
# This works with ngrok's free tier (only 1 tunnel allowed).

Write-Host "Starting Emergency Health ID with ngrok..." -ForegroundColor Green

# Check if ngrok is installed
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "ERROR: ngrok is not installed!" -ForegroundColor Red
    Write-Host "Install it from: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "Or run: npm install -g ngrok" -ForegroundColor Yellow
    exit 1
}

# Start backend in background
Write-Host ""
Write-Host "Starting backend server on port 5000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Minimized

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in background
Write-Host "Starting frontend server on port 5173..." -ForegroundColor Cyan
Write-Host "Note: API calls will be proxied through frontend to backend" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Minimized

# Wait a bit for frontend to start
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Backend and frontend servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Make sure frontend/.env does NOT have VITE_API_BASE_URL set" -ForegroundColor Yellow
Write-Host "This allows API calls to use Vite proxy (relative URLs)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting ngrok for frontend (port 5173)..." -ForegroundColor Cyan
Write-Host "This single tunnel will handle both frontend AND backend API calls" -ForegroundColor Green
Write-Host ""
Write-Host "You will see the ngrok output below. Copy the HTTPS URL to access from your phone!" -ForegroundColor Green
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop ngrok when done." -ForegroundColor Yellow
Write-Host ""

# Run ngrok frontend in current window so we can see output
ngrok http 5173
