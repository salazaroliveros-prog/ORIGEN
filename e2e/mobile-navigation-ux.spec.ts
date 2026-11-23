import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';

test.describe('Navegación móvil y shell responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await ensureAuthenticated(page);
  });

  test('el drawer expone los módulos y acciones administrativas permitidos', async ({ page }) => {
    const menuToggle = page.locator('button[aria-controls="mobile-navigation"]');
    await expect(menuToggle).toBeVisible();
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press('Escape');
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await menuToggle.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer.getByRole('heading', { name: 'Empresa E2E' })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    const navigation = drawer.getByRole('navigation', { name: 'Navegación principal' });
    const destinations = [
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
      'Equipo de la empresa',
    ];
    for (const destination of destinations) {
      const role = destination === 'Facturas FEL' ? 'link' : 'button';
      await expect(navigation.getByRole(role, { name: 'Ir a ' + destination, exact: true })).toBeVisible();
    }

    await expect(drawer.getByRole('button', { name: 'Configuración de Marca' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

    const metrics = await page.evaluate(() => ({
      bottomNavZ: Number(getComputedStyle(document.querySelector('.mobile-bottom-nav')!).zIndex),
      drawerZ: Number(getComputedStyle(document.querySelector('.mobile-sheet')!).zIndex),
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      items: [...document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }),
    }));
    expect(metrics.bottomNavZ).toBeLessThan(metrics.drawerZ);
    expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);
    expect(metrics.items).toHaveLength(6);
    expect(metrics.items.every((rect) => rect.left >= 0 && rect.right <= 375)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menuToggle).toBeFocused();

    await menuToggle.click();
    const reopenedDrawer = page.getByRole('dialog');
    await reopenedDrawer.getByRole('button', { name: 'Ir a Presupuestos APU' }).click();
    await expect(reopenedDrawer).toHaveCount(0);
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('header.sticky')).toContainText('Presupuestos APU');
  });

  test('la barra inferior no desborda entre 320px y tablet', async ({ page }) => {
    for (const width of [320, 360, 375, 390, 414, 768]) {
      await page.setViewportSize({ width, height: 812 });
      const metrics = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        nav: document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect().width ?? 0,
        items: [...document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item')].map((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      }));
      expect(metrics.document, 'desbordamiento de página a ' + width + 'px').toBeLessThanOrEqual(width);
      expect(metrics.nav).toBeLessThanOrEqual(width);
      expect(metrics.items.every((rect) => rect.left >= 0 && rect.right <= width)).toBe(true);
    }
  });
});
