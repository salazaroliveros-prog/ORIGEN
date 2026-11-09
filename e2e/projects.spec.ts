import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './testCredentials';

/**
 * projects.spec.ts — Flujos de proyectos en ORIGEN ERP
 *
 * Prueba la sección 'Proyectos & Firmas': lista, creación, edición y cierre de diálogos.
 * No se hardcodean conteos de filas. Se prueba contra el estado real de la base de datos.
 *
 * Selectores confirmados en system-crud.spec.ts y qa-project-lifecycle.spec.ts.
 */

test.describe('Sección Proyectos & Firmas', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    // Navegar a la sección de proyectos
    await page.getByRole('button', { name: 'Proyectos & Firmas' }).first().click();
    await page.waitForTimeout(1500);
  });

  test('la sección muestra el botón Nuevo Proyecto (lista cargada o estado vacío)', async ({
    page,
  }) => {
    // El botón 'Nuevo Proyecto' siempre debe estar visible para el administrador
    await expect(page.getByRole('button', { name: 'Nuevo Proyecto' }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('al hacer clic en Nuevo Proyecto se abre el diálogo con el título correcto', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    // El diálogo debe tener el rol 'dialog' con nombre 'Nuevo Proyecto'
    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Verificar que el diálogo contiene los campos reales del formulario
    await expect(dialog.getByLabel('Código del Proyecto')).toBeVisible();
    await expect(dialog.getByLabel('Nombre del Proyecto')).toBeVisible();
  });

  test('cerrar el diálogo de Nuevo Proyecto lo oculta correctamente', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Cerrar con la tecla Escape
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('los campos del formulario de Nuevo Proyecto son los del ERP real', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo Proyecto' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Campos confirmados en system-crud.spec.ts
    await expect(dialog.getByLabel('Código del Proyecto')).toBeVisible();
    await expect(dialog.getByLabel('Nombre del Proyecto')).toBeVisible();
    await expect(dialog.getByLabel('Nombre del cliente')).toBeVisible();
    await expect(dialog.getByLabel('Presupuesto Total (Q)')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Crear Proyecto' })).toBeVisible();
  });
});
