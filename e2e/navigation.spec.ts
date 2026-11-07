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
    // Asegurar que el usuario exista en el emulador de Auth
    await page.request.post(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
      {
        data: {
          email: 'salazaroliveros@gmail.com',
          password: 'Origen2026!Secure',
          returnSecureToken: true,
        },
      }
    ).catch(() => {});

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Login manual si aparece el formulario de autenticación
    const loginButton = page.getByRole('button', { name: 'Iniciar Sesión' });
    const loginVisible = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (loginVisible) {
      await page.getByLabel('Correo electrónico').fill('salazaroliveros@gmail.com');
      await page.locator('#password').fill('Origen2026!Secure');
      await loginButton.click();
      await page.waitForTimeout(4000);
    }

    // Esperar a que el Tablero esté visible (autenticación completa)
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

    // Debe aparecer el botón de crear proyecto o estado sin proyectos
    const nuevoProyecto = page.getByRole('button', { name: 'Nuevo Proyecto' }).first();
    const sinProyectos = page.getByText(/No hay proyectos activos/).first();

    await expect(
      nuevoProyecto.or(sinProyectos).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('navegar a Gastos & Facturas muestra la sección de gastos', async ({ page }) => {
    await page.getByRole('button', { name: 'Gastos & Facturas' }).first().click();
    await page.waitForTimeout(2000);

    // Debe aparecer el botón para registrar un nuevo gasto o estado sin proyectos
    const nuevoGasto = page.getByRole('button', { name: 'Registrar Gasto / Factura' }).first();
    const irProyectos = page.getByRole('button', { name: 'Ir a Proyectos' }).first();
    const sinProyectos = page.getByText(/Sin proyectos disponibles/, { exact: true }).first();

    // Uno de los tres debe estar visible según el estado de proyectos
    await expect(
      nuevoGasto.or(irProyectos).or(sinProyectos).first()
    ).toBeVisible({ timeout: 10_000 });
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

    // La vista APU muestra botón de renglón manual si hay proyectos,
    // o mensaje de sin proyectos si no los hay
    const renglon = page.getByRole('button', { name: 'Renglón Manual' }).first();
    const sinProyectos = page.getByText(/Aún no hay proyectos/).first();

    await expect(renglon.or(sinProyectos).first()).toBeVisible({ timeout: 20_000 });
  });
});
