# Frontend Dependencies Fix Script
# Run this in PowerShell from the frontend directory

Write-Host "🔧 Fixing Frontend Dependencies..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove old zod
Write-Host "📦 Removing invalid zod version..." -ForegroundColor Yellow
npm uninstall zod

# Step 2: Install correct zod version
Write-Host "📦 Installing zod@3.23.8..." -ForegroundColor Yellow
npm install zod@^3.23.8

# Step 3: Verify installation
Write-Host ""
Write-Host "✅ Verifying installation..." -ForegroundColor Green
npm list zod

Write-Host ""
Write-Host "✨ Done! You can now run 'npm run dev' to start the development server." -ForegroundColor Green
Write-Host ""
Write-Host "If you still see errors, try:" -ForegroundColor Yellow
Write-Host "  1. Delete node_modules and package-lock.json" -ForegroundColor White
Write-Host "  2. Run 'npm install'" -ForegroundColor White
Write-Host "  3. Run 'npm run dev'" -ForegroundColor White
