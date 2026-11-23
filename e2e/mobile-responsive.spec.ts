import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';

const MOBILE_MODULES = [
  'Tablero',
  'Proyectos & Firmas',
  'Presupuestos APU',
  'Cotizaciones',
  'Seguimiento & Hitos',
  'Maquinaria',
  'Personal & IGSS',
  'Planillas Guate',
  'Gastos & Facturas',
  'Facturas FEL',
  'Inventario & Compras',
  'Reportes Finales',
  'Asistente IA',
  'Correo & Avisos',
] as const;

test.describe('Navegación responsiva móvil', () => {
  test('un solo encabezado, menú completo, destinos accesibles y sin desbordamiento horizontal', async ({
    page,
  }) => {
    // The same spec is included in the standard desktop project; its purpose is
    // to validate the four mobile device projects declared in playwright.config.ts.
    test.skip((page.viewportSize()?.width ?? 1280) >= 1024, 'Solo aplica a viewports móviles');

    await ensureAuthenticated(page);

    const menuToggle = page.getByRole('button', { name: 'Abrir menú de navegación' });
    await expect(menuToggle).toHaveCount(1);
    await expect(page.getByRole('banner')).toBeVisible();

    const bottomNavigation = page.getByRole('navigation', {
      name: 'Navegación principal móvil',
    });
    await expect(bottomNavigation).toBeVisible();

    const initialWidth = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(initialWidth.document).toBeLessThanOrEqual(initialWidth.viewport);

    await menuToggle.click();
    const mobileDialog = page.getByRole('dialog');
    await expect(mobileDialog).toBeVisible();
    const moduleNavigation = mobileDialog.getByRole('navigation', {
      name: 'Navegación principal',
    });
    await expect(moduleNavigation).toBeVisible();

    for (const moduleName of MOBILE_MODULES) {
      const item =
        moduleName === 'Facturas FEL'
          ? moduleNavigation.getByRole('link', { name: `Ir a ${moduleName}` })
          : moduleNavigation.getByRole('button', { name: `Ir a ${moduleName}` });
      await expect(item).toBeVisible();
    }

    const budgetItem = moduleNavigation.getByRole('button', {
      name: 'Ir a Presupuestos APU',
    });
    const budgetTarget = await budgetItem.boundingBox();
    expect(budgetTarget?.height ?? 0).toBeGreaterThanOrEqual(44);

    await budgetItem.click();
    await expect(mobileDialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir menú de navegación' })).toHaveCount(1);

    // Re-open the drawer to ensure selection state remains synchronized.
    await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
    const reopenedNavigation = page
      .getByRole('dialog')
      .getByRole('navigation', { name: 'Navegación principal' });
    await expect(
      reopenedNavigation.getByRole('button', { name: 'Ir a Presupuestos APU' })
    ).toHaveAttribute('aria-current', 'page');

    const finalWidth = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(finalWidth.document).toBeLessThanOrEqual(finalWidth.viewport);
  });
});
