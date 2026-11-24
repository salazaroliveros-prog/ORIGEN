# ORIGEN ERP System-wide Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Llevar ORIGEN ERP a un estado verificable y más seguro mediante correcciones de calidad, pruebas, reglas Firebase, CI y preparación de GitHub/Vercel.

**Architecture:** Mantener la separación Next.js App Router / `features` / `components` / `lib`, corregir primero los fallos reproducibles de tooling y después validar cada frontera: navegador, Firebase Emulator, reglas, build y despliegue. Los cambios remotos o irreversibles quedan condicionados a credenciales y autorización explícita.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.8 strict, Firebase Auth/Firestore/Storage, Firebase Emulator Suite, Vitest, Playwright, GitHub Actions y Vercel.

**Spec:** `AGENTS.md` y la solicitud del usuario de corregir, implementar, mejorar, refactorizar, tipar, ordenar, probar y validar el sistema completo.

## Global Constraints

- Mantener Node.js 24 y Firebase Emulator Suite con `firebase-tools@15.24.0`.
- No leer, imprimir, commitear ni enviar secretos de `.env*`, Vercel o GitHub.
- No debilitar reglas Firebase para hacer pasar pruebas.
- Preservar el soporte offline parcial y las fronteras server/client de Next.js.
- No hacer `git push` ni despliegue productivo sin autorización explícita y verificación previa.

## Review Focus

- Copias de worktree y artefactos generados no deben contaminar lint ni type-check.
- El warm-up E2E debe usar una API de red tipada y detectar correctamente la aplicación disponible.
- Las reglas deben proteger create/update, identidad, pertenencia de empresa/proyecto y límites de recursos.
- Los cambios de inventario deben seguir siendo atómicos y auditables.
- CI, GitHub y Vercel deben usar credenciales fuera del repositorio y apuntar al proyecto correcto.

### Task 1: Establish a clean local baseline

**Files:**

- Modify: `eslint.config.mjs`
- Modify: `.gitignore`
- Modify: `e2e/global-setup.ts`
- Test: existing lint, type-check, unit test and PWA commands

- [ ] Excluir `.worktrees/**` y cualquier salida generada local que pueda ser recorrida por ESLint.
- [ ] Reemplazar `fetch.fetch` por una llamada `fetch` válida y tipar el objeto de configuración E2E con el tipo de Playwright correspondiente.
- [ ] Ejecutar `npm run lint`, `npm run type-check`, `npm test`, y las validaciones PWA.

### Task 2: Firebase and Storage security audit

**Files:**

- Review: `firestore.rules`, `storage.rules`, `lib/firestore-emulator.test.ts`, `lib/storage-emulator.test.ts`
- Modify: rules and focused emulator tests only where a reproducible finding exists

- [ ] Comparar create/update por colección sensible y revisar autoridad, ownership, tipos y límites.
- [ ] Añadir pruebas negativas para cualquier bypass reproducible.
- [ ] Ejecutar `npm run test:firebase` con emuladores aislados.

### Task 3: Type and domain hardening

**Files:**

- Review: `lib/types.ts`, `lib/domain/**`, `lib/hooks/**`, API route handlers
- Modify: only files implicated by type-check, tests or security data-flow findings
- Test: focused Vitest suites near each changed module

- [ ] Eliminar errores TypeScript y tipos implícitos en fronteras de API, Firebase y E2E.
- [ ] Centralizar validaciones repetidas sin mover reglas de negocio fuera de `lib/`.
- [ ] Añadir regresiones para entradas inválidas, pertenencia de empresa y estados de inventario.

### Task 4: CI and GitHub hygiene

**Files:**

- Review/modify: `.github/workflows/ci.yml`, `.gitignore`, repository metadata

- [ ] Mantener lint, type-check, tests, reglas, build y E2E como gates independientes.
- [ ] Evitar secretos en URLs remotas, archivos versionados o logs.
- [ ] Confirmar branch protection/check names y detectar divergencias entre `main` local y `origin/main`.
- [ ] Dejar preparado el commit; pedir aprobación antes de `git push`.

### Task 5: Vercel readiness and deployment verification

**Files:**

- Review: `vercel.json`, `next.config.ts`, `.vercel/repo.json`, `.env.example`
- Modify: deployment configuration only when validated locally

- [ ] Confirmar proyecto y equipo Vercel sin exponer tokens.
- [ ] Ejecutar build local con variables seguras de prueba.
- [ ] Si existe token autorizado, realizar únicamente preview deployment por defecto; producción requiere confirmación separada.
- [ ] Verificar el resultado con `vercel inspect`, sin imprimir secretos.

### Task 6: Final verification and handoff

- [ ] Ejecutar la matriz completa de validaciones disponible en el entorno.
- [ ] Revisar diff, archivos no rastreados y riesgos pendientes.
- [ ] Reportar exactamente qué se corrigió, qué pasó, qué quedó bloqueado por credenciales/servicios y qué requiere aprobación.
