# 🎬 Visual Testing Suite - ORIGEN ERP

Configuración completa de Playwright para pruebas visuales responsivas con captura de screenshots en diferentes dispositivos y resoluciones.

## 📋 Instalación Realizada

✅ **Playwright 1.65.0** instalado  
✅ **Navegadores**: Chromium, Firefox, WebKit  
✅ **Configuración**: 11 tipos de dispositivos diferentes  
✅ **Docker Compose**: Ambiente containerizado listo

## 📱 Dispositivos & Resoluciones Soportadas

### Desktop

- Chrome 1920x1080
- Firefox 1920x1080
- Safari 1920x1080

### Tablets

- iPad Pro: 1024x1366
- iPad Mini: 768x1024
- Galaxy Tab: 1280x800

### Mobile

- iPhone 14: 390x844
- iPhone 14 Pro Max: 430x932
- iPhone SE: 375x667
- Pixel 7: 412x915
- Galaxy S8: 360x740
- Galaxy S21: 360x800

## 🚀 Comandos de Ejecución

### Modo Local (Recomendado para desarrollo)

```bash
# Correr pruebas visuales con navegador headless (sin GUI)
npm run test:visual

# Correr en modo headed (con navegador visible)
npm run test:visual:headed

# Interfaz gráfica interactiva de Playwright
npm run test:visual:ui

# Modo debug (paso a paso)
npm run test:visual:debug
```

### Modo Docker (Producción / CI)

```bash
# Levantar stack completo
docker compose up -d

# Ejecutar pruebas en el contenedor
docker compose exec playwright npm run test:visual:headed

# Ver reportes
docker compose exec playwright ls -la screenshots/
```

## 📊 Reportes & Screenshots

Después de ejecutar las pruebas:

### Ubicaciones

```
screenshots/                          # Screenshots por viewport
├── 01-login-1920x1080.png
├── 01-login-390x844.png
├── 02-login-loaded-1920x1080.png
├── 03-email-input-1920x1080.png
└── ...

test-results/visual-html/            # Reporte HTML interactivo
├── index.html                        # Abrir en navegador
└── trace/

test-results/visual.json              # Datos JSON estructurados
test-results/visual-junit.xml         # Formato JUnit para CI/CD
```

### Abrir Reporte HTML

```bash
# En Windows/macOS
open test-results/visual-html/index.html

# En Linux
xdg-open test-results/visual-html/index.html
```

## 🔍 Qué Se Valida

1. **Layout Responsivo**
   - Sin horizontal overflow
   - Elementos visibles en todos los viewports
   - Padding y márgenes adecuados

2. **Tipografía & Legibilidad**
   - Tamaño de fuente legible
   - Line-height adecuado
   - Contraste de colores

3. **Interactividad**
   - Botones accesibles (tamaño mínimo 32px)
   - Inputs enfocables sin scroll
   - Estados hover/focus visibles

4. **Performance**
   - First Paint
   - First Contentful Paint
   - Load time

5. **Viewports**
   - Meta viewport presente
   - Sin horizontal scrolling
   - Scaling correcto

## 📸 Workflow Interactivo

### Paso 1: Levantar la app

```bash
npm run dev
# O en Docker:
docker compose up app
```

### Paso 2: Ejecutar pruebas visuales

```bash
npm run test:visual:headed

# En otra terminal, interactúa con la app manualmente mientras se capturan screenshots
```

### Paso 3: Revisar resultados

```bash
# Abrir reporte
open test-results/visual-html/index.html

# Revisar screenshots
ls screenshots/
```

## 🐳 Stack Completo en Docker

```bash
# Levantar todo
docker compose up -d

# Verificar servicios
docker compose ps

# Ver logs
docker compose logs -f app
docker compose logs -f firebase-emulator

# Ejecutar pruebas
docker compose exec playwright npm run test:visual:headed

# Limpiar
docker compose down -v
```

## ⚙️ Configuración Avanzada

### Cambiar URLs

Editar `playwright.visual.config.ts`:

```typescript
use: {
  baseURL: 'http://your-server:3000',
  ...
}
```

### Agregar Nuevos Dispositivos

En `playwright.visual.config.ts`, agregar a `projects`:

```typescript
{
  name: 'Custom-Device',
  use: {
    ...devices['Custom Device'],
    viewport: { width: 1280, height: 720 },
  },
},
```

### Timeout & Retries

```typescript
export default defineConfig({
  timeout: 30000, // Timeout por test
  retries: 2, // Reintentos
  workers: 4, // Parallelismo
});
```

## 🛠️ Troubleshooting

### "Port already in use"

```bash
# Matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9

# O cambiar puerto en docker-compose.yml
```

### Navegadores no descargados

```bash
npx playwright install chromium firefox webkit
```

### Screenshots vacíos

```bash
# Asegurar que la app está corriendo
npm run dev

# Esperar más tiempo
npx playwright test --timeout=60000
```

### Firebase emulator no conecta

```bash
docker compose down -v
docker compose up firebase-emulator
# Esperar ~30 segundos a que esté listo
```

## 📚 Documentación Oficial

- [Playwright Docs](https://playwright.dev)
- [Device Emulation](https://playwright.dev/docs/emulation)
- [Screenshots](https://playwright.dev/docs/screenshots)
- [Test Configuration](https://playwright.dev/docs/test-configuration)

## 🎯 Próximos Pasos

1. ✅ **Agregar pruebas de Login real** con datos admin
2. ✅ **Integrar con CI/CD** (GitHub Actions, GitLab CI)
3. ✅ **Comparación visual** de screenshots entre versiones
4. ✅ **Performance benchmarks** por dispositivo
5. ✅ **Accessibility testing** (a11y)

---

**Estado**: Completamente configurado ✅  
**Versión Playwright**: 1.65.0  
**Navegadores**: Chromium, Firefox, WebKit  
**Dispositivos**: 11 variantes responsivas
