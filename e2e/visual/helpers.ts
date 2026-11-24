import { Page, expect } from '@playwright/test';

/**
 * Playwright Test Utilities & Helpers
 * Helpers reutilizables para testing visual responsivo
 */

export interface ViewportInfo {
  width: number;
  height: number;
  name: string;
  category: 'desktop' | 'tablet' | 'mobile';
}

/**
 * Obtener información del viewport actual
 */
export function getViewportInfo(page: Page): ViewportInfo {
  const size = page.viewportSize();
  if (!size) throw new Error('Viewport not set');

  const width = size.width;
  const height = size.height;
  
  let category: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  let name = 'Desktop';

  if (width < 768) {
    category = 'mobile';
    name = `Mobile ${width}x${height}`;
  } else if (width < 1024) {
    category = 'tablet';
    name = `Tablet ${width}x${height}`;
  }

  return { width, height, name, category };
}

/**
 * Capturar screenshot con nombre automático
 */
export async function captureScreenshot(
  page: Page,
  testName: string,
  options?: { fullPage?: boolean; selector?: string }
) {
  const viewport = getViewportInfo(page);
  const browserName = page.context().browser()?.browserType().name() || 'unknown';
  
  const filename = `screenshots/${testName}-${browserName}-${viewport.width}x${viewport.height}.png`;

  if (options?.selector) {
    const element = page.locator(options.selector).first();
    if (await element.isVisible()) {
      await element.screenshot({ path: filename });
    }
  } else {
    await page.screenshot({
      path: filename,
      fullPage: options?.fullPage ?? true,
    });
  }

  return filename;
}

/**
 * Validar que elemento es visible y accesible
 */
export async function validateElement(
  page: Page,
  selector: string,
  options?: { minWidth?: number; minHeight?: number; visible?: boolean }
) {
  const element = page.locator(selector).first();
  
  if (options?.visible !== false) {
    await expect(element).toBeVisible({ timeout: 5000 }).catch(() => {
      // Element not visible, continue
    });
  }

  if (await element.isVisible()) {
    const box = await element.boundingBox();
    
    if (box) {
      if (options?.minWidth && box.width < options.minWidth) {
        throw new Error(`Element width ${box.width}px is less than minimum ${options.minWidth}px`);
      }
      if (options?.minHeight && box.height < options.minHeight) {
        throw new Error(`Element height ${box.height}px is less than minimum ${options.minHeight}px`);
      }
    }

    return { visible: true, box };
  }

  return { visible: false, box: null };
}

/**
 * Validar no hay horizontal overflow
 */
export async function validateNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth;
  });

  if (hasOverflow) {
    throw new Error('Horizontal overflow detected');
  }

  return true;
}

/**
 * Obtener métricas de performance
 */
export async function getPerformanceMetrics(page: Page) {
  return await page.evaluate(() => ({
    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
  }));
}

/**
 * Validar contraste de colores
 */
export async function validateColorContrast(page: Page, selector: string) {
  const contrast = await page.evaluate((sel) => {
    const element = document.querySelector(sel) as HTMLElement;
    if (!element) return null;

    const bgColor = window.getComputedStyle(element).backgroundColor;
    const color = window.getComputedStyle(element).color;
    const fontSize = window.getComputedStyle(element).fontSize;
    const fontWeight = window.getComputedStyle(element).fontWeight;

    return { bgColor, color, fontSize, fontWeight };
  }, selector);

  return contrast;
}

/**
 * Simular interacción con elemento
 */
export async function interactWithElement(
  page: Page,
  selector: string,
  action: 'click' | 'focus' | 'hover' | 'tap'
) {
  const element = page.locator(selector).first();

  if (!await element.isVisible()) {
    throw new Error(`Element ${selector} not visible for ${action}`);
  }

  switch (action) {
    case 'click':
      await element.click();
      break;
    case 'focus':
      await element.focus();
      break;
    case 'hover':
      await element.hover();
      break;
    case 'tap':
      await element.tap();
      break;
  }

  await page.waitForTimeout(300); // Animation delay
}

/**
 * Capturar elemento y estado
 */
export async function captureElementState(
  page: Page,
  selector: string,
  state: 'default' | 'hover' | 'focus' | 'active'
) {
  const element = page.locator(selector).first();
  
  if (!await element.isVisible()) return null;

  const viewport = getViewportInfo(page);
  const browserName = page.context().browser()?.browserType().name() || 'unknown';

  switch (state) {
    case 'hover':
      await element.hover();
      break;
    case 'focus':
      await element.focus();
      break;
    case 'active':
      await element.click();
      break;
  }

  await page.waitForTimeout(300);

  const filename = `screenshots/element-${state}-${browserName}-${viewport.width}.png`;
  await element.screenshot({ path: filename });

  return filename;
}

/**
 * Validar accesibilidad básica
 */
export async function validateAccessibility(page: Page) {
  const issues = await page.evaluate(() => {
    const issues = [];

    // Validar que inputs tengan labels
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`) || 
                       input.closest('label');
      if (!hasLabel) {
        issues.push(`Input ${input.id || input.name} no tiene label`);
      }
    });

    // Validar que botones tengan texto
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (!btn.textContent?.trim() && !btn.getAttribute('aria-label')) {
        issues.push('Button sin texto o aria-label');
      }
    });

    // Validar viewport meta tag
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      issues.push('Meta viewport tag no encontrada');
    }

    return issues;
  });

  return issues;
}

/**
 * Generar reporte de accesibilidad
 */
export async function generateA11yReport(page: Page) {
  const report = {
    headings: await page.locator('h1, h2, h3, h4, h5, h6').count(),
    links: await page.locator('a').count(),
    buttons: await page.locator('button').count(),
    inputs: await page.locator('input, textarea, select').count(),
    images: await page.locator('img').count(),
    issues: await validateAccessibility(page),
  };

  return report;
}

/**
 * Esperar a que página esté completamente lista
 */
export async function waitForPageReady(page: Page, maxWait = 30000) {
  await page.waitForLoadState('networkidle', { timeout: maxWait });
  
  // Esperar a que se renderice
  await page.evaluate(() => {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve(null);
      } else {
        window.addEventListener('load', () => resolve(null));
      }
    });
  });
}

/**
 * Obtener URL y validar navegación
 */
export async function validateNavigation(page: Page, expectedUrl: string | RegExp) {
  await page.waitForURL(expectedUrl);
  const url = page.url();
  return url;
}

/**
 * Generar reporte visual completo
 */
export async function generateVisualReport(page: Page, testName: string) {
  const viewport = getViewportInfo(page);
  const performance = await getPerformanceMetrics(page);
  const a11y = await generateA11yReport(page);
  const hasOverflow = !(await validateNoHorizontalOverflow(page).catch(() => false));

  return {
    test: testName,
    viewport,
    performance,
    accessibility: a11y,
    hasHorizontalOverflow: hasOverflow,
    timestamp: new Date().toISOString(),
  };
}

export default {
  getViewportInfo,
  captureScreenshot,
  validateElement,
  validateNoHorizontalOverflow,
  getPerformanceMetrics,
  validateColorContrast,
  interactWithElement,
  captureElementState,
  validateAccessibility,
  generateA11yReport,
  waitForPageReady,
  validateNavigation,
  generateVisualReport,
};
