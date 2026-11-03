# ORIGEN ERP - Guía de Ejecución de Tests

Esta guía documenta cómo ejecutar los tests del sistema ORIGEN ERP.

## 📋 Tabla de Contenidos

- [Tests de Integración](#tests-de-integración)
- [Tests E2E](#tests-e2e)
- [Troubleshooting](#troubleshooting)

---

## Tests de Integración

Los tests de integración validan la lógica de negocio, componentes, hooks, servicios y configuración sin requerir un navegador.

### Ejecutar Todos los Tests

```bash
npm test
```

### Ejecutar en Modo Watch

```bash
npm run test:watch
```

Este modo monitorea los cambios en los archivos y re-ejecuta los tests automáticamente.

### Ejecutar con Reporte de Cobertura

```bash
npm run test:coverage
```

Genera un reporte de cobertura en el directorio `coverage/`.

### Ejecutar un Archivo Específico

```bash
npm test lib/__tests__/security-integration.test.ts
```

### Ejecutar Tests con Patrón

```bash
npm test -- security
```

Ejecuta todos los tests que contienen "security" en el nombre.

---

## Tests E2E

Los tests E2E validan el sistema completo usando Playwright con navegadores reales.

### Prerrequisitos

1. El servidor Next.js debe estar corriendo en `http://localhost:3000`
2. Playwright debe estar instalado: `npm install -D @playwright/test`
3. Browsers deben estar instalados: `npx playwright install`

### Opción 1: Ejecutar con Servidor Manual

**Terminal 1 - Iniciar servidor:**
```bash
npm run dev
```

**Terminal 2 - Ejecutar tests:**
```bash
npm run test:e2e
```

### Opción 2: Ejecutar con UI Interactiva

```bash
npm run test:e2e:ui
```

Abre la UI de Playwright para ejecutar tests interactivamente con debugging.

### Opción 3: Ejecutar en Modo Headed

```bash
npm run test:e2e:headed
```

Ejecuta tests con ventanas de navegador visibles.

### Ejecutar en un Browser Específico

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Ejecutar un Archivo Específico

```bash
npx playwright test e2e/auth.spec.ts
```

### Ejecutar con Modo Debug

```bash
npx playwright test --debug
```

Abre el inspector de Playwright para debugging paso a paso.

### Ver Reportes

Después de ejecutar tests E2E, los reportes se generan en:
- `playwright-report/` - Reporte HTML
- `test-results/` - Screenshots y videos de fallos

Para ver el reporte HTML:
```bash
npx playwright show-report
```

---

## Troubleshooting

### Problema: Servidor Next.js No Inicia

**Error:**
```
Error: Cannot find module 'c:/Users/wilso/AppData/Roaming/Code/User/workspaceStorage/...'
```

**Solución:**
Este error está relacionado con el VS Code debugger. Usa una terminal estándar en lugar de VS Code terminal.

**Alternativa:**
```bash
# Abrir PowerShell o CMD estándar
cd C:\Users\wilso\Documents\APPS\origen_app_erp\ORIGEN
npm run dev
```

### Problema: Tests E2E Fallan con "Connection Refused"

**Causa:** El servidor Next.js no está corriendo.

**Solución:**
1. Inicia el servidor en una terminal: `npm run dev`
2. Espera a que el servidor inicie completamente
3. Ejecuta los tests en otra terminal: `npm run test:e2e`

### Problema: Playwright Browsers No Instalados

**Error:**
```
Executable doesn't exist at /path/to/chromium
```

**Solución:**
```bash
npx playwright install
npx playwright install --with-deps chromium firefox webkit
```

### Problema: Tests de Integración Lentos

**Solución:**
Deshabilitar el modo isolate para reusar workers:

En `vitest.config.ts`:
```typescript
export default defineConfig({
  isolate: false,
  // ... otras configuraciones
});
```

### Problema: Memory Issues en Tests

**Solución:**
Limitar el número de workers:

```bash
npm test -- --workers=2
```

### Problema: Tests E2E Timeout

**Solución:**
Aumentar el timeout en `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60000, // 60 segundos
  // ... otras configuraciones
});
```

### Problema: Firebase Emulator Tests Fallan

**Solución:**
Asegúrate de que los emuladores estén corriendo:

```bash
firebase emulators:start
```

Luego ejecuta:
```bash
npm run test:emulator
```

### Problema: Linting Falla en Commit

**Causa:** Los hooks de Husky ejecutan linting antes de commit.

**Solución:**
Corrige los problemas automáticamente:
```bash
npm run lint:fix
npm run format
```

Luego intenta el commit nuevamente.

---

## 📊 Métricas de Tests

### Tests de Integración
- **Total:** 952 tests
- **Duración:** ~6.29s
- **Cobertura:** 100% de módulos

### Tests E2E
- **Total:** 56 tests
- **Duración:** Variable (depende de la aplicación)
- **Browsers:** Chromium, Firefox, WebKit

---

## 🎯 Best Practices

1. **Ejecutar tests de integración antes de cada commit**
   ```bash
   npm test
   ```

2. **Ejecutar linting antes de cada commit**
   ```bash
   npm run lint
   npm run format
   ```

3. **Ejecutar tests E2E antes de cada PR**
   ```bash
   npm run test:e2e
   ```

4. **Revisar reportes de cobertura regularmente**
   ```bash
   npm run test:coverage
   ```

5. **Usar modo watch durante desarrollo**
   ```bash
   npm run test:watch
   ```

---

## 📚 Recursos Adicionales

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)

---

**Última actualización:** 27 de Octubre de 2026
