# ⚡ Referencia Rápida - Visual Testing

## 🚀 Iniciar Rápidamente

```bash
# Terminal 1: App
npm run dev

# Terminal 2: Tests (CON NAVEGADOR VISIBLE)
npm run test:visual:headed
```

## 📱 Todos los Scripts Disponibles

### Ejecución Básica

| Script                       | Uso                          |
| ---------------------------- | ---------------------------- |
| `npm run test:visual`        | Headless (sin GUI)           |
| `npm run test:visual:headed` | ⭐ **Con navegador visible** |
| `npm run test:visual:ui`     | Dashboard interactivo        |
| `npm run test:visual:debug`  | Paso a paso (debug)          |
| `npm run test:visual:local`  | Local con headed             |
| `npm run test:visual:fast`   | Paralelo sin reintentos      |

### Producción & CI/CD

| Script                             | Uso                        |
| ---------------------------------- | -------------------------- |
| `npm run test:visual:prod`         | Tests completos producción |
| `npm run test:visual:all`          | Alias para prod            |
| `npm run test:visual:docker`       | En Docker Compose          |
| `npm run test:visual:compare`      | Comparación visual         |
| `npm run test:visual:baseline`     | Generar baseline           |
| `npm run test:visual:baseline:all` | Baseline todos navegadores |
| `npm run test:visual:watch`        | Watch mode (auto-rerun)    |

## 📸 Qué Se Prueba

### 4 Test Suites

1. **Visual Responsiveness** - Layout en 11 dispositivos
2. **Login Flow** - Flujo completo con admin
3. **Dashboard Responsiveness** - Layout de dashboard
4. **Interactive Components** - Estados y transiciones

### 11 Dispositivos

```
Desktop:  Chrome, Firefox, Safari (1920x1080)
Tablets:  iPad Pro, iPad Mini, Galaxy Tab
Mobiles:  iPhone 14/SE, Pixel 7, Galaxy S8/S21
```

## 📊 Outputs

```
screenshots/              ← PNG en cada viewport
test-results/            ← Reportes
  ├── visual-html/       ← Reporte interactivo
  ├── visual.json        ← Datos JSON
  └── visual-junit.xml   ← CI/CD format
```

## 🎯 Workflow Típico

```bash
# 1. Desarrollo local
npm run dev
npm run test:visual:headed  # Ver en navegador

# 2. Revisar reportes
open test-results/visual-html/index.html

# 3. Generar baseline
npm run test:visual:baseline

# 4. Comparar cambios
npm run test:visual:compare

# 5. CI/CD
npm run test:visual:prod
```

## 🐛 Troubleshooting

| Problema                   | Solución                                         |
| -------------------------- | ------------------------------------------------ |
| App no carga               | `npm run dev` y esperar 30s                      |
| Puerto 3000 ocupado        | `lsof -ti:3000 \| xargs kill -9`                 |
| Screenshots vacíos         | `npm run test:visual:headed --timeout=60000`     |
| Navegadores no descargados | `npx playwright install`                         |
| Docker falla               | `docker compose down -v && docker compose up -d` |

## 🎨 Tipos de Tests

### Screenshots por Dispositivo

```
✓ Desktop (3 navegadores)
✓ Tablet (3 tipos)
✓ Mobile (6 dispositivos)
```

### Validaciones

```
✓ Responsividad
✓ Interactividad (focus, hover)
✓ Performance metrics
✓ Accesibilidad (a11y)
✓ Sin overflow horizontal
✓ Tipografía legible
```

## 📚 Documentación

- `VISUAL_TESTING_QUICKSTART.md` - Inicio rápido
- `PLAYWRIGHT_VISUAL_TESTING.md` - Guía completa
- `CI_CD_INTEGRATION.md` - Integración CI/CD
- `SETUP_SUMMARY.md` - Lo que se instaló

## 💡 Tips Avanzados

### Ver solo un device

```bash
npx playwright test --project=Mobile-iPhone14
```

### Modo trace (debugging)

```bash
npx playwright test --trace on --headed
```

### Aumentar timeout

```bash
npx playwright test --timeout=60000
```

### Parallelismo

```bash
npx playwright test --workers=8
```

### Capturar video

```bash
npx playwright test --video=on
```

## 🔄 Watch Mode

```bash
npm run test:visual:watch
# Auto-reruns tests cuando hay cambios
# Presiona Ctrl+C para salir
```

## 📌 Configuración

- `playwright.visual.config.ts` - Config principal
- `.env.visual` - Variables de entorno
- `docker-compose.yml` - Stack Docker
- `.github/workflows/visual-tests.yml` - GitHub Actions

## 🎯 Próximos Pasos

1. ✅ `npm run dev` - Levantar app
2. ✅ `npm run test:visual:headed` - Ejecutar tests
3. ✅ `open test-results/visual-html/index.html` - Ver reportes
4. ✅ Revisar screenshots en `screenshots/`

---

**¿Preguntas?** Ver documentación completa en `PLAYWRIGHT_VISUAL_TESTING.md`
