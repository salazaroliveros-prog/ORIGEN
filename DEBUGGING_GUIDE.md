---
contentType: How-to
title: Cómo depurar ORIGEN ERP
---

# Cómo depurar ORIGEN ERP

Esta guía proporciona instrucciones para diagnosticar y resolver problemas comunes en el sistema ORIGEN ERP.

## Tabla de contenidos

- [Herramientas de depuración](#herramientas-de-depuración)
- [Depuración de pruebas de integración](#depuración-de-pruebas-de-integración)
- [Depuración de pruebas E2E](#depuración-de-pruebas-e2e)
- [Depuración del servidor Next.js](#depuración-del-servidor-nextjs)
- [Depuración de Firebase](#depuración-de-firebase)
- [Depuración de build](#depuración-de-build)
- [Problemas comunes](#problemas-comunes)

## Herramientas de depuración

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

Ejecuta:

```bash
npx playwright test --debug
```

Abre el inspector de Playwright para depuración visual de pruebas E2E.

### 3. Console.log

Agrega `console.log` en el código para depuración rápida:

```typescript
console.log('Debug:', { variable, value });
```

### 4. Browser DevTools

Para pruebas E2E, usa `--headed` para ver el navegador:

```bash
npx playwright test --headed
```

## Depuración de pruebas de integración

### Ver output detallado

Ejecuta:

```bash
npm test -- --reporter=verbose
```

### Ejecutar en modo watch con depuración

Ejecuta:

```bash
npm run test:watch
```

Presiona `p` en la terminal para filtrar por patrón de archivo.

### Depurar una prueba específica

1. Agrega `.only` a la prueba:

```typescript
it.only('should do something', () => {
  // ...
});
```

2. Ejecuta la prueba:

```bash
npm test
```

3. Elimina `.only` después de depurar.

### Ver stack trace completo

Ejecuta:

```bash
npm test -- --no-coverage
```

### Depuración de pruebas async

Usa `await` correctamente y agrega timeouts:

```typescript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
}, 10000); // 10s timeout
```

## Depuración de pruebas E2E

### Usar Playwright Inspector

Ejecuta:

```bash
npx playwright test --debug
```

El inspector permite:

- Ver cada paso de la prueba
- Inspeccionar el DOM
- Ejecutar pruebas paso a paso
- Ver network requests

### Ejecutar en modo headed

Ejecuta:

```bash
npx playwright test --headed
```

Permite ver el navegador mientras se ejecutan las pruebas.

### Ver screenshots de fallos

Los screenshots se guardan en `test-results/` automáticamente cuando una prueba falla.

### Grabar video de pruebas

En `playwright.config.ts`:

```typescript
export default defineConfig({
  use: {
    video: 'retain-on-failure',
  },
});
```

### Depurar selectores

Usa el Playwright Codegen para generar selectores:

```bash
npx playwright codegen http://localhost:3000
```

### Ver network requests

En `playwright.config.ts`:

```typescript
export default defineConfig({
  use: {
    trace: 'on',
  },
});
```

Luego revisa el trace en el reporte.

### Timeout problems

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

## Depuración del servidor Next.js

### Ver errores de compilación

Ejecuta:

```bash
npm run dev
```

Los errores de compilación se muestran en la terminal y en el navegador.

### Ver errores de runtime

1. Abre el navegador
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña "Console"
4. Revisa los errores

### Ver source maps

Asegúrate de que `next.config.ts` tenga:

```typescript
module.exports = {
  productionBrowserSourceMaps: true,
};
```

### Depuración de API routes

1. Agrega `console.log` en la ruta API
2. Revisa la terminal del servidor
3. Usa tools como Postman o curl para probar la ruta

```bash
curl http://localhost:3000/api/projects
```

### Ver builds de desarrollo

Ejecuta:

```bash
npm run build
```

Revisa los warnings y errores de build.

## Depuración de Firebase

### Ver emuladores

Ejecuta:

```bash
firebase emulators:start
```

Abre http://localhost:4000 para ver la UI de emuladores.

### Depuración de Firestore Rules

1. Abre la UI de emuladores
2. Ve a "Firestore"
3. Revisa los logs de operations

### Depuración de Auth

Ejecuta:

```bash
firebase emulators:start --only auth
```

Abre http://localhost:9099 para ver la UI de Auth emulator.

### Ver logs de Firebase

En el código, agrega logging:

```typescript
import { getFirestore } from 'firebase/firestore';

const db = getFirestore();
console.log('Firestore instance:', db);
```

### Depuración de rules tests

Ejecuta:

```bash
npm run test:rules
```

Revisa el output para ver qué rules fallaron.

## Depuración de build

### Ver build logs

Ejecuta:

```bash
npm run build
```

Revisa los warnings y errores de build.

### Ver bundle size

Ejecuta:

```bash
npm run build:analyze
```

Abre el reporte de análisis para ver el tamaño de bundles.

### Depuración de Webpack

Agrega modo verbose en `next.config.ts`:

```typescript
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      console.log('Webpack config:', config);
    }
    return config;
  },
};
```

### Ver build output

El build output está en `.next/`. Revisa los archivos generados.

## Problemas comunes

### 1. "Module not found"

Causa: dependencia no instalada o path incorrecto.

Solución:

```bash
npm install
# O instalar dependencia específica
npm install nombre-de-dependencia
```

### 2. "Cannot read property of undefined"

Causa: intentando acceder a una propiedad de `undefined`.

Solución:

```typescript
// Agregar validación
if (obj && obj.property) {
  // usar obj.property
}

// O usar optional chaining
const value = obj?.property;
```

### 3. "Network request failed"

Causa: API no responde o firewall bloqueando.

Solución:

- Verifica que el servidor esté corriendo
- Verifica que el puerto sea correcto
- Verifica firewall/antivirus

### 4. "Timeout exceeded"

Causa: operación tarda más del timeout permitido.

Solución:

- Aumenta el timeout
- Optimiza la operación
- Verifica la red

### 5. "Too many open files"

Causa: límite de archivos abiertos del sistema.

Solución:

```bash
# En Linux/Mac
ulimit -n 65536

# En Windows
# Revisar configuración del sistema
```

### 6. "Out of memory"

Causa: memoria insuficiente.

Solución:

```bash
# Aumentar memoria de Node
node --max-old-space-size=4096 node_modules/.bin/vitest
```

### 7. "Port already in use"

Causa: el puerto ya está en uso por otro proceso.

Solución:

```bash
# En Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# En Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### 8. "ESLint error"

Causa: código no cumple con las reglas de ESLint.

Solución:

```bash
npm run lint:fix
```

### 9. "TypeScript error"

Causa: código no cumple con tipos de TypeScript.

Solución:

```bash
npm run type-check
```

### 10. "Firebase emulator not running"

Causa: emuladores no iniciados.

Solución:

```bash
firebase emulators:start
```

## Tips de depuración

1. **Divide y vencerás**
   - Aísla el problema en el código más pequeño posible
   - Prueba cada componente individualmente

2. **Usa console.log estratégicamente**
   - Agrega logs en puntos clave del flujo
   - Usa `console.table` para arrays/objetos
   - Elimina logs después de depurar

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

## Recursos adicionales

- [VS Code Debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Vitest Debugging](https://vitest.dev/guide/debugging.html)
- [Next.js Debugging](https://nextjs.org/docs/app/building-your-application/debugging)
- [Firebase Debugging](https://firebase.google.com/docs/emulator-suite/debug)

**Última actualización:** 27 de octubre de 2026
