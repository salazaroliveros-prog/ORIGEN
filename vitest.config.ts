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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'lib/**/*.test.ts',
        'lib/**/*.test.tsx',
        'lib/firestore.rules.test.ts',
        'lib/firebaseService.emulator.test.ts',
        'scripts/',
        'public/',
        '.next/',
      ],
    },
  },
});
