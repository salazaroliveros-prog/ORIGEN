# AGENTS.md

Next.js 15 App Router + React 19 + strict TypeScript ERP de construcción (Guatemala). Firebase Auth/Firestore/Storage (cliente + admin). Node >=20 / npm >=10; CI usa Node 24 (`ci.yml`), `main.yml` usa 26.

## Mapa real del código

- `app/` rutas y `app/api/**` route handlers; `components/` UI compartida; `lib/` lógica de dominio, cálculos, Firebase, validación y hooks; `features/` módulos; `e2e/` Playwright; `scripts/` dev/build/seed.
- El shell real es **`components/main-app/MainApp.tsx`**: `app/page.tsx` → `ClientOnlyApp` → `main-app/MainApp`. El antiguo `components/MainApp.tsx` fue eliminado; no lo restaures.
- `docs/` y los `*_SUMMARY|*_REPORT|*_GUIDE.md` de la raíz son resúmenes históricos, **no fuente de verdad**. Si documentación y configuración/scripts difieren, manda el ejecutable.
- Tema: **solo `app/globals.css` se importa**. `lib/design-tokens.ts` lo usa `RegisterForm` + su test. `lib/design-system.ts` y `app/design-system.css` se eliminaron por duplicados.

## Comandos exactos

- Install: `npm ci --no-audit --no-fund` (CI). Dev: `npm run dev` (`scripts/dev.mjs` → `next dev`, `-p 3000 -H 0.0.0.0`); emulado: `npm run dev:emulated`; emuladores: `npm run emulators` (auth 9099, firestore 8080, storage 9199).
- Verificación local: `npm run type-check` → `npm run lint` → `npm run format:check` → `npm run test` → `npm run build`. CI (`ci.yml`): lint → format:check → type-check → `pwa:validate-manifest` → test → `test:firebase` → build → E2E `--project=chromium`; el build necesita los secretos `NEXT_PUBLIC_FIREBASE_*`.
- Un test: `npm run test -- <pattern>` (p. ej. `npm run test -- calculations`) o `npx vitest run lib/__tests__/securityHeaders.test.ts`. Vitest: jsdom, include `lib/**/*.test.ts(x)` y `app/api/**/*.test.ts`, setup `vitest.setup.ts`, alias `@/*` → raíz.
- Reglas/CRUD Firebase: `npm run test:firebase` (49 tests; lanza sus propios emuladores vía `emulators:exec`). Para correrlos contra emuladores ya activos: exporta `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `GCLOUD_PROJECT=demo-origen-erp-test`, `FIREBASE_EMULATOR_HUB=127.0.0.1:4400`, `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199` y ejecuta `npx vitest run --config vitest.emulator.config.ts`.
- E2E: `npm run test:e2e` → `scripts/run-e2e.mjs` elige puerto libre, **lanza sus propios emuladores** y siembra credenciales efímeras desde `.env.e2e`. Detén los emuladores sueltos antes. `e2e/global-setup.ts` solo espera al servidor; el login real está en `e2e/testCredentials.ts` (`ensureAuthenticated`). Proyectos: `chromium` + `mobile-iphone/android/ipad/small` (no Firefox/WebKit).
- E2E semilla manual: `npm run e2e:seed` (usuario + empresa + membresía owner). Visual: `npm run test:visual:*` (configs de Playwright/Docker).

## Gotchas verificados

- **Nunca corras `npm run build` con el dev server vivo ni `type-check` en paralelo con el build**: ambos tocan `.next` / `.next/types` → `EADDRINUSE` o `TS6053` falso. Secuencia estricta: type-check → lint → test → build.
- `scripts/dev.mjs` repara symlinks `/app` y copia `package.json` ahí (artefacto de runtime); conserva ese comportamiento.
- Prettier `endOfLine: auto`: el repo mezcla CRLF. No reescribas finales de línea a mano. Hook: `.husky/pre-commit` → lint-staged (`eslint --fix` + `prettier --write`) + commitlint.
- `.env.local` y `.env.e2e` son ignorados. `NEXT_PUBLIC_*` es visible en cliente; `GEMINI_API_KEY`, `PRIMARY_ADMIN_EMAIL` y `ALLOWED_ORIGINS` son server-only. `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` hornea config de emulador en un build de producción: verifícalo antes de desplegar.
- `next.config.ts`: CSP/HSTS es **solo producción**; en dev se permite `'unsafe-eval'` (React Refresh) y los orígenes de `ORIGEN_DEV_ORIGINS`. Si abres la app desde Docker/otra IP, ajusta `NEXT_PUBLIC_FIREBASE_EMULATOR_HOST` y `ORIGEN_DEV_ORIGINS` a esa IP.
- `firestore.rules` es CEL: versiones regresadas con `var`/`setWhere` invalidan **todas** las escrituras. Valida siempre con la suite de emulador (49 tests).
- Estado real: 2FA no implementado; lockout local tras 5 intentos descartado (Firebase Auth ya hace throttling); `initSentry()` no está cableado y no hay DSN; GA4 tiene `trackEvent` pero no tiene consumidores. No afirmes lo contrario en docs.

## Vercel / producción

<!-- VERCEL BEST PRACTICES START -->
- Proyecto `proyectoswm/origen`, repo `salazaroliveros-prog/ORIGEN`, rama de producción `main`. Dominio canónico **`https://origen-one-kohl.vercel.app`**; los alias `origen-proyectoswm` y `origen-git-main-proyectoswm` apuntan al mismo deployment. No hay dominios custom.
- El canónico está repetido en `app/layout.tsx` (`metadataBase`/`alternates`), `lib/schema-org.tsx`, `public/robots.txt` y `public/sitemap.xml`: cámbialo en los cuatro juntos.
- `vercel.json` define build/install y headers de caché, **`crons: []`** y sin headers de seguridad (CSP/HSTS viven en `next.config.ts`). Las funciones son stateless: para programar tareas usa Cron Jobs (UTC, GET a la URL de producción), no daemon en memoria.
- Secrets en variables de entorno de Vercel, nunca en git ni en `NEXT_PUBLIC_*`. Sincroniza con `vercel pull` / `vercel env pull`. Si una URL de deployment protegido devuelve 401/403, reintenta con `vercel curl <url>`; no desactives la protección.
<!-- VERCEL BEST PRACTICES END -->
