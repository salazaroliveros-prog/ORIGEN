import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Configuración exclusiva para las pruebas de reglas contra los emuladores
 * (`npm run test:firebase`).
 *
 * `vitest.config.ts` excluye los tests que requieren emulador del run normal
 * porque no pueden ejecutarse sin él.
 *
 * `fileParallelism` está desactivado: `firestore-emulator.test.ts` limpia la
 * base de datos entre casos (`clearFirestore`), así que los archivos no pueden
 * ejecutarse en paralelo contra el mismo emulador.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'lib/firestore-emulator.test.ts',
      'lib/storage-emulator.test.ts',
      'lib/firebaseService.crud.emulator.test.ts',
    ],
    exclude: [],
    setupFiles: [],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
