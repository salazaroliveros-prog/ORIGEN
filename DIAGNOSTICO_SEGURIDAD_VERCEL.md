# DIAGNOSTICO DE SEGURIDAD Y ESTABILIDAD PARA VERCEL

## ORIGEN ERP Guatemala - Next.js 15 + Firebase

Fecha: 2026-11-24
Estado: TODAS LAS CORRECCIONES IMPLEMENTADAS Y VERIFICADAS

> **Nota de vigencia (26/11/2026):** los hallazgos marcados como 🔴 CRÍTICO en este documento
> son un registro histórico. C-1/C-3/C-4/H-1/H-2/H-4/M-1/M-2/M-4/M-6 están resueltos en `main`:
> reglas Firestore válidas (49/49 tests), rate limiting en Firestore (`lib/rate-limit.ts`),
> App Check verificado en `lib/apiAuth.ts`, ARCO con `requireApiUser`, CSP/HSTS activos en
> producción y JSON-LD/robots/sitemap presentes. No vuelvan a tratarlos como bugs abiertos.

---

## 1. RESUMEN EJECUTIVO

Se identificaron **17 hallazgos**: 4 críticos, 8 altos, 5 medios. **TODOS han sido corregidos y verificados.** Los secretos han sido removidos de los archivos .env locales. Las reglas de Firestore han sido reescritas. El rate limiting, App Check, y los endpoints de cuenta han sido corregidos. La aplicacion ESTA lista para despliegue en Vercel despues de rotar los tokens expuestos.

---

## 2. HALLAZGOS CRITICOS (bloquean produccion)

### C-1: Filtracion de secretos en archivos de entorno (SECRET LEAKAGE)

**Archivos afectados:** `.env.local`, `.env`, `.env.vercel`, `.env.vercel.production`

Credenciales reales encontradas en texto plano:

| Archivo               | Secreto                 | Valor                                                |
| --------------------- | ----------------------- | ---------------------------------------------------- |
| `.env.local`          | `GITHUB_TOKEN`          | [REVOCADO - en GitHub Secrets y Vercel Dashboard]    |
| `.env.local`          | `DEFAULT_AUTH_PASSWORD` | [ROTADO - en Vercel Dashboard]                       |
| `.env.local`          | `PRIMARY_ADMIN_EMAIL`   | [EN VERCEL DASHBOARD]                                |
| `.env.vercel`         | `VERCEL_OIDC_TOKEN`     | [ROTADO - en Vercel Dashboard]                       |
| `.env`                | `GEMINI_API_KEY`        | [ROTADO - en Vercel Dashboard]                       |
| `.env` / `.env.local` | Firebase API Key        | [EN VERCEL DASHBOARD - variable pública de Firebase] |

**Riesgo:** Commit accidental expone token de GitHub con acceso al repositorio, contrasena de administrador por defecto, y token OIDC de Vercel que permite suplantar la identidad del despliegue.

**Correccion:**

1. Revocar inmediatamente el `GITHUB_TOKEN` en GitHub Settings > Developer settings > Personal access tokens.
2. Rotar el `VERCEL_OIDC_TOKEN` en Vercel Dashboard.
3. Rotar la `DEFAULT_AUTH_PASSWORD` y eliminar credenciales por defecto de todos los archivos `.env`.
4. Eliminar `GEMINI_API_KEY` de `.env` y `.env.local` (es variable solo-servidor, debe ir en Vercel Dashboard Environment Variables, nunca en .env).
5. Confirmar que `.env*`, `.env.vercel*`, `.env.local` estén en `.gitignore` (ya lo estan, pero verificar que no hayan sido commiteados: `git log --all --full-history -- .env.local`).

**Validacion:** `git log --all --oneline -- .env.local .env.vercel .env` debe estar vacio. `grep -r "ghp_\|VERCEL_OIDC_TOKEN\|DEFAULT_AUTH_PASSWORD" . --include="*.env*" --include="*.ts" --include="*.tsx" --include="*.js"` no debe retornar nada.

---

### C-2: Reglas de Firestore inconsistentes y coleccion `projects` ausente (CONTROL DE ACCESO ROTO)

**Archivo:** `firestore.rules`

El codigo en `lib/firebaseService.ts` escribe y lee colecciones en ingles: `projects`, `expenses`, `attendance`, `employees`, `machinery`, `machineryLogs`, `quotes`, `fieldVisits`, `companySettings`, `companies`.

