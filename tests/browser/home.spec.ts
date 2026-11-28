import { expect, test } from '@playwright/test';

test('home introduces the person and exposes work and career paths without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Explore', exact: true }).first()).toBeVisible();
  await expect(page.locator('a[href="/work/market-systems/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/about/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/experience/"]').first()).toBeVisible();
  await context.close();
});

test('mobile navigation remains available when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Explore' })).toBeVisible();
  await context.close();
});

test('primary navigation has four explicit paths and remains keyboard reachable', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('link')).toHaveText(['Explore', 'Writing', 'About', 'Contact']);
  const nextLink = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  await page.keyboard.press(nextLink);
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press(nextLink);
  await expect(page.getByRole('link', { name: /Suleman Manji home/i })).toBeFocused();
});

test('home has no horizontal overflow at a 320 pixel viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/');
  const widths = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
});

test('mobile navigation reports state and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('[data-menu-button]');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Explore' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
});

test('theme choice persists after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
