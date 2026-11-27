---
contentType: Guide
title: CI workflow maintenance - ORIGEN ERP
---

# Mantenimiento del workflow de CI - ORIGEN ERP

Este documento es una referencia para mantener `.github/workflows/ci.yml`.
Los ajustes descritos aquí ya están aplicados en `main`; no es necesario editar
el workflow manualmente desde GitHub.

## Estado actual

- El workflow concede `contents: read` y `actions: read`.
- El build recibe las variables `NEXT_PUBLIC_FIREBASE_*` desde los secretos de
  GitHub Actions.
- El CI ejecuta lint, validadores PWA, tipado, pruebas unitarias, reglas de
  Firebase, build y E2E.
- El E2E usa Firebase Emulators desechables y genera credenciales nuevas por
  corrida; no depende de una cuenta fija ni de datos viejos.
- La matriz E2E declara proyectos basados en Chromium y 4 perfiles móviles. El workflow
  instala ambos motores antes de ejecutar Playwright.

## Mantenimiento futuro

Si se agrega un proyecto de navegador en `playwright.config.ts`, se debe
agregar su motor al paso de instalación de Playwright en `ci.yml`. Si se
elimina un proyecto, también debe retirarse el motor que ya no se usa.

Si se agregan secretos de build, deben declararse explícitamente en el bloque
`env` del paso `Build`; nunca se deben escribir valores reales en el repositorio.

Los cambios del workflow deben hacerse mediante commit y push del repositorio,
para que CI y el despliegue automático de Vercel usen exactamente el mismo
commit.

## Relación con el flujo operativo

`docs/operational-workflow.md` documenta el comportamiento funcional de
Firestore, membresías y proyectos. No configura GitHub Actions ni sustituye
las validaciones del CI; ambos documentos tienen responsabilidades distintas.
