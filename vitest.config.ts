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
    env: {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123',
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-TEST',
      PRIMARY_ADMIN_EMAIL: 'admin@test.com',
    },
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
