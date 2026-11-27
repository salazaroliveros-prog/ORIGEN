import { navItem } from './navigation';
import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';

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
    await ensureAuthenticated(page);
  });

  test('todos los botones de navegación base están visibles en la barra lateral', async ({
    page,
  }) => {
    // Estas son las secciones que siempre están disponibles (sin permisos condicionales)
    await expect(navItem(page, /Tablero/)).toBeVisible();
    await expect(navItem(page, /Proyectos/)).toBeVisible();
    await expect(navItem(page, /Presupuestos/)).toBeVisible();
    await expect(navItem(page, /Cotizaciones/)).toBeVisible();
    await expect(navItem(page, /Gastos/)).toBeVisible();
    await expect(navItem(page, /Maquinaria/)).toBeVisible();
  });

  test('navegar a Inventario & Compras muestra sus secciones', async ({ page }) => {
    const inventoryLink = navItem(page, /Inventario/);
    await expect(inventoryLink).toBeVisible({ timeout: 20_000 });
    await inventoryLink.click();

    await expect(
      page.getByRole('heading', { name: 'Inventario & Compras', exact: true }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('tab', { name: 'Resumen' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Artículos' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bodegas' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Órdenes de compra' })).toBeVisible();
  });

  test('navegar a Proyectos & Firmas muestra la lista de proyectos o estado vacío', async ({
    page,
  }) => {
    await navItem(page, /Proyectos/).click();
    await page.waitForTimeout(2000);

    // Debe aparecer el botón de crear proyecto o estado sin proyectos
    const nuevoProyecto = page.getByRole('button', { name: 'Nuevo Proyecto' }).first();
    const sinProyectos = page
      .getByText(/No hay proyectos activos/)
      .filter({ visible: true })
      .first();

    await expect(nuevoProyecto.or(sinProyectos).first()).toBeVisible({ timeout: 20_000 });
  });

  test('navegar a Gastos & Facturas muestra la sección de gastos', async ({ page }) => {
    await navItem(page, /Gastos/).click();
    await page.waitForTimeout(2000);

    // Debe aparecer el botón para registrar un nuevo gasto o estado sin proyectos
    const nuevoGasto = page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first();
    const irProyectos = page.getByRole('button', { name: 'Ir a Proyectos' }).first();
    const sinProyectos = page
      .getByText(/Sin proyectos disponibles/, { exact: true })
      .filter({ visible: true })
      .first();

    // Uno de los tres debe estar visible según el estado de proyectos
    await expect(nuevoGasto.or(irProyectos).or(sinProyectos).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('navegar a Cotizaciones muestra la sección de cotizaciones', async ({ page }) => {
    await navItem(page, /Cotizaciones/).click();
    await page.waitForTimeout(2000);

    // Debe aparecer el botón para crear una cotización
    const nuevaCotizacion = page.getByRole('button', { name: /Nueva Cotización Rápida/i }).first();
    await expect(nuevaCotizacion).toBeVisible({ timeout: 20_000 });
  });

  test('navegar a Presupuestos APU carga la vista de presupuestos', async ({ page }) => {
    await navItem(page, /Presupuestos/).click();
    await page.waitForTimeout(2000);

    // La vista APU muestra botón de renglón manual si hay proyectos,
    // o mensaje de sin proyectos si no los hay
    const renglon = page.getByRole('button', { name: 'Renglón Manual' }).first();
    const sinProyectos = page
      .getByText(/Aún no hay proyectos/)
      .filter({ visible: true })
      .first();

    await expect(renglon.or(sinProyectos).first()).toBeVisible({ timeout: 20_000 });
  });
});
