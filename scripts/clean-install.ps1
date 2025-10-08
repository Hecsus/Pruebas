# Limpieza e instalación limpia para Windows
Write-Host "Cerrando procesos Node..." -ForegroundColor Cyan
taskkill /F /IM node.exe 2>$null

Write-Host "Eliminando node_modules..." -ForegroundColor Cyan
if (Test-Path node_modules) { rmdir node_modules -Recurse -Force }

Write-Host "Eliminando package-lock.json..." -ForegroundColor Cyan
if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }

Write-Host "Instalando dependencias..." -ForegroundColor Cyan
npm install

Write-Host "Listo. Prueba 'npm run dev' y 'npm run audit:prod'." -ForegroundColor Green
