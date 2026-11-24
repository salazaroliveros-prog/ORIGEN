# 🚀 CI/CD Integration Guide - Visual Testing

## GitHub Actions Setup

El workflow está configurado en `.github/workflows/visual-tests.yml`

### Ejecución Automática

```yaml
# Se ejecuta en:
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Variables de Entorno CI

```bash
# Dentro del workflow
NODE_ENV: test
CI: true
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: false
```

## Ejecutar en Local (Simulando CI)

```bash
# Simular entorno CI
export CI=true
npm run test:visual:prod

# O directamente
CI=true npm run test:visual:prod
```

## Configuración por Plataforma

### GitHub Actions

Ya incluído en `.github/workflows/visual-tests.yml`

```bash
# Ejecutar solo tests visuales
npm run test:visual

# Ejecutar con reportes completos
npm run test:visual:prod
```

### GitLab CI

Crear `.gitlab-ci.yml`:

```yaml
visual-tests:
  image: mcr.microsoft.com/playwright:v1.65.0-jammy
  script:
    - npm ci
    - npm run test:visual:prod
  artifacts:
    paths:
      - test-results/
      - screenshots/
    reports:
      junit: test-results/visual-junit.xml
  only:
    - merge_requests
    - main
    - develop
```

### Jenkins

Crear `Jenkinsfile`:

```groovy
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.65.0-jammy'
        }
    }
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Visual Tests') {
            steps {
                sh 'npm run test:visual:prod'
            }
        }
    }
    post {
        always {
            junit 'test-results/visual-junit.xml'
            archiveArtifacts artifacts: 'screenshots/**/*.png',
                             allowEmptyArchive: true
        }
    }
}
```

## Reportes & Artifacts

### Generar Reportes

```bash
# HTML Report
npm run test:visual:prod
# Ubicado en: test-results/visual-html/index.html

# JSON Report
npx playwright test --reporter=json
# Ubicado en: test-results/visual.json

# JUnit XML
npx playwright test --reporter=junit
# Ubicado en: test-results/visual-junit.xml
```

### Subir Artifacts a CI

```bash
# GitHub Actions (automático)
# Jenkins
archiveArtifacts artifacts: 'test-results/**'

# GitLab CI
artifacts:
  paths:
    - test-results/
    - screenshots/
  expire_in: 30 days
```

## Performance Optimization

```bash
# Parallelism
npm run test:visual:prod -- --workers=4

# Headless only (CI)
CI=true npm run test:visual

# Reduce browsers
npx playwright test --project=Desktop-Chrome
```

## Debugging en CI

### Habilitar Traces

```bash
npx playwright test --trace on
```

### Capturar Screenshots

```bash
# Automático en cada test
npm run test:visual:prod
```

### Logs Detallados

```bash
DEBUG=pw:api npm run test:visual:prod
```

## Integración con Herramientas

### Slack Notifications

```yaml
# GitHub Actions
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Visual tests failed",
        "details_url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }
```

### Email Reports

```bash
# Después de tests
node scripts/send-email-report.mjs
```

### Comments en PRs

```yaml
# GitHub Actions
- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '📸 Visual tests completed'
      })
```

## Best Practices

### 1. Limitar Dispositivos en CI

```bash
# CI: solo desktop y mobile
npx playwright test \
  --project=Desktop-Chrome \
  --project=Mobile-iPhone14
```

### 2. Timeout Aumentado

```bash
# 60 segundos por test en CI
npx playwright test --timeout=60000
```

### 3. Retries Limitados

```bash
# CI: sin reintentos
npx playwright test --retries=0
```

### 4. Caching

```yaml
# GitHub Actions
- uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
```

## Troubleshooting

### Error: "Chromium not found"

```bash
# Reinstalar navegadores
npx playwright install --with-deps

# En CI con Docker
# (Automático con imagen playwright)
```

### Error: "Port already in use"

```bash
# En CI, usar puerto dinámico
npx playwright test --base-url http://localhost:$RANDOM
```

### Screenshots vacías

```bash
# Aumentar timeout
npx playwright test --timeout=60000

# Verificar que app está corriendo
# En CI, agregar health check
```

## Monitoreo

### Logs Continuos

```bash
# Ver últimos tests
tail -f test-results/visual.json

# Monitorear reportes HTML
npm install -g http-server
http-server test-results/visual-html
```

### Métricas

Track en:

- Total de tests: `test-results/visual.json`
- Pass rate: Dashboard CI
- Duration: `test-results/*/config.json`
- Screenshots: `screenshots/` directorio

## Documentación

- [Playwright CI/CD](https://playwright.dev/docs/ci)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GitLab CI Docs](https://docs.gitlab.com/ee/ci/)
- [Jenkins Docs](https://www.jenkins.io/doc/)

---

**Estado**: ✅ Ready for CI/CD integration