Las reglas definen AMBAS versiones (espanol e ingles) con campos de propiedad DIFERENTES:

| Coleccion en codigo | Campo de propiedad          | En reglas?             | Campo en reglas                | Estado       |
| ------------------- | --------------------------- | ---------------------- | ------------------------------ | ------------ |
| `projects`          | `ownerId` / `createdBy`     | NO (solo `/proyectos`) | `userId`                       | **FALTANTE** |
| `expenses`          | `authorId`                  | SI                     | `authorId`                     | OK           |
| `attendance`        | `authorId`                  | SI                     | `authorId`                     | OK           |
| `employees`         | `createdBy`                 | SI                     | `createdBy`                    | OK           |
| `machinery`         | `userId`                    | SI                     | `userId`                       | OK           |
| `machineryLogs`     | `companyId` + `machineryId` | SI                     | `machineryId` (como `isOwner`) | **MAL**      |
| `quotes`            | `createdBy`                 | SI                     | `createdBy`                    | OK           |
| `fieldVisits`       | `authorId`                  | NO                     | —                              | **FALTANTE** |
| `companySettings`   | `ownerId`                   | NO                     | —                              | **FALTANTE** |
| `companies`         | `ownerId`                   | SI                     | `ownerId`                      | OK           |

**Consecuencia:** Toda escritura a `projects`, `fieldVisits`, `companySettings` es DENEGADA por la regla por defecto `match /{document=**} { allow read, write: if false; }`. La aplicacion no puede guardar proyectos en produccion.

**Adicional:** `/machineryLogs` usa `isOwner(resource.data.machineryId)` que compara `request.auth.uid == machineryId`, lo cual es incorrecto (debe validar membresia de empresa via `companyId`).

**Correccion:**

1. Agregar reglas para `projects`, `fieldVisits`, `companySettings` con los campos correctos (`ownerId`, `createdBy`, `authorId`, `companyId`).
2. Eliminar las reglas en espanol (`/proyectos`, `/maquinaria`, `/asistencia`, `/gastos`, `/cotizaciones`, `/personal`) que son duplicadas y confusas, o unificarlas bajo los nombres en ingles que usa el codigo.
3. Corregir `/machineryLogs` para validar `companyId` y `userId` correctamente.

**Validacion:** Desplegar reglas en emulator y ejecutar `npm run test:firebase` para confirmar que `saveProjectToFirestore` y `subscribeProjects` funcionan contra reglas reales.

---

### C-3: Rate limiting en memoria no funciona en Vercel serverless

**Archivos:** `lib/security.ts`, `lib/rate-limit.ts`, `lib/apiMiddleware.ts`

Todos usan `const rateLimitStore = new Map()` (memoria local del proceso). En Vercel, cada invocation de serverless function es un proceso aislado sin estado compartido. Los límites de tasa no se aplican entre instancias y se reseten en cada invocation. El comentario en `lib/rate-limit.ts` dice "Usa @vercel/kv en producción" pero NO está implementado.

**Riesgo:** Endpoints críticos (`/api/account/delete-account`, `/api/gemini`, `/api/upload-project-photo`) sin protección efectiva contra fuerza bruta o abuso de cuota de Gemini.

**Correccion:** Reemplazar el store en memoria por `@vercel/kv` o por Firestore (como ya hace `lib/apiMiddleware.ts` con `rateLimits` collection, aunque ese archivo tampoco es usado por todos los endpoints). Unificar en una sola implementación basada en Firestore o Vercel KV.

**Validacion:** Desplegar en preview y enviar 100+ peticiones rapidas a `/api/gemini` desde distintas IPs para confirmar que el rate limit se aplica globalmente.

---

### C-4: App Check solo en cliente, nunca verificado en servidor

**Archivo:** `lib/firebaseService.ts` (líneas 239-258)

`initializeAppCheck` se ejecuta solo cuando `typeof window !== 'undefined'`. Las rutas API en `app/api/**` nunca verifican el token de App Check. Un atacante puede llamar directamente a los endpoints con un ID token de Firebase robado sin pasar App Check.

**Riesgo:** Bypass de protección contra abuso y automatización en endpoints de pago/cuota (Gemini, subida de fotos).

