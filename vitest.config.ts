import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx', 'app/api/**/*.test.ts'],
    exclude: ['lib/firestore-emulator.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'lib/**/*.test.ts',
        'lib/**/*.test.tsx',
        'lib/firestore-emulator.test.ts',
        'scripts/',
        'public/',
        '.next/',
      ],
    },
  },
});
