# Herramientas de Desarrollo Modernas

Este documento describe las herramientas y procesos modernos implementados en el proyecto ConstructERP Guatemala para mantener el código actualizado, seguro y de alta calidad.

---

## 📋 Índice

1. [Herramientas de Formato y Linting](#herramientas-de-formato-y-linting)
2. [Herramientas de Git](#herramientas-de-git)
3. [Herramientas de PWA](#herramientas-de-pwa)
4. [Herramientas de Optimización](#herramientas-de-optimización)
5. [Herramientas de Calidad](#herramientas-de-calidad)
6. [Scripts Disponibles](#scripts-disponibles)

---

## 🎨 Herramientas de Formato y Linting

### Prettier

**Descripción**: Formateador de código automático para mantener consistencia en todo el proyecto.

**Configuración**: `.prettierrc`

**Uso**:

```bash
# Formatear todos los archivos
npm run format

# Verificar formato sin modificar
npm run format:check
```

**Reglas principales**:

- Comas al final (trailing commas)
- Comillas simples
- 2 espacios de indentación
- Ancho de línea: 100 caracteres
- Soporte para Tailwind CSS (plugin)

**Ignorar archivos**: `.prettierignore`

---

### ESLint

**Descripción**: Linter para JavaScript/TypeScript que detecta errores y problemas de código.

**Uso**:

```bash
# Verificar errores
npm run lint

# Corregir errores automáticamente
npm run lint:fix
```

**Integración**: Configurado con `lint-staged` para ejecutarse en pre-commit.

---

## 🔧 Herramientas de Git

### Husky

**Descripción**: Hooks de Git automatizados para asegurar calidad antes de commits.

**Configuración**: `.husky/`

**Hooks activos**:

- `pre-commit`: Ejecuta `lint-staged` para formatear y lint archivos modificados
- `commit-msg`: Valida el formato del mensaje de commit con Commitlint

---

### Commitlint

**Descripción**: Valida que los mensajes de commit sigan el formato convencional.

**Configuración**: `commitlint.config.js`

**Formato de commits**:

```
<tipo>(<alcance>): <descripción>

Tipos permitidos:
- feat: Nueva funcionalidad
- fix: Corrección de bug
- docs: Cambios en documentación
- style: Cambios de formato (espacios, comas, etc.)
- refactor: Refactorización de código
- perf: Mejoras de rendimiento
- test: Agregar o modificar pruebas
- chore: Tareas de mantenimiento
- revert: Revertir un commit anterior
- build: Cambios en build system
- ci: Cambios en CI/CD
- type: Cambios en tipos TypeScript

Alcances permitidos:
- auth, firebase, api, components, types, hooks, pwa, tests, lint, deps, security

Ejemplos:
✅ feat(auth): agregar validación de tokens
✅ fix(api): corregir error en endpoint de login
✅ style(components): formatear componentes UI
❌ actualizar cosas
❌ fix bug en login
```

---

### Lint-staged

**Descripción**: Ejecuta linters/formatters solo en archivos que se van a commit.

**Configuración**: `.lintstagedrc.json`

**Acciones por tipo de archivo**:

- `.ts, .tsx, .js, .jsx`: ESLint (fix) + Prettier
- `.json, .md, .yml, .yaml`: Prettier
- `.css, .scss`: Prettier

---

## 📱 Herramientas de PWA

### PWA Asset Generator

**Descripción**: Genera automáticamente todos los tamaños de iconos para PWA.

**Uso**:

```bash
npm run pwa:generate-icons
```

**Requisitos**:

- Icono fuente: `public/assets/branding/icon-512x512.png`
- Instalado: `pwa-asset-generator`

**Salida**: Iconos generados en `public/assets/branding/generated/`

---

### PWA Manifest Validator

**Descripción**: Valida que el manifiesto PWA sea correcto y todos los iconos existan.

**Uso**:

```bash
npm run pwa:validate-manifest
```

**Validaciones**:

- Existencia de todos los iconos referenciados
- Campos requeridos presentes
- Tamaños de iconos correctos
- Shortcuts válidos

---

### Service Worker Generator

**Descripción**: Genera un Service Worker con caching estratégico para PWA.

**Uso**:

```bash
npm run pwa:generate-sw
```

**Características**:

- Cache First para activos estáticos
- Network First para navegación
- Soporte para offline
- Push notifications
- Background sync

---

## 🚀 Herramientas de Optimización

### Sharp (Image Optimizer)

**Descripción**: Optimiza imágenes automáticamente reduciendo tamaño sin perder calidad.

**Uso**:

```bash
npm run images:optimize
```

**Salida**: Imágenes optimizadas en `public/assets/branding/optimized/`

**Optimizaciones**:

- Compresión PNG (quality: 85, compressionLevel: 9)
- Conversión a formatos modernos
- Reducción automática de tamaño

---

### Next.js Bundle Analyzer

**Descripción**: Analiza el tamaño de los bundles de producción para identificar dependencias pesadas.

**Uso**:

```bash
npm run build:analyze
```

**Salida**: Reporte interactivo en el navegador mostrando:

- Tamaño de cada chunk
- Dependencias por chunk
- Oportunidades de optimización

---

## ✅ Herramientas de Calidad

### TypeScript Type Check

**Descripción**: Verifica errores de tipo en TypeScript sin compilar.

**Uso**:

```bash
npm run type-check
```

**Equivalente**: `npx tsc --noEmit`

---

### Vitest (Test Runner)

**Descripción**: Ejecuta pruebas unitarias con alta velocidad.

**Uso**:

```bash
# Ejecutar todas las pruebas
npm test

# Modo watch (desarrollo)
npm run test:watch

# Con reporte de cobertura
npm run test:coverage

# Pruebas de Firestore rules
npm run test:rules

# Pruebas con emuladores Firebase
npm run test:emulator
```

---

### Dependency Checker

**Descripción**: Verifica dependencias desactualizadas y vulnerabilidades.

**Uso**:

```bash
npm run deps:check
```

**Verifica**:

- Paquetes desactualizados (`npm outdated`)
- Vulnerabilidades de seguridad (`npm audit`)

---

## 📜 Scripts Disponibles

### Desarrollo

```bash
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Compilar para producción
npm run build:analyze    # Compilar con análisis de bundles
npm run start            # Iniciar servidor de producción
```

### Calidad

```bash
npm run lint             # Verificar errores ESLint
npm run lint:fix         # Corregir errores ESLint
npm run format           # Formatear código con Prettier
npm run format:check     # Verificar formato sin modificar
npm run type-check       # Verificar tipos TypeScript
npm test                 # Ejecutar pruebas
npm run test:watch       # Ejecutar pruebas en modo watch
npm run test:coverage    # Ejecutar pruebas con cobertura
```

### PWA

```bash
npm run pwa:generate-icons      # Generar iconos PWA
npm run pwa:validate-manifest   # Validar manifiesto PWA
npm run pwa:generate-sw         # Generar Service Worker
```

### Optimización

```bash
npm run images:optimize   # Optimizar imágenes
npm run deps:check        # Verificar dependencias
```

---

## 🔄 Flujo de Trabajo Recomendado

### Antes de Commit

1. **Formatear código**:

   ```bash
   npm run format
   ```

2. **Verificar tipos**:

   ```bash
   npm run type-check
   ```

3. **Ejecutar pruebas**:

   ```bash
   npm test
   ```

4. **Hacer commit** (Husky ejecutará lint-staged automáticamente):
   ```bash
   git add .
   git commit -m "feat(components): agregar nuevo componente"
   ```

### Antes de Deploy

1. **Analizar bundles**:

   ```bash
   npm run build:analyze
   ```

2. **Verificar dependencias**:

   ```bash
   npm run deps:check
   ```

3. **Validar PWA**:

   ```bash
   npm run pwa:validate-manifest
   ```

4. **Compilar**:
   ```bash
   npm run build
   ```

---

## 📖 Recursos Adicionales

- [Documentación Prettier](https://prettier.io/docs/en/)
- [Documentación ESLint](https://eslint.org/docs/latest/)
- [Documentación Husky](https://typicode.github.io/husky/)
- [Documentación Commitlint](https://commitlint.js.org/)
- [Documentación Vitest](https://vitest.dev/)
- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

---

## 🆘 Solución de Problemas

### Husky no funciona después de `npm install`

```bash
npm run prepare
```

### Lint-staged no ejecuta

Verifica que `.husky/pre-commit` tenga:

```bash
npx lint-staged
```

### Commitlint rechaza commits

Usa el formato correcto:

```
tipo(alcance): descripción
```

### Prettier formatea incorrectamente

Revisa `.prettierrc` y `.prettierignore`

---

## 📝 Notas

- Todos los scripts están en `scripts/`
- Configuraciones en raíz del proyecto
- Hooks Git en `.husky/`
- Los scripts de PWA generan archivos pero no los reemplazan automáticamente

---

**Última actualización**: Enero 2026
**Versión**: 1.0.0
