# E2E Test Runner for Firebase Emulators
$env:FIREBASE_EMULATORS = 'auth,firestore,storage'
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATORS = 'true'
$env:E2E_ADMIN_EMAIL = 'salazaroliveros@gmail.com'
$env:E2E_ADMIN_PASSWORD = 'AngelDarioJose.2026'
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-origen-erp-test'
$env:NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-api-key'
$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'localhost'
$env:NEXT_PUBLIC_FIREBASE_APP_ID = '1:000000000000:web:demo'
$env:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'demo-origen-erp-test.appspot.com'
$env:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '000000000000'
$env:NEXT_PUBLIC_FIREBASE_EMULATOR_HOST = '127.0.0.1'
$env:NEXT_TELEMETRY_DISABLED = '1'

Write-Host "=== E2E Test Environment Configured ===" -ForegroundColor Green
Write-Host "FIREBASE_EMULATORS: $env:FIREBASE_EMULATORS"
Write-Host "E2E_ADMIN_EMAIL: $env:E2E_ADMIN_EMAIL"
Write-Host ""

# Run the Playwright tests
npx playwright test 2>&1 | Tee-Object -FilePath 'test-final-output.txt'

$exitCode = $LASTEXITCODE
Write-Host ""
Write-Host "=== Tests completed with exit code: $exitCode ===" -ForegroundColor Green

exit $exitCode