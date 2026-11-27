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

/** El sidebar usa etiquetas largas; el primer token identifica el módulo. */
export function sectionPattern(section: string): RegExp {
  return new RegExp(section.split(/[ &]/)[0], 'i');
}

/** El estado activo es aria-current en la barra móvil y aria-selected en el sidebar. */
export async function expectNavActive(page: Page, pattern: RegExp, timeout = 20_000) {
  const item = navItem(page, pattern);
  await expect(item).toBeVisible({ timeout });
  const active = await item.evaluate(
    (el) =>
      el.getAttribute('aria-current') === 'page' || el.getAttribute('aria-selected') === 'true'
  );
  expect(active).toBe(true);
}
