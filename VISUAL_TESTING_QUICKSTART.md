# ⚡ Quick Start - Visual Testing

## 1️⃣ Instalación (Ya Completada ✅)

```bash
✅ Playwright 1.65.0
✅ Chromium, Firefox, WebKit
✅ Configuración responsiva (11 dispositivos)
✅ Docker Compose ready
```

## 2️⃣ Iniciar la App

### Opción A: Local Development
```bash
npm run dev
# La app estará en http://localhost:3000
```

### Opción B: Docker
```bash
docker compose up -d app
# La app estará en http://localhost:3000
```

## 3️⃣ Ejecutar Pruebas Visuales

### 👀 Ver navegador en vivo (RECOMENDADO)
```bash
npm run test:visual:headed
```
Esto abrirá una ventana del navegador y ejecutará todas las pruebas visualmente.

### 🎯 Interfaz Interactiva
```bash
npm run test:visual:ui
```
Abre un dashboard donde puedes:
- Elegir qué tests ejecutar
- Ver videos de las pruebas
- Revisar screenshots lado a lado

### 🐛 Modo Debug (Paso a Paso)
```bash
npm run test:visual:debug
```
Ejecuta con inspector de Playwright para debugging avanzado.

### ⚡ Modo Rápido
```bash
npm run test:visual:fast
```
Ejecuta en paralelo con 4 workers sin reintentos.

### 🔇 Headless (Sin GUI)
```bash
npm run test:visual
```
Captura screenshots sin abrir navegadores.

## 4️⃣ Ver Resultados

### 📸 Screenshots Capturados
```bash
# Abrir carpeta de screenshots
open screenshots/

# Estructura:
screenshots/
├── login/
│   ├── 01-login-1920x1080.png
│   ├── 02-login-390x844.png
│   └── workflow/
│       ├── 00-initial-chrome-1920.png
│       ├── 01-email-filled-...
│       └── ...
└── ...
```

### 📊 Reporte HTML Interactivo
```bash
# Abrir en navegador
open test-results/visual-html/index.html
```

## 5️⃣ Dispositivos Probados

| Categoría | Dispositivos |
|-----------|-------------|
| **Desktop** | Chrome, Firefox, Safari (1920x1080) |
| **Tablet** | iPad Pro (1024x1366), iPad Mini (768x1024), Galaxy Tab (1280x800) |
| **Mobile** | iPhone 14 (390x844), iPhone SE (375x667), Pixel 7 (412x915), Galaxy S8 (360x740) |

## 6️⃣ Qué se Valida

✅ **Responsividad** - Layout correcto en todos los tamaños  
✅ **Interactividad** - Botones, inputs, focus states  
✅ **Tipografía** - Legibilidad, contraste, line-height  
✅ **Performance** - First Paint, Load time  
✅ **Accesibilidad** - Navegación por teclado  
✅ **Overflow** - Sin horizontal scrolling  

## 7️⃣ Con Docker Compose

```bash
# Levantar stack completo
docker compose up -d

# Verificar servicios
docker compose ps

# Ejecutar pruebas en el contenedor
docker compose exec playwright npm run test:visual:headed

# Ver reportes
docker compose exec playwright ls screenshots/

# Limpiar
docker compose down -v
```

## 8️⃣ Troubleshooting

| Problema | Solución |
|----------|----------|
| **Port 3000 en uso** | `lsof -ti:3000 \| xargs kill -9` |
| **App no carga** | `npm run dev` y esperar ~30s |
| **Screenshots vacíos** | Aumentar timeout: `--timeout=60000` |
| **Firebase emulator falla** | `docker compose down -v && docker compose up firebase-emulator` |
| **Navegadores no descargan** | `npx playwright install chromium firefox webkit` |

## 9️⃣ Próximos Pasos

1. 📝 Agregar assertions de comparación visual
2. 🔄 Integrar con GitHub Actions CI/CD
3. 📊 Generar reportes de comparación entre versiones
4. 🎨 Testing de temas (light/dark mode)
5. ♿ Validaciones de accesibilidad (a11y)

## 🔟 Documentación Completa

Leer: `PLAYWRIGHT_VISUAL_TESTING.md` para guía exhaustiva

---

**Estado**: ✅ Completamente configurado  
**Contacto**: Ver docs en PLAYWRIGHT_VISUAL_TESTING.md
