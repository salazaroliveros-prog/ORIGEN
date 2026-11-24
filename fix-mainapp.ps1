$content = Get-Content components/MainApp.tsx -Raw
$content = $content -replace "import { isValidTabId } from '@/lib/constants/tabs';`r?`nimport { isValidTabId } from '@/lib/constants/tabs';'use client';", "'use client';`n`nimport { isValidTabId } from '@/lib/constants/tabs';"
$content | Out-File components/MainApp.tsx -Encoding utf8 -NoNewline
Write-Host "Fixed MainApp.tsx"
