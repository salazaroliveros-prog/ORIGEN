import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': process.cwd(),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/firebaseService.emulator.test.ts'],
  },
});
