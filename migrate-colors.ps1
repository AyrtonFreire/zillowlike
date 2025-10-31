# Script para migrar cores em massa
# Substituir bg-blue-600/700 e from-blue.*/to-purple.* por glass-teal

$files = Get-ChildItem -Path "src" -Recurse -Include *.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Substituições
    $content = $content -replace 'bg-blue-600\s+hover:bg-blue-700', 'glass-teal'
    $content = $content -replace 'bg-blue-600', 'glass-teal'
    $content = $content -replace 'bg-purple-600', 'glass-teal'
    $content = $content -replace 'from-blue-600\s+to-purple-600', 'glass-teal'
    $content = $content -replace 'from-blue-500\s+to-purple-500', 'glass-teal'
    $content = $content -replace 'text-blue-100', 'text-white/80'
    $content = $content -replace 'text-purple-100', 'text-white/80'
    
    if ($content -ne $original) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "`nMigração concluída!"
