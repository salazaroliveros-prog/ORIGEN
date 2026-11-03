# ORIGEN ERP - Guía de Debugging

Esta guía proporciona instrucciones para diagnosticar y resolver problemas comunes en el sistema ORIGEN ERP.

## 📋 Tabla de Contenidos

- [Herramientas de Debugging](#herramientas-de-debugging)
- [Debugging de Tests de Integración](#debugging-de-tests-de-integración)
- [Debugging de Tests E2E](#debugging-de-tests-e2e)
- [Debugging del Servidor Next.js](#debugging-del-servidor-nextjs)
- [Debugging de Firebase](#debugging-de-firebase)
- [Debugging de Build](#debugging-de-build)
- [Problemas Comunes](#problemas-comunes)

---

## Herramientas de Debugging

### 1. VS Code Debugger

Configura `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:watch"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Next.js",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 2. Playwright Inspector

```bash
npx playwright test --debug
```

Abre el inspector de Playwright para debugging visual de tests E2E.

### 3. Console.log

Agrega `console.log` en el código para debugging rápido:

```typescript
console.log('Debug:', { variable, value });
```

### 4. Browser DevTools

Para tests E2E, usa `--headed` para ver el navegador:

```bash
npx playwright test --headed
```

---

## Debugging de Tests de Integración

### Ver Output Detallado

```bash
npm test -- --reporter=verbose
```

### Ejecutar en Modo Watch con Debugging

```bash
npm run test:watch
```

Presiona `p` en la terminal para filtrar por patrón de archivo.

### Debugging de un Test Específico

1. Agrega `.only` al test:
```typescript
it.only('should do something', () => {
  // ...
});
```

2. Ejecuta el test:
```bash
npm test
```

3. Elimina `.only` después de debugging.

### Ver Stack Trace Completo

```bash
npm test -- --no-coverage
```

### Debugging de Async Tests

Usa `await` correctamente y agrega timeouts:

```typescript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
}, 10000); // 10s timeout
```

---

## Debugging de Tests E2E

### Usar Playwright Inspector

```bash
npx playwright test --debug
```

El inspector permite:
- Ver cada paso del test
- Inspeccionar el DOM
- Ejecutar tests paso a paso
- Ver network requests

### Ejecutar en Modo Headed

```bash
npx playwright test --headed
```

Permite ver el navegador mientras se ejecutan los tests.

### Ver Screenshots de Fallos

Los screenshots se guardan en `test-results/` automáticamente cuando un test falla.

### Grabar Video de Tests

En `playwright.config.ts`:
```typescript
export default defineConfig({
  use: {
    video: 'retain-on-failure',
  },
});
```

### Debugging de Selectores

Usa el Playwright Codegen para generar selectores:

```bash
npx playwright codegen http://localhost:3000
```

### Ver Network Requests

En `playwright.config.ts`:
```typescript
export default defineConfig({
  use: {
    trace: 'on',
  },
});
```

Luego revisa el trace en el reporte.

### Timeout Problems

Aumentar timeout global:
```typescript
export default defineConfig({
  timeout: 60000,
});
```

O aumentar timeout específico:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000);
  // ...
});
```

---

## Debugging del Servidor Next.js

### Ver Errores de Compilación

```bash
npm run dev
```

Los errores de compilación se muestran en la terminal y en el navegador.

### Ver Errores de Runtime

1. Abre el navegador
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña "Console"
4. Revisa los errores

### Ver Source Maps

Asegúrate de que `next.config.js` tenga:
```javascript
module.exports = {
  productionBrowserSourceMaps: true,
};
```

### Debugging de API Routes

1. Agrega `console.log` en la ruta API
2. Revisa la terminal del servidor
3. Usa tools como Postman o curl para probar la ruta

```bash
curl http://localhost:3000/api/projects
```

### Ver Builds de Desarrollo

```bash
npm run build
```

Revisa los warnings y errores de build.

---

## Debugging de Firebase

### Ver Emulators

```bash
firebase emulators:start
```

Abre http://localhost:4000 para ver la UI de emuladores.

### Debugging de Firestore Rules

1. Abre la UI de emuladores
2. Ve a "Firestore"
3. Revisa los logs de operations

### Debugging de Auth

```bash
firebase emulators:start --only auth
```

Abre http://localhost:9099 para ver la UI de Auth emulator.

### Ver Logs de Firebase

En el código, agrega logging:
```typescript
import { getFirestore } from 'firebase/firestore';

const db = getFirestore();
console.log('Firestore instance:', db);
```

### Debugging de Rules Tests

```bash
npm run test:rules
```

Revisa el output para ver qué rules fallaron.

---

## Debugging de Build

### Ver Build Logs

```bash
npm run build
```

Revisa los warnings y errores de build.

### Ver Bundle Size

```bash
npm run build:analyze
```

Abre el reporte de análisis para ver el tamaño de bundles.

### Debugging de Webpack

Agrega modo verbose en `next.config.js`:
```javascript
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      console.log('Webpack config:', config);
    }
    return config;
  },
};
```

### Ver Build Output

El build output está en `.next/`. Revisa los archivos generados.

---

## Problemas Comunes

### 1. "Module not found"

**Causa:** Dependencia no instalada o path incorrecto.

**Solución:**
```bash
npm install
# O instalar dependencia específica
npm install nombre-de-dependencia
```

### 2. "Cannot read property of undefined"

**Causa:** Intentando acceder a una propiedad de `undefined`.

**Solución:**
```typescript
// Agregar validación
if (obj && obj.property) {
  // usar obj.property
}

// O usar optional chaining
const value = obj?.property;
```

### 3. "Network request failed"

**Causa:** API no responde o firewall bloqueando.

**Solución:**
- Verificar que el servidor esté corriendo
- Verificar que el puerto sea correcto
- Verificar firewall/antivirus

### 4. "Timeout exceeded"

**Causa:** Operación tarda más del timeout permitido.

**Solución:**
- Aumentar el timeout
- Optimizar la operación
- Verificar la red

### 5. "Too many open files"

**Causa:** Límite de archivos abiertos del sistema.

**Solución:**
```bash
# En Linux/Mac
ulimit -n 65536

# En Windows
# Revisar configuración del sistema
```

### 6. "Out of memory"

**Causa:** Memoria insuficiente.

**Solución:**
```bash
# Aumentar memoria de Node
node --max-old-space-size=4096 node_modules/.bin/vitest
```

### 7. "Port already in use"

**Causa:** El puerto ya está en uso por otro proceso.

**Solución:**
```bash
# En Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# En Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### 8. "ESLint error"

**Causa:** Código no cumple con las reglas de ESLint.

**Solución:**
```bash
npm run lint:fix
```

### 9. "TypeScript error"

**Causa:** Código no cumple con tipos de TypeScript.

**Solución:**
```bash
npm run type-check
```

### 10. "Firebase emulator not running"

**Causa:** Emuladores no iniciados.

**Solución:**
```bash
firebase emulators:start
```

---

## 🎯 Tips de Debugging

1. **Divide y vencerás**
   - Aísla el problema en el código más pequeño posible
   - Prueba cada componente individualmente

2. **Usa console.log estratégicamente**
   - Agrega logs en puntos clave del flujo
   - Usa `console.table` para arrays/objetos
   - Elimina logs después de debugging

3. **Revisa la documentación**
   - Consulta la documentación de las bibliotecas
   - Busca issues similares en GitHub

4. **Usa el debugger del navegador**
   - Puntos de interrupción (breakpoints)
   - Inspección de variables
   - Call stack

5. **Versiona el código**
   - Haz commits pequeños y frecuentes
   - Usa `git bisect` para encontrar el commit que introdujo el bug

6. **Reproduce el problema**
   - Documenta los pasos para reproducir
   - Verifica que sea reproducible consistentemente

7. **Escribe tests para el bug**
   - Crea un test que falle con el bug
   - Corrige el bug
   - Verifica que el test pase

---

## 📚 Recursos Adicionales

- [VS Code Debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Vitest Debugging](https://vitest.dev/guide/debugging.html)
- [Next.js Debugging](https://nextjs.org/docs/app/building-your-application/debugging)
- [Firebase Debugging](https://firebase.google.com/docs/emulator-suite/debug)

---

**Última actualización:** 27 de Octubre de 2026
