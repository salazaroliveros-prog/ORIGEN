import { expect, test } from '@playwright/test';

/**
 * navigation.spec.ts — Navegación real entre secciones del ERP ORIGEN
 *
 * Verifica que los botones de navegación de la barra lateral están presentes
 * y que al hacer clic en ellos se carga contenido significativo.
 *
 * Basado en los labels definidos en Navbar.tsx (tabs[]) y confirmados en
 * system-crud.spec.ts y qa-project-lifecycle.spec.ts.
 */

test.describe('Navegación principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Esperar autenticación automática
    await page.waitForTimeout(4000);
    // Asegurar que la app esté autenticada verificando un botón de navegación
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('todos los botones de navegación base están visibles en la barra lateral', async ({
    page,
  }) => {
    // Estas son las secciones que siempre están disponibles (sin permisos condicionales)
    await expect(page.getByRole('button', { name: 'Tablero' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Proyectos & Firmas' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Presupuestos APU' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cotizaciones' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gastos & Facturas' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maquinaria' }).first()).toBeVisible();
  });

  test('navegar a Proyectos & Firmas muestra la lista de proyectos o estado vacío', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Proyectos & Firmas' }).first().click();
    await page.waitForTimeout(2000);

    // Debe aparecer el botón de crear proyecto (siempre presente) o la lista vacía
    const nuevoProyecto = page.getByRole('button', { name: 'Nuevo Proyecto' }).first();
    await expect(nuevoProyecto).toBeVisible({ timeout: 20_000 });
  });

  test('navegar a Gastos & Facturas muestra la sección de gastos', async ({ page }) => {
    await page.getByRole('button', { name: 'Gastos & Facturas' }).first().click();
    await page.waitForTimeout(2000);

    // Debe aparecer el botón para registrar un nuevo gasto
    const nuevoGasto = page.getByRole('button', { name: 'Nuevo Gasto / Factura' }).first();
    await expect(nuevoGasto).toBeVisible({ timeout: 20_000 });
  });

  test('navegar a Cotizaciones muestra la sección de cotizaciones', async ({ page }) => {
    await page.getByRole('button', { name: 'Cotizaciones' }).first().click();
    await page.waitForTimeout(2000);

    // Debe aparecer el botón para crear una cotización
    const nuevaCotizacion = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await expect(nuevaCotizacion).toBeVisible({ timeout: 20_000 });
  });

  test('navegar a Presupuestos APU carga la vista de presupuestos', async ({ page }) => {
    await page.getByRole('button', { name: 'Presupuestos APU' }).first().click();
    await page.waitForTimeout(2000);

    // La vista APU muestra un botón para renglón manual
    const renglon = page.getByRole('button', { name: 'Renglón Manual' }).first();
    await expect(renglon).toBeVisible({ timeout: 20_000 });
  });
});
