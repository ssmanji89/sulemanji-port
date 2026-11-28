import { expect, test } from '@playwright/test';

test('market project is presented as a story with honest historical states', async ({ page }) => {
  await page.goto('/work/market-systems/');
  await expect(page.locator('[data-work-format="story"]')).toBeVisible();
  await expect(page.getByText('Private source; historical project family')).toBeVisible();
  await expect(page.getByRole('link', { name: 'botStuff', exact: true })).toHaveCount(0);
  await expect(page.locator('.case-projects strong', { hasText: 'botStuff' })).toBeVisible();
  const relatedPaths = page.getByRole('region', { name: 'Related paths' }).locator('summary');
  await relatedPaths.press('Enter');
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

test('ff-cli stays an independent tool with its demonstration state visible', async ({ page, browserName }) => {
  const videoPath = '/assets/ffcli/demo.mp4';
  let videoRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === videoPath) videoRequests += 1;
  });
  await page.goto('/work/ff-cli/');
  await expect(page.locator('[data-work-format="tool"]')).toBeVisible();
  await expect(page.getByText(/actual league uses a snake draft/).first()).toBeVisible();
  const video = page.locator('video[controls]');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('loading', 'lazy');
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).toHaveAttribute('poster', '/assets/ffcli/warroom-full-board.png');
  await expect(video).toHaveAttribute('width', '1280');
  await expect(video).toHaveAttribute('height', '800');
  const screenshot = page.getByRole('link', { name: 'View an auction board screenshot' });
  await expect(screenshot).toBeVisible();
  await video.scrollIntoViewIfNeeded();
  if (browserName === 'webkit' && process.platform === 'darwin') {
    // Safari's full keyboard navigation reaches its native playback control from the next link.
    await screenshot.focus();
    await page.keyboard.press('Alt+Shift+Tab');
  } else {
    await video.focus();
  }
  expect(videoRequests).toBe(0);
  const [videoResponse] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === videoPath),
    page.keyboard.press('Space'),
  ]);
  expect(videoResponse.ok()).toBe(true);
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
});
