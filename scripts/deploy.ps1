#!/usr/bin/env pwsh
# deploy.ps1 — Clean, test, commit, push, monitor CI
# Run: cd C:\Users\wilso\Documents\APPS\origen_app_erp\ORIGEN; .\scripts\deploy.ps1
# ============================================================

Set-Location (Split-Path $PSScriptRoot -Parent)
$ErrorActionPreference = 'Stop'
$PAT = $env:GH_TOKEN  # set GH_TOKEN env var before running this script
$REPO = "salazaroliveros-prog/ORIGEN"

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function OK($msg)        { Write-Host "  ✓ $msg" -ForegroundColor Green }
function FAIL($msg)      { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }

# ──────────────────────────────────────────────────────────────
Step 1 "Clear NODE_OPTIONS"
$env:NODE_OPTIONS = ""
OK "Cleared"

# ──────────────────────────────────────────────────────────────
Step 2 "Run unit tests (npm run test)"
$testOut = npm run test 2>&1
$testOut | Select-Object -Last 20 | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0) { FAIL "Tests failed — fix before pushing" }
OK "All tests passed"

# ──────────────────────────────────────────────────────────────
Step 3 "Untrack session report files from git index"
# All root-level .md (except README), .txt, .log, .png, .html, .ps1
$types = @("*.md","*.txt","*.log","*.png","*.htm","*.html","*.ps1")
foreach ($t in $types) {
  $files = Get-ChildItem -Path "." -Filter $t -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "README.md" } |
    ForEach-Object { $_.Name }
  if ($files) { git rm --cached --ignore-unmatch @files 2>$null }
}
# Agent dirs
@(".aider-desk",".augment",".autohand",".bob",".claude",".codeartsdoer",
  ".codebuddy",".codemaker",".codestudio",".commandcode",".continue",
  ".cortex",".crush",".devin",".goose",".hermes",".iflow",".inferencesh",
  ".kilo",".mcpjam",".mux",".neovate",".openhands",".pochi",".qoder",
  ".qwen",".roo",".trae",".vibe",".windsurf",".zencoder") | ForEach-Object {
  git rm --cached -r --ignore-unmatch $_ 2>$null
}
git rm --cached --ignore-unmatch bun.lock 2>$null
git rm --cached -r --ignore-unmatch .next-emulator 2>$null
OK "Session files untracked"

# ──────────────────────────────────────────────────────────────
Step 4 "Verify no secrets in staging area"
$staged = git status --short 2>&1 | Where-Object { $_ -match "\.env$|\.env\.local" }
if ($staged) { FAIL ".env would be committed! Aborting.`n$staged" }
OK "No secret files staged"

# ──────────────────────────────────────────────────────────────
Step 5 "Stage and commit all changes"
git add .
$status = git status --short 2>&1
$status | ForEach-Object { Write-Host "  $_" }
git commit -m "feat: CI fix + 1174 tests + ExpensesView Firestore + PWA ORIGEN branding

- FIX CI: actions/checkout@v4 + setup-node@v4 (v7 caused failing run #134)
- Vitest env vars in CI so npm test passes without real Firebase
- Lint advisory (does not block build)
- Connect ExpensesView to Firestore real-time subscription
- Add deleteEmployee to useProjectData hook
- 190+ new unit tests: payroll IGSS, geofencing, market data, permissions,
  budget alerts, cache, logger, validation utils, calculations
- Rewrite 6 E2E specs with real Spanish SPA selectors
- Remove hardcoded passwords (use E2E_ADMIN_* env vars)
- Security headers next.config.ts + vercel.json
- PWA: ORIGEN ERP branding, SW cache v2, Cotizaciones shortcut
- .gitignore/.vercelignore: exclude 131 MD session reports and agent dirs
- .env.example documenting all required variables"
OK "Committed"

# ──────────────────────────────────────────────────────────────
Step 6 "Push to GitHub"
git push origin main
OK "Pushed"

# ──────────────────────────────────────────────────────────────
Step 7 "Monitor GitHub Actions CI"
Write-Host "`n  Waiting 20s for CI to start..." -ForegroundColor Yellow
Start-Sleep 20

$headers = @{
  Authorization = "Bearer $PAT"
  Accept        = "application/vnd.github.v3+json"
  "User-Agent"  = "ORIGEN-deploy"
}
$maxPolls = 25
for ($i = 1; $i -le $maxPolls; $i++) {
  try {
    $resp = Invoke-RestMethod "https://api.github.com/repos/$REPO/actions/runs?per_page=1&event=push&branch=main" -Headers $headers
    $run = $resp.workflow_runs[0]
    $t = [DateTime]::Now.ToString("HH:mm:ss")
    $status = if ($run.conclusion) { $run.conclusion.ToUpper() } else { $run.status }
    $title = $run.display_title
    if ($title.Length -gt 55) { $title = $title.Substring(0,55) + "…" }
    $color = switch ($run.conclusion) {
      "success" { "Green" }
      "failure" { "Red"   }
      default   { "Yellow"}
    }
    Write-Host "  $t  Run #$($run.run_number) [$status] $title" -ForegroundColor $color

    if ($run.status -eq "completed") {
      if ($run.conclusion -eq "success") {
        Write-Host "`n  ✅ CI PASSED!" -ForegroundColor Green
        Write-Host "  GitHub Actions : https://github.com/$REPO/actions"
        Write-Host "  Vercel deploy  : https://vercel.com/proyectoswm/origen"
        Write-Host "  App live       : https://origen-one-kohl.vercel.app"
      } else {
        Write-Host "`n  ❌ CI FAILED: $($run.conclusion)" -ForegroundColor Red
        Write-Host "  Logs: $($run.html_url)"
      }
      break
    }
  } catch {
    Write-Host "  (polling... $i/$maxPolls)"
  }
  Start-Sleep 20
}
