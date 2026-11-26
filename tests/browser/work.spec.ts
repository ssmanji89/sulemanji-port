import { expect, test } from '@playwright/test';

test('market project is presented as a story with honest historical states', async ({ page }) => {
  await page.goto('/work/market-systems/');
  await expect(page.locator('[data-work-format="story"]')).toBeVisible();
  await expect(page.getByText('Private source; historical project family')).toBeVisible();
  await expect(page.getByRole('link', { name: 'botStuff', exact: true })).toHaveCount(0);
  await expect(page.locator('.case-projects strong', { hasText: 'botStuff' })).toBeVisible();
  await page.getByText('Related paths').click();
  await expect(page.getByText('robinBots carries forward part of the finBots implementation in a later project structure.')).toBeVisible();
});

test('integration page distinguishes published packages from pending work', async ({ page }) => {
  await page.goto('/work/integrations/');
  await expect(page.locator('[data-work-format="tool"]')).toBeVisible();
  const cavelo = page.locator('.case-projects li').filter({ hasText: 'n8n-nodes-cavelo' });
  await expect(cavelo).toContainText('Published npm package');
  const toast = page.locator('.case-projects li').filter({ hasText: 'toast-pos-mcp' });
  await expect(toast).toContainText('package release pending');
  await expect(cavelo.getByRole('link', { name: 'Project details' })).toHaveAttribute('href', 'https://www.npmjs.com/package/n8n-nodes-cavelo');
});

test('mathematical work exposes its question, checkers, attribution, and limits', async ({ page }) => {
  await page.goto('/work/mathematical-verification/');
  await expect(page.locator('[data-work-format="experiment"]')).toBeVisible();
  await expect(page.getByText(/does not settle the separate two-variable case/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Exact rational checker' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Paul Lezeau’s Lean formalization' })).toBeVisible();
  await expect(page.getByText(/Read the diagram description/)).toBeVisible();
  await expect(page.locator('.figure-description p')).toContainText('custom exact rational checker');
});

test('ff-cli stays an independent tool with its demonstration state visible', async ({ page }) => {
  await page.goto('/work/ff-cli/');
  await expect(page.locator('[data-work-format="tool"]')).toBeVisible();
  await expect(page.getByText(/actual league uses a snake draft/).first()).toBeVisible();
  await expect(page.locator('video[controls]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View an auction board screenshot' })).toBeVisible();
});