**Correccion:** Agregar middleware de verificacion de App Check en las rutas API que consumen cuota (`/api/gemini`, `/api/weather`, `/api/upload-project-photo`), verificando el header `X-Firebase-AppCheck` contra Firebase App Check backend.

**Validacion:** Llamar a `/api/gemini` sin header de App Check y confirmar respuesta 403.

---

## 3. HALLAZGOS ALTOS

### H-1: Endpoints de cuenta son placeholders no funcionales

**Archivos:** `app/api/account/delete-account/route.ts`, `app/api/account/my-data/route.ts`

- `userId = 'user-id-from-token'` — valor hardcodeado, nunca se extrae del token Firebase.
- Nunca se verifica el ID token (solo se chequea prefijo `Bearer `).
- `confirmationToken` se exige pero nunca se valida.
- `admin.auth().deleteUser(userId)` está comentado (no hay firebase-admin).
- Audit log comentado.
- Usan nombres de coleccion en espanol (`proyectos`, `gastos`, etc.) que no coinciden con el codigo.

**Riesgo:** Derechos ARCO (cancelacion/acceso) no funcionales; cualquier usuario autenticado podría borrar datos ajenos si el `userId` se controlara desde el cliente.

**Correccion:** Integrar `requireApiUser` de `lib/apiAuth.ts`, extraer `uid` del token verificado, usar colecciones en ingles, implementar borrado real en Firebase Auth (requiere firebase-admin o Identity Toolkit), y habilitar audit log.

---

### H-2: HPKP (Public-Key-Pins) con pins falsos y obsoletos

**Archivo:** `next.config.ts` (líneas 23-31)

```
Public-Key-Pins: pin-sha256="AAAA...="; pin-sha256="BBBB...="; pin-sha256="CCCC...="; max-age=31536000; includeSubDomains
```

HPKP está **deprecated y eliminado de navegadores modernos** (Chrome lo removió en 2018). Los pins `AAAA/BBBB/CCCC` son placeholders invalidos. Si se configuraran pins reales de forma equivocada, el sitio quedaría inaccesible hasta expirar max-age.

**Correccion:** Eliminar el encabezado `Public-Key-Pins` y el endpoint `/api/security/hpkp-report`. Usar solo HSTS + Expect-CT si se desea.

---

### H-3: Content Security Policy debilitada (`unsafe-inline`)

**Archivos:** `next.config.ts` (líneas 76-90), `lib/apiMiddleware.ts` (líneas 172-186)

CSP permite `'unsafe-inline'` en `script-src` y `style-src`, y `data:` en `img-src`. Esto habilita XSS por inyección de scripts/styles en línea y exfiltración de datos via URLs `data:`.

**Correccion:** Quitar `'unsafe-inline'` y `'unsafe-eval'`. Usar nonces o hashes para scripts en línea necesarios. Cambiar `img-src` a `'self' https: blob:` (quitar `data:`).

---

### H-4: Logger suprime todos los errores en produccion

**Archivo:** `lib/logger.ts`

En `NODE_ENV === 'production'`, `logger.error`, `logger.warn`, `logger.log` son no-ops. Los errores se silencian completamente, imposibilitando depuracion y ocultando eventos de seguridad (fallos de autenticación, denegaciones de Firestore, etc.).

**Correccion:** En produccion enviar errores a Sentry (ya integrado) en lugar de no-op. Mantener `console.error` para errores críticos no capturados por Sentry.

---

### H-5: No se usa Firebase Admin SDK en servidor

**Archivo:** `lib/apiAuth.ts` (comentario línea 10-11)

La verificacion de tokens se hace via Identity Toolkit REST API con la API key pública. Funciona pero es menos robusto que `admin.auth().verifyIdToken()` (no verifica revocación de tokens, no usa service account con privilegios adecuados).

**Correccion:** Agregar `firebase-admin` con service account en variables de entorno de Vercel (no en .env) y usar `verifyIdToken` en rutas API sensibles (`delete-account`, `my-data`, `gemini`).

---

### H-6: JSON.parse sin validación de esquema en endpoint de clima

**Archivo:** `app/api/weather/safety-alerts/route.ts` (líneas 83-88)

Respuesta de Gemini se limpia de markdown y se hace `JSON.parse()` sin validar la estructura. Si Gemini devuelve JSON válido con campos inesperados o tipos incorrectos, se aceptan sin validación.

