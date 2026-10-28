import { expect, test } from '@playwright/test';

test('verificar configuración de Firebase en runtime', async ({ page }) => {
  const response = await page.goto('/api/firebase-config.js');
  expect(response?.ok()).toBe(true);
  expect(response).not.toBeNull();
  expect(response!.headers()['content-type']).toContain('application/javascript');

  const script = await response!.text();
  const configMatch = script.match(/^firebase\.initializeApp\(([\s\S]*)\);$/);
  expect(configMatch).not.toBeNull();

  const firebaseConfig = JSON.parse(configMatch![1]) as {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  };
  expect(firebaseConfig.apiKey).toBeTruthy();
  expect(firebaseConfig.authDomain).toBe('origen-erp-guatemala.firebaseapp.com');
  expect(firebaseConfig.projectId).toBe('origen-erp-guatemala');
  expect(firebaseConfig.appId).toMatch(/^1:\d+:web:[a-f0-9]+$/);
});
