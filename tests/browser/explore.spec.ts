import { expect, test } from '@playwright/test';

test('Explore shows broad real-content paths without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/explore/');
  await expect(page.getByRole('heading', { name: 'Follow a project, a question, or a subject.' })).toBeVisible();
  for (const title of ['Market automation and decision systems', 'Cavelo nodes for n8n', 'Reproduce the calculation', 'Looking up']) {
    await expect(page.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
  }
  const catalogResponse = await context.request.get('/content-index.json');
  expect(catalogResponse.ok()).toBe(true);
  const catalog: { items: { canonical_url: string }[] } = await catalogResponse.json();
  const renderedPaths = await page.locator('[data-content-item]').evaluateAll((cards) =>
    cards.map((card) => card.querySelector('h3 a')?.getAttribute('href'))
  );
  expect(renderedPaths).toEqual(catalog.items.map((item) => item.canonical_url));
  await context.close();
});

test('topic search filters entries and reports the result count', async ({ page }) => {
  await page.goto('/explore/');
  await page.getByLabel('Search titles and summaries').fill('pagination');
  await expect(page.locator('[data-content-item]:visible')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('1 entry');
  await expect(page.getByRole('link', { name: 'Cavelo nodes for n8n', exact: true })).toBeVisible();
});

test('project relationships explain why one path leads to another', async ({ page }) => {
  await page.goto('/explore/');
  const market = page.locator('[data-content-item]').filter({ hasText: 'Market automation and decision systems' }).first();
  await market.locator('summary').click();
  await expect(market.getByText('finBots is one public historical implementation in the market project family.')).toBeVisible();
});

test('mathematics topic page provides readable related items', async ({ page }) => {
  await page.goto('/explore/topics/mathematics/');
  await expect(page.getByRole('heading', { name: 'Mathematics', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reproduce the calculation' })).toBeVisible();
});

test('independent mathematics paths do not add a business CTA', async ({ page }) => {
  await page.goto('/explore/topics/mathematics/');
  await expect(page.getByRole('link', { name: 'Reproduce the calculation' })).toBeVisible();
  await expect(page.getByRole('link', { name: /business engagement/i })).toHaveCount(0);
});
