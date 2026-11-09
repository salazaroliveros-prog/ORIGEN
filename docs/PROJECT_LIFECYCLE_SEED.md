# Seed de ciclo de vida de proyecto

El script crea datos sintéticos identificados por `runId` para validar la trayectoria de una obra. No crea una colección de ingresos o nómina: los ingresos se proyectan desde hitos de cobro y la planilla se calcula con empleados y asistencias, como hace la aplicación.

## Escenarios incluidos

| Escenario                    | Presupuesto GTQ | Gasto GTQ | Avance | Estado        |
| ---------------------------- | --------------: | --------: | -----: | ------------- |
| Residencial en planificación |         450.000 |    18.000 |    0 % | Planificación |
| Comercial en ruta            |       1.200.000 |   520.000 |   55 % | En Ejecución  |
| Industrial con sobrecosto    |         850.000 |   910.000 |   30 % | En Ejecución  |
| Civil suspendido             |         320.000 |    50.000 |   20 % | Suspendido    |
| Obra pública finalizada      |         650.000 |   620.000 |  100 % | Finalizado    |

El dataset incluye proyectos, hitos y tareas, APU, cotizaciones, gastos con proveedores sintéticos, empleados, directorio, asistencias con horas extra, visitas de campo y maquinaria con bitácoras. No incluye fotografías ni datos personales reales.

## Simulación

La app conserva Firebase real como destino predeterminado. El dry-run requiere destino explícito y no carga Firebase, no autentica ni escribe:

```bash
npm run seed:lifecycle -- --target=emulator --run-id=qa-2026-11
```

## Emuladores opcionales

Los emuladores están en `firebase.emulators.json`; `firebase.json` permanece sin cambios. En terminales separadas:

```bash
npm run emulators
npm run dev:emulated
```

Para sembrar Auth Emulator y Firestore Emulator, define `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD` en el entorno y ejecuta:

```bash
npm run seed:lifecycle -- --target=emulator --run-id=qa-2026-11 --apply
```

`dev:emulated` conecta Auth, Firestore y Storage a `localhost` solo en `NODE_ENV=development` y con `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`. La ejecución normal (`npm run dev` sin ese flag) y producción permanecen en Firebase real.

## Seed en Firebase real

El seed real usa Firebase Client SDK y la sesión de `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`; las escrituras pasan por las reglas Firestore. Requiere `.env.local` con la configuración pública de Firebase, un usuario owner/admin autenticable y un workspace existente. El UID se resuelve desde la sesión; `--actor-uid` es opcional para comprobarlo. Primero confirma destino, empresa y escenarios con dry-run:

```bash
npm run seed:lifecycle -- --target=live \
  --firebase-project="<projectId>" \
  --company-id="<companyId>" \
  --run-id="qa-2026-11"
```

Para aplicar, repite el mismo project ID dos veces y usa un `runId` único:

```bash
E2E_ADMIN_EMAIL="..." E2E_ADMIN_PASSWORD="..." npm run seed:lifecycle -- \
  --target=live \
  --firebase-project="<projectId>" \
  --confirm-project="<projectId>" \
  --company-id="<companyId>" \
  --run-id="qa-2026-11" \
  --apply
```

No ejecutes este comando contra producción sin autorización y respaldo. El script valida el project ID servido por la configuración local, exige rol owner/admin, no sobrescribe IDs existentes y aplica escrituras con las reglas del usuario autenticado.

## Limpieza

La limpieza requiere `--run-id` explícito, `--cleanup` y `--apply`. Reutiliza el mismo destino, proyecto, empresa, usuario y credenciales del seed. Para Firebase real:

```bash
E2E_ADMIN_EMAIL="..." E2E_ADMIN_PASSWORD="..." npm run seed:lifecycle -- \
  --target=live \
  --firebase-project="<projectId>" \
  --confirm-project="<projectId>" \
  --company-id="<companyId>" \
  --run-id="qa-2026-11" \
  --cleanup \
  --apply
```

En emulador se eliminan únicamente los documentos del run; se conservan la empresa técnica y el usuario de Auth Emulator.

## Playwright

Playwright solo acepta un `baseURL` local y consulta `/api/firebase-config.js` antes de abrir el navegador. Debes declarar `E2E_FIREBASE_TARGET=emulator` o `live` y `E2E_ALLOW_FIREBASE_MUTATIONS=1`. En live, también se requiere `E2E_CONFIRM_LIVE_PROJECT` igual al proyecto servido por la app. Sin estas confirmaciones, Playwright aborta antes de ejecutar casos.

La suite E2E existente puede crear usuarios y datos; revisa los casos y limpia sus registros antes de apuntarla a un backend compartido. El seed no sustituye las pruebas de interacción UI ni la ejecución de `npm run test:firebase`.
