(process.env as Record<string, string>).NODE_ENV = 'test';

// No se necesitan matchers globales; el expect de vitest es suficiente para las pruebas de hooks/lógica.
