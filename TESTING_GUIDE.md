---
contentType: Guide
title: Guía de ejecución de pruebas — ORIGEN ERP
---

# Guía de ejecución de pruebas — ORIGEN ERP

Esta guía documenta cómo ejecutar las pruebas del sistema ORIGEN ERP.

## Tabla de contenidos

- Pruebas de integración
- Pruebas E2E
- Solución de problemas

## Pruebas de integración

Las pruebas de integración validan la lógica de negocio, componentes, hooks, servicios y configuración sin requerir un navegador.

### Ejecutar todas las pruebas

```bash
npm test
```

### Ejecutar en modo watch

```bash
npm run test:watch
```

Este modo monitorea los cambios en los archivos y re-ejecuta las pruebas automáticamente.

### Ejecutar con reporte de cobertura

```bash
npm run test:coverage
```

Genera un reporte de cobertura en el directorio `coverage/`.

### Ejecutar un archivo específico

```bash
npm test lib/__tests__/security-integration.test.ts
```

### Ejecutar pruebas con un patrón

```bash
npm test -- security
```

Ejecuta todas las pruebas que contienen "security" en el nombre.

## Pruebas E2E

Las pruebas E2E validan el sistema completo usando Playwright con navegadores reales.

### Prerrequisitos

- Node.js 18 o superior
- Navegadores instalados (Chromium, Firefox, WebKit)
- Servidor de desarrollo en ejecución (para algunas pruebas)

### Ejecutar todas las pruebas E2E

```bash
npx playwright test
```

### Ejecutar pruebas E2E en un navegador específico

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Ejecutar pruebas E2E en móvil

```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Ver reporte HTML

```bash
npx playwright show-report
```

### Ejecutar prueba específica

```bash
npx playwright test e2e/auth.spec.ts
```

## Solución de problemas

### Pruebas fallan por timeout

Aumenta el tiempo de espera en `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60000,
});
```

### Errores de dependencias

Ejecuta:

```bash
npm install
npx playwright install
```

### Problemas de conexión con Firebase

Verifica que las variables de entorno estén configuradas en `.env.local` y que el emulador de Firebase esté en ejecución:

```bash
firebase emulators:start
```

## Comandos rápidos

| Acción                | Comando                      |
| --------------------- | ---------------------------- |
| Todas las pruebas     | `npm test`                   |
| Pruebas con cobertura | `npm run test:coverage`      |
| Modo watch            | `npm run test:watch`         |
| Todas las E2E         | `npx playwright test`        |
| Reporte HTML          | `npx playwright show-report` |
| Instalar navegadores  | `npx playwright install`     |
