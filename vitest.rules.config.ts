import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': './lib',
    },
  },
  test: {
    environment: 'node',
    include: ['lib/firestore.rules.test.ts'],
  },
});
