import { expect, test } from '@playwright/test';

/**
 * payroll.spec.ts — Flujos de personal y planillas en ORIGEN ERP
 *
 * Verifica la sección 'Personal & IGSS' y sub-secciones de cuadrillas y asistencia.
 * La visibilidad de la sección personal depende del rol del usuario; el administrador
 * (salazaroliveros@gmail.com) tiene acceso completo.
 *
 * El app es una SPA en '/'. No existe URL '/payroll'.
 * Selectores confirmados en system-crud.spec.ts.
 */

test.describe('Sección Personal & IGSS', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);
    // Esperar autenticación automática
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('el botón de navegación Personal & IGSS está visible para el administrador', async ({
    page,
  }) => {
    // El administrador (owner) siempre ve Personal & IGSS
    await expect(page.getByRole('button', { name: 'Personal & IGSS' }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('la sección Personal & IGSS carga contenido de cuadrillas al navegar', async ({ page }) => {
    await page.getByRole('button', { name: 'Personal & IGSS' }).first().click();
    await page.waitForTimeout(2000);

    // Debe aparecer el sub-menú o botón de 'Cuadrillas' confirmado en system-crud.spec.ts
    const cuadrillasBtn = page.getByRole('button', { name: /Cuadrillas/ }).first();
    await expect(cuadrillasBtn).toBeVisible({ timeout: 20_000 });
  });

  test('la sub-sección Cuadrillas permite registrar un empleado nuevo', async ({ page }) => {
    await page.getByRole('button', { name: 'Personal & IGSS' }).first().click();
    await page.waitForTimeout(1500);

    await page
      .getByRole('button', { name: /Cuadrillas/ })
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Botón confirmado en system-crud.spec.ts
    await expect(page.getByRole('button', { name: 'Nuevo Empleado' }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('la sub-sección Planillas Guate está visible en la navegación', async ({ page }) => {
    // Planillas es condicional (canViewPayroll) pero el admin tiene acceso
    const planillasBtn = page.getByRole('button', { name: 'Planillas Guate' }).first();
    await expect(planillasBtn).toBeVisible({ timeout: 20_000 });
  });
});
