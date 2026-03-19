# Complete Frontend Reset and Fix Script
# Run this from the frontend directory

Write-Host "🔧 Starting Complete Frontend Reset..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any running dev servers
Write-Host "1️⃣ Stopping any running processes..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 2: Clean build artifacts
Write-Host "2️⃣ Cleaning build artifacts..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "   ✓ Removed .next folder" -ForegroundColor Green
}

# Step 3: Clean node_modules and package-lock
Write-Host "3️⃣ Cleaning dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "   ✓ Removed node_modules" -ForegroundColor Green
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "   ✓ Removed package-lock.json" -ForegroundColor Green
}

# Step 4: Clean npm cache
Write-Host "4️⃣ Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "   ✓ Cache cleaned" -ForegroundColor Green

# Step 5: Reinstall dependencies
Write-Host "5️⃣ Reinstalling dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✨ Reset complete! Now run: npm run dev" -ForegroundColor Green
Write-Host ""
