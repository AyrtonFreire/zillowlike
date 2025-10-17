# Script para regenerar Prisma Client (resolve erros EPERM no Windows)

Write-Host "🔧 Fixing Prisma Client..." -ForegroundColor Cyan

# 1. Parar processos que possam estar usando o Prisma
Write-Host "1️⃣  Parando processos Node..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Limpar cache do Prisma
Write-Host "2️⃣  Limpando cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\@prisma\client -ErrorAction SilentlyContinue

# 3. Regenerar Prisma Client
Write-Host "3️⃣  Regenerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "✅ Prisma Client regenerado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora você pode rodar:" -ForegroundColor Cyan
Write-Host "  npm run dev:3001" -ForegroundColor White
Write-Host "  npm run worker" -ForegroundColor White
