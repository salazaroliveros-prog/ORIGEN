# Auditoría CRUD y QA

**Fecha:** 2026-11-08  
**Alcance revisado:** persistencia Firestore, reglas de acceso, esquemas Zod, autenticación de pruebas y configuración CRUD/E2E.

## Matriz de acceso CRUD

| Colección           | Lectura                                 | Alta                                                                      | Actualización                                                     | Borrado                                |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| `companies`         | Miembros o dueño inicial                | Usuario autenticado crea su empresa                                       | Owner, admin                                                      | Denegado                               |
| `members`           | Miembro propio o owner/admin            | Alta inicial o invitación aceptada                                        | Owner/admin, excepto el owner                                     | Owner/admin, excepto el owner          |
| `invitations`       | Invitado verificado o owner/admin       | Owner, admin                                                              | Owner/admin o invitado que acepta                                 | Owner, admin                           |
| `companySettings`   | Miembros de empresa                     | Owner, admin                                                              | Owner, admin                                                      | Owner, admin                           |
| `projects`          | Miembros de empresa o dueño             | Owner, admin, project manager; creador autenticado                        | Owner, admin, project manager; empresa y dueño inmutables         | Owner, admin, project manager          |
| `fieldVisits`       | Miembros o autor                        | Owner, admin, project manager, field worker                               | Roles de operaciones de campo                                     | Roles de operaciones de campo          |
| `expenses`          | Miembros o autor                        | Owner/admin/finance o gasto de maquinaria ligado a un log del mismo batch | Owner, admin, finance                                             | Owner, admin, finance                  |
| `attendance`        | Autor o roles autorizados de la empresa | Roles de operaciones de campo                                             | Roles de operaciones de campo                                     | Roles de operaciones de campo          |
| `employees`         | Dueño, owner, admin, finance            | Owner, admin, finance                                                     | Owner, admin, finance                                             | Owner, admin, finance                  |
| `employeeDirectory` | Roles de operaciones de campo           | Owner, admin, finance                                                     | Owner, admin, finance                                             | Owner, admin, finance                  |
| `quotes`            | Miembros de empresa                     | Owner, admin, project manager, finance                                    | Owner, admin, project manager, finance                            | Owner, admin, project manager, finance |
| `machinery`         | Miembros de empresa                     | Owner, admin, project manager, field worker                               | Roles de operaciones de campo                                     | Owner, admin, project manager          |
| `apuItems`          | Miembros de empresa                     | Owner, admin, project manager, finance                                    | Owner, admin, project manager, finance                            | Owner, admin, project manager, finance |
| `machineryLogs`     | Miembros de empresa                     | Roles de operaciones de campo, con equipo y proyecto de la misma empresa  | Owner, admin, project manager; referencias y propiedad inmutables | Owner, admin, project manager          |
| `fcm_tokens`        | Dueño del token                         | Dueño autenticado                                                         | Dueño autenticado                                                 | Dueño autenticado                      |
| `project_alerts`    | Dueño de la alerta                      | Dueño autenticado                                                         | Dueño autenticado                                                 | Dueño autenticado                      |

Las reglas mantienen denegación global por defecto. La matriz resume `firestore.rules`; no sustituye la revisión de cada documento contractual ni de permisos de Storage/API.

## Correcciones aplicadas

- El alta de proyectos ahora permite que el UID del creador sea distinto del ID de empresa, y obliga a que el creador sea el usuario autenticado. Se agregó cobertura de ciclo CRUD de proyecto.
- Los gastos de maquinaria ahora se vinculan al log creado en el mismo batch. Las reglas verifican empresa, proyecto, equipo, autor y monto, y bloquean cambios de empresa o referencias cruzadas.
- Alta y actualización de gastos agregan `companyId` y `authorId` antes de validar con Zod y escriben el payload validado.
- Se retiraron credenciales y token de depuración de documentación y tests; Playwright usa `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`, ya no transporta contraseñas en URLs y exige `E2E_ALLOW_FIREBASE_MUTATIONS=1`.
- Los tests de proyectos y personal usan el formulario normal de login; se eliminaron afirmaciones de auto-login que no existen en la aplicación.
- Los emuladores Auth/Firestore/Storage ahora son opt-in solo en desarrollo (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`); `firebase.json` y la ejecución normal siguen en Firebase real.
- Se agregó `seed-project-lifecycle.mjs`: 5 escenarios, 65 documentos sintéticos y 1 manifiesto de run (más la empresa/membresía técnica al inicializar el workspace del emulador), escritura live autenticada por Client SDK, dry-run por defecto y cleanup acotado por `runId`. La guía está en [docs/PROJECT_LIFECYCLE_SEED.md](PROJECT_LIFECYCLE_SEED.md).

## Verificación

| Verificación                 | Resultado                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                   | Correcto                                                                                                                                                 |
| Pruebas unitarias            | 49 archivos; 1.081 pruebas pasaron.                                                                                                                      |
| ESLint                       | Correcto.                                                                                                                                                |
| Build de producción          | Correcto; Next.js emitió advertencias de caché y de detección del plugin ESLint.                                                                         |
| Descubrimiento Playwright    | 535 casos en 10 archivos; no ejecuta flujos ni escribe datos.                                                                                            |
| Seed lifecycle               | Dry-run emulator y live correctos; no conecta ni escribe. El rechazo de `projectId` live incorrecto se verificó antes de login.                          |
| Reglas Firestore en emulador | No ejecutadas: Firebase CLI requiere Java 21 y el entorno no cumple ese requisito.                                                                       |
| Playwright E2E               | No ejecutado: el runtime Android no puede lanzar navegadores en este entorno. El global setup exige destino y verifica projectId/modo antes de abrirlos. |

## Riesgos y pendientes

- `firebase.json` permanece como configuración real. `firebase.emulators.json` contiene la configuración de emuladores; este entorno no pudo arrancarlos porque dispone de Java 17 y Firebase CLI requiere Java 21.
- No se escribieron datos reales. Para live, el script exige `--apply`, projectId confirmado dos veces, workspace y una sesión owner/admin; aun así debe usarse con autorización, porque agrega proyectos/datos QA al workspace real.
- Las credenciales y el token expuestos pudieron quedar en el historial Git. Rotar la contraseña de la cuenta afectada y revocar el token de depuración en Firebase; editar los archivos no invalida valores ya expuestos.
- Ejecutar `npm run test:firebase` y el seed contra emuladores con JDK 21; ejecutar E2E desde un host compatible con Playwright. Las suites E2E antiguas todavía requieren revisión de sus mutaciones y limpieza.
- La revisión no certifica seguridad de producción ni cubre exhaustivamente cada pantalla, regla de Storage, endpoint o flujo de negocio.