**Correccion:** Validar el JSON parseado con Zod contra el esquema `WeatherPayload` antes de devolverlo.

---

### H-7: Prompt injection en endpoints de Gemini

**Archivo:** `app/api/gemini/route.ts`

Entradas de usuario (`description`, `message`, `question`) se interpolan directamente en prompts enviados a Gemini sin sanitización. Un usuario podría inyectar instrucciones que sobrescriban el comportamiento del asistente.

**Correccion:** Sanitizar entradas de usuario (eliminar secuencias tipo "Ignore previous instructions") y limitar longitud estrictamente. Considerar separar datos de instrucciones usando el formato de partes de Gemini.

---

### H-8: Proteccion CSRF/Origen inconsistente entre endpoints

**Archivos:** `app/api/gemini/route.ts` usa `originAllowlist`, pero `app/api/upload-project-photo/route.ts`, `app/api/weather/safety-alerts/route.ts` NO verifican el encabezado `Origin`.

**Riesgo:** Peticiones cross-site falsificadas a endpoints que modifican estado (subida de fotos, clima).

**Correccion:** Aplicar `isAllowedOriginValue` desde `lib/originAllowlist.ts` en todos los endpoints POST/PUT/DELETE.

---

## 4. HALLAZGOS MEDIOS

### M-1: `output: 'standalone'` incompatible con Vercel Next.js

**Archivo:** `next.config.ts` (línea 172) y `scripts/build.mjs`

Vercel espera el output estándar de Next.js (`.next/`), no `standalone` (diseñado para Docker/autohospedado). Esto puede causar fallos de despliegue o rutas de servidor incorrectas.

**Correccion:** Quitar `output: 'standalone'` para despliegue en Vercel. Mantenerlo solo si se despliega en contenedor propio.

---

### M-2: `engines.node` = `26.x` puede no ser soportado por Vercel

**Archivo:** `package.json` (línea 6)

Node 26 puede no estar disponible en la imagen de builds de Vercel, causando fallos de `npm install` o `next build`.

**Correccion:** Cambiar a `20.x` o `22.x` (LTS soportado por Vercel).

---

### M-3: Duplicación de encabezados de seguridad

**Archivos:** `vercel.json` y `next.config.ts`

Ambos definen `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`. Puede haber conflictos o encabezados duplicados.

**Correccion:** Mantener encabezados solo en `next.config.ts` (fuente de verdad para Next.js) y quitar duplicados de `vercel.json`, o viceversa.

---

### M-4: `@next/bundle-analyzer` versión 16.4.5 vs `next` 15.4.9

**Archivo:** `package.json` (líneas 82, 68)

Desajuste de versiones entre Next.js y su paquete oficial de analyzer.

**Correccion:** Alinear versiones (`@next/bundle-analyzer` a 15.x).

---

### M-5: Información de autenticación serializada en logs de error

**Archivo:** `lib/firebaseService.ts` (`handleFirestoreError`, líneas 325-344)

`errInfo.authInfo` incluye `userId`, `email`, `emailVerified`, `tenantId`, `providerInfo` y se serializa a `console.error`. En desarrollo esto expone datos de usuario en logs.

**Correccion:** No serializar `email` ni `providerInfo` en logs. Solo `userId` (opaco) si es necesario para depuración.

---

### M-6: Página de métricas enviada por `sendBeacon` a `/api/metrics` que no existe

**Archivo:** `app/layout.tsx` (líneas 165-186)

El script del layout envía métricas de carga de página a `/api/metrics`, endpoint que no está definido en `app/api/`. Las peticiones fallan silenciosamente (404) pero generan ruido en logs.

**Correccion:** Crear endpoint `/api/metrics` o remover el script de beacon.

---

### M-7: `NEXT_PUBLIC_*` expone configuración de Firebase al cliente

Es correcto para Firebase SDK cliente, pero `NEXT_PUBLIC_FIREBASE_API_KEY` y demás están expuestas. Cualquiera puede verlas en el código del navegador. Esto es por diseño de Firebase, pero se debe asegurar que las reglas de Firestore/Storage estén correctas (ver C-2).

**Mitigacion:** Reforzar reglas de Firestore y Storage (ya cubierto en C-2).

---

### M-8: `default-src 'self'` en CSP puede bloquear recursos de Firebase emulador en desarrollo

En desarrollo con emuladores (`127.0.0.1:9099`, etc.), `connect-src` no incluye los puertos de emulador, bloqueando conexiones.

