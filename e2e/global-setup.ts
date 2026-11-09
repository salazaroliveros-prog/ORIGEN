export default async function globalSetup() {
  if (process.env.E2E_ALLOW_FIREBASE_MUTATIONS !== '1') {
    throw new Error(
      'E2E puede crear, modificar y borrar datos. Configura E2E_ALLOW_FIREBASE_MUTATIONS=1 solo para un backend desechable o de pruebas.'
    );
  }

  if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) {
    throw new Error('Configura E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para ejecutar Playwright.');
  }

  const target = process.env.E2E_FIREBASE_TARGET;
  if (target !== 'emulator' && target !== 'live') {
    throw new Error('Define E2E_FIREBASE_TARGET=emulator o live para identificar el backend de pruebas.');
  }

  const baseURL = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(baseURL.hostname)) {
    throw new Error('Playwright requiere el servidor web local; el backend se valida por projectId.');
  }

  const configResponse = await fetch(new URL('/api/firebase-config.js', baseURL));
  if (!configResponse.ok) {
    throw new Error('No se pudo consultar la configuracion Firebase del servidor local.');
  }
  const configSource = await configResponse.text();
  const configMatch = /^firebase\.initializeApp\((.*)\);\s*$/.exec(configSource);
  if (!configMatch) {
    throw new Error('La respuesta de configuracion Firebase no tiene el formato esperado.');
  }
  const { projectId } = JSON.parse(configMatch[1]);
  const emulatorMode = configResponse.headers.get('X-Firebase-Emulator-Mode') === 'true';

  if (target === 'emulator' && (projectId !== 'demo-origen-erp-test' || !emulatorMode)) {
    throw new Error('E2E dice emulator, pero el servidor no esta conectado a los emuladores demo.');
  }
  if (target === 'live') {
    if (
      projectId.startsWith('demo-') ||
      emulatorMode ||
      process.env.E2E_CONFIRM_LIVE_PROJECT !== projectId
    ) {
      throw new Error('Live requiere E2E_CONFIRM_LIVE_PROJECT igual al projectId servido por la app.');
    }
  }
}