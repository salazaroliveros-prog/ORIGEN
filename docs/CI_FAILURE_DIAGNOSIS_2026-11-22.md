# Diagnóstico del fallo de CI — 22 de noviembre de 2026

## Resultado

El workflow **CI** del commit `ccf9990df0619d925ef44d0c7e63a88e3ff0d898` termina en fallo en el paso de E2E. La evidencia disponible no identifica la aserción, prueba ni excepción que produjo el código de salida 1, por lo que no es seguro cambiar código de aplicación, selectores o reglas de Firestore suponiendo una causa. Este documento deja el diagnóstico verificable y el procedimiento preciso para que un agente en VS Code obtenga el error raíz y aplique la corrección mínima.

- Ejecución: [CI run 45032194871](https://github.com/salazaroliveros-prog/ORIGEN/actions/runs/45032194871)
- Workflow: [`.github/workflows/ci.yml`](https://github.com/salazaroliveros-prog/ORIGEN/blob/ccf9990df0619d925ef44d0c7e63a88e3ff0d898/.github/workflows/ci.yml)
- Commit examinado: `ccf9990df0619d925ef44d0c7e63a88e3ff0d898` (`fix(ci): pin Firebase tools for E2E emulator runs`)

## Evidencia del log

1. El emulador E2E inicia para el proyecto desechable `demo-origen-erp-test` y muestra que Firestore Emulator arrancó correctamente.
2. Las pruebas de emulador que sí aparecen en el log concluyen correctamente: `lib/firestore-emulator.test.ts` (21), `lib/firebaseService.crud.emulator.test.ts` (18) y `lib/storage-emulator.test.ts` (9).
3. Se ven mensajes `PERMISSION_DENIED` de Firestore dentro de pruebas que validan explícitamente rechazos de reglas. El archivo `lib/firestore-emulator.test.ts` termina en verde; esos mensajes no son evidencia del fallo final y no se deben “arreglar” relajando las reglas de seguridad.
4. El proceso termina con `Script "node scripts/run-e2e-inside.mjs" exited with code 1`, dentro de la ejecución E2E. El fragmento de log disponible no contiene el mensaje original de Playwright (nombre de prueba, stack trace, fallo de global setup o causa de preparación).
5. El workflow actual no contiene un paso de carga de artefactos después de E2E. `scripts/run-e2e.mjs` crea resultados bajo `test-results/<runId>` y `playwright-report/<runId>`, pero al terminar el job el runner se destruye; no se puede asumir que esos ficheros estén disponibles para inspección.

## Archivos de ejecución relevantes

- [`scripts/run-e2e.mjs`](https://github.com/salazaroliveros-prog/ORIGEN/blob/ccf9990df0619d925ef44d0c7e63a88e3ff0d898/scripts/run-e2e.mjs): crea un puerto y credenciales efímeras, inicia Auth/Firestore/Storage Emulator, y luego ejecuta `scripts/run-e2e-inside.mjs`.
- [`scripts/run-e2e-inside.mjs`](https://github.com/salazaroliveros-prog/ORIGEN/blob/ccf9990df0619d925ef44d0c7e63a88e3ff0d898/scripts/run-e2e-inside.mjs): siembra el usuario de prueba y ejecuta Playwright.
- [`playwright.config.ts`](https://github.com/salazaroliveros-prog/ORIGEN/blob/ccf9990df0619d925ef44d0c7e63a88e3ff0d898/playwright.config.ts): configura servidor aislado, `globalSetup` y reportes por ejecución.
- [`e2e/global-setup.ts`](https://github.com/salazaroliveros-prog/ORIGEN/blob/ccf9990df0619d925ef44d0c7e63a88e3ff0d898/e2e/global-setup.ts): flujo de inicio de sesión/calentamiento; es una posible zona de investigación, no una causa confirmada.

## Instrucciones exactas para el agente de VS Code

1. Abre la ejecución enlazada y descarga/inspecciona el **log completo** del job fallido, no solo el resumen. Localiza la salida inmediatamente posterior a `[e2e] Run:` y anterior a `Script "node scripts/run-e2e-inside.mjs" exited with code 1`. Recupera el primer error real de Playwright/seed/setup; no tomes el último código de salida como causa raíz.
2. Reproduce desde la raíz del repo con Node 24 y dependencias del lockfile:

   ```bash
   npm ci --no-audit --no-fund
   npm run test:e2e
   ```

   El script crea credenciales aleatorias y usa emuladores desechables. No reutilices credenciales ni datos de producción.
3. Clasifica el primer error real antes de editar:
   - Si es una prueba Playwright, ejecuta solo el spec y el test identificados por el log mediante `npm run test:e2e -- <spec> --grep '<nombre>'` (o pasa los argumentos equivalentes a `node scripts/run-e2e.mjs`) y corrige el comportamiento/selector esperado en el código o spec apropiado.
   - Si falla el seed, corrige el contrato/fixture señalado en `scripts/seed-e2e-emulator.mjs` y agrega o ajusta una prueba focalizada; no cambies reglas para silenciar rechazos esperados.
   - Si falla `globalSetup`, confirma en el log qué locator, navegación o espera expiró y corrige ese paso con una espera/selector que refleje la UI actual. No elimines la validación del dashboard ni la autenticación para hacer pasar el CI.
   - Si no puede reproducirse localmente, conserva la evidencia, compara entorno y commit, y no presentes una hipótesis como corrección confirmada.
4. Tras la corrección, ejecuta el spec afectado y `npm run test:e2e`; luego verifica al menos `npm run lint`, `npm run type-check` y las pruebas focalizadas que correspondan.
5. En una modificación posterior de CI, agrega publicación de diagnósticos **incluso si E2E falla** (paso con `if: always()` usando `actions/upload-artifact`, incluyendo `test-results/` y `playwright-report/`, con `if-no-files-found: warn` y retención limitada). Esto hará persistentes trazas, capturas y reportes para el siguiente diagnóstico. No reemplaza la corrección raíz.

## Conclusión

**No hay una corrección de código raíz confirmable a partir del fragmento de CI disponible.** El fallo queda acotado a la fase E2E, pero falta la salida de Playwright que determine qué cambiar. La acción correcta es obtener primero esa causa y aplicar el arreglo mínimo; no modificar Firebase Security Rules ni desactivar E2E.
