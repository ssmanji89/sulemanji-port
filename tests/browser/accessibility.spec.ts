import { expect, test } from '@playwright/test';

test('home exposes visible focus and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const focusable = page.getByRole('link', { name: 'Explore projects and interests', exact: true });
  await focusable.focus();
  await expect(focusable).toBeFocused();
  const motion = await page.locator('html').evaluate((node) => getComputedStyle(node).scrollBehavior);
  expect(motion).toBe('auto');
});
