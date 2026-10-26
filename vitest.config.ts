import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': './lib',
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
    exclude: ['lib/firestore.rules.test.ts', 'lib/firebaseService.emulator.test.ts'],
  },
});
