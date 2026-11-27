import { expect, test } from '@playwright/test';

test('Writing preserves ordinary article routes and links to broader discovery without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/writing');
  await expect(page.getByRole('heading', { name: 'Notes from the work and the questions around it.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore projects, subjects, and related paths' })).toHaveAttribute('href', '/explore/');
  await expect(page.locator('[data-writing-url="/notes/late-october-skywatching-binoculars-telescope"]')).toHaveCount(1);
  expect(await page.locator('[data-writing-url]').count()).toBeGreaterThan(0);
  await context.close();
});
