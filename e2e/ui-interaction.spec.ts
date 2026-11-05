import { expect, test } from '@playwright/test';

/**
 * ui-interaction.spec.ts — Interacción general de UI en ORIGEN ERP
 *
 * Verifica que la app carga sin errores de JavaScript, que los modales conocidos
 * se pueden abrir y cerrar, y que la navegación entre vistas funciona sin problemas.
 *
 * Selectores confirmados en system-crud.spec.ts y qa-project-lifecycle.spec.ts.
 */

test.describe('Carga e interacción general', () => {
  test('la app carga sin errores de JavaScript en consola', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capturar solo errores reales (no warnings ni logs)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignorar errores esperados de Firebase en emuladores o de red
        if (/net::ERR|favicon|hydration|Warning|ResizeObserver|firebase|firestore/i.test(text)) {
          return;
        }
        consoleErrors.push(text);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(5000);

    expect(consoleErrors).toHaveLength(0);
  });

  test('el modal Nuevo Proyecto se puede abrir y cerrar desde Proyectos & Firmas', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible({
      timeout: 30_000,
    });

    // Navegar y abrir el modal
    await page.getByRole('button', { name: 'Proyectos & Firmas' }).first().click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Cerrar con Escape
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('el modal de Cotizaciones se puede abrir desde la sección correspondiente', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Cotizaciones' }).first().click();
    await page.waitForTimeout(1500);

    const nuevaCotizacion = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await expect(nuevaCotizacion).toBeVisible({ timeout: 20_000 });

    await nuevaCotizacion.click();
    await page.waitForTimeout(1000);

    // El modal de cotización contiene el placeholder del cliente
    await expect(page.getByPlaceholder('Ej. Ing. Guillermo Morales')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('la navegación entre secciones no recarga la página (SPA)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible({
      timeout: 30_000,
    });

    // Navegar entre secciones y verificar que no hay recarga completa
    let navigationCount = 0;
    page.on('load', () => {
      navigationCount++;
    });

    await page.getByRole('button', { name: 'Proyectos & Firmas' }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Gastos & Facturas' }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Tablero' }).first().click();
    await page.waitForTimeout(1000);

    // En una SPA, no debe haber recargas completas al cambiar de sección
    expect(navigationCount).toBe(0);
  });
});