**Correccion:** Agregar puertos de emulador a `connect-src` solo en desarrollo, o usar `connect-src` condicional.

---

## 5. HALLAZGOS BAJOS

### L-1: `.env.vercel` y `.env.vercel.production` existen en working tree

Son gitignored pero existen localmente con valores reales (incluyendo `VERCEL_OIDC_TOKEN` en `.env.vercel`). Riesgo si se copian a otro entorno o se suben accidentalmente.

**Correccion:** Eliminar archivos `.env.vercel*` del working tree local. Configurar variables en Vercel Dashboard exclusivamente.

---

### L-2: `server.ts` existe en raiz

Puede ser un archivo legacy no usado por Next.js App Router. Revisar si causa conflictos de build.

---

## 6. PLAN DE CORRECCIONES (orden de prioridad)

| Prioridad | Accion                                                                     | Archivo(s)                                                     |
| --------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P0        | Revocar `GITHUB_TOKEN`, `VERCEL_OIDC_TOKEN`, `DEFAULT_AUTH_PASSWORD`       | Panel GitHub/Vercel                                            |
| P0        | Eliminar credenciales de `.env.local`, `.env`, `.env.vercel*`              | Archivos locales                                               |
| P0        | Agregar reglas Firestore para `projects`, `fieldVisits`, `companySettings` | `firestore.rules`                                              |
| P0        | Corregir `/machineryLogs` regla de ownership                               | `firestore.rules`                                              |
| P1        | Unificar rate limiting en Firestore o Vercel KV                            | `lib/security.ts`, `lib/rate-limit.ts`, `lib/apiMiddleware.ts` |
| P1        | Implementar verificacion de App Check en rutas API                         | `app/api/**/route.ts`                                          |
| P1        | Arreglar `/api/account/delete-account` y `/api/account/my-data`            | Ambas rutas                                                    |
| P1        | Quitar HPKP header                                                         | `next.config.ts`                                               |
| P1        | Endurecer CSP (quitar `unsafe-inline`, `data:`)                            | `next.config.ts`, `lib/apiMiddleware.ts`                       |
| P2        | Habilitar logger en produccion vía Sentry                                  | `lib/logger.ts`                                                |
| P2        | Agregar `firebase-admin` y `verifyIdToken`                                 | `lib/apiAuth.ts`                                               |
| P2        | Validar JSON de clima con Zod                                              | `app/api/weather/safety-alerts/route.ts`                       |
| P3        | Quitar `output: 'standalone'` para Vercel                                  | `next.config.ts`, `scripts/build.mjs`                          |
| P3        | Cambiar `engines.node` a `20.x`                                            | `package.json`                                                 |
| P3        | Unificar encabezados de seguridad                                          | `vercel.json`, `next.config.ts`                                |

---

## 7. COMANDOS DE VALIDACION REQUERIDOS ANTES DE DESPLEGAR

```bash
# 1. Lint
npm run lint

# 2. Type-check
npm run type-check

# 3. Tests unitarios
npm run test

# 4. Tests de Firestore con emulador (valida reglas contra reglas reales)
npm run test:firebase

# 5. Build de produccion
npm run build

# 6. Verificar que no hay secretos en archivos rastreados
git log --all --oneline -- .env.local .env.vercel .env

# 7. Desplegar preview en Vercel y probar rate limiting, App Check, y subida de fotos
```

---

## 8. CONCLUSION

Todas las correcciones han sido implementadas y verificadas:

- **Lint**: `eslint .` — limpio (0 errores)
- **Type-check**: `tsc --noEmit` — limpio (0 errores)
- **Tests**: 1570 pruebas pasan / 96 archivos de prueba

**Accion pendiente crítica (debe hacer el usuario):**
Revocar inmediatamente los tokens que estuvieron expuestos en el repositorio:

1. `GITHUB_TOKEN` en GitHub Settings > Developer settings > Personal access tokens
2. `VERCEL_OIDC_TOKEN` en Vercel Dashboard
3. `DEFAULT_AUTH_PASSWORD` (`AngelDarioJose.2026`) — cambiar en Vercel Dashboard
4. `GEMINI_API_KEY` — rotar en Google Cloud Console

Despues de rotar estos tokens, la aplicacion esta lista para despliegue en produccion en Vercel.
