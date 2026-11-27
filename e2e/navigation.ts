import { expect, type Locator, type Page } from '@playwright/test';

/**
 * El menú principal se renderiza como `role="tab"` en el sidebar de escritorio
 * (TabsGrouped) y como `role="button"` en la barra inferior móvil (BottomNav).
 * Los specs deben localizar destinos por nombre sin asumir uno de los dos.
 */
export function navItem(page: Page, pattern: RegExp | string): Locator {
  const name =
    typeof pattern === 'string'
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      : pattern;
  return page.getByRole('tab', { name }).or(page.getByRole('button', { name })).first();
}

export async function expectNavVisible(page: Page, pattern: RegExp, timeout = 30_000) {
  await expect(navItem(page, pattern)).toBeVisible({ timeout });
}
