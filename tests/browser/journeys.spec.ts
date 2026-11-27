import { expect, test } from '@playwright/test';

test('follow a market project from history to the named implementation', async ({ page }) => {
  await page.goto('/work/market-systems/');
  await expect(page.locator('[data-work-format="story"]')).toBeVisible();
  await expect(page.getByText('Public historical source').first()).toBeVisible();
  await expect(page.locator('#finbots')).toContainText('Indicator services, scheduling, model experiments, and trade records');
});

test('find an independent curiosity and its readable explanation', async ({ page }) => {
  await page.goto('/explore/topics/mathematics/');
  await expect(page.getByRole('link', { name: 'Reproduce the calculation' })).toBeVisible();
  await page.goto('/work/mathematical-verification/');
  await expect(page.locator('.figure-description p')).toContainText('custom exact rational checker');
});

test('follow About to the complete career timeline and resume', async ({ page }) => {
  await page.goto('/about/');
  await page.getByRole('link', { name: 'Career and experience' }).click();
  await expect(page).toHaveURL(/\/experience\/$/);
  await expect(page.getByRole('heading', { name: 'Professional Experience' })).toBeVisible();
  await page.goto('/about/');
  await page.getByRole('link', { name: 'View résumé' }).click();
  await expect(page).toHaveURL(/\/resume\/$/);
  await page.goto('/resume/');
  await expect(page.getByRole('heading', { name: 'Professional Resume' })).toBeVisible();
});

test('Contact offers the two authorized destinations and retired intake stays absent', async ({ page }) => {
  await page.goto('/contact/');
  await expect(page.getByRole('link', { name: 'Viyu Contact Us' })).toHaveAttribute('href', 'https://viyu.net/contact-support/contact-us/');
  await expect(page.getByRole('link', { name: 'Email Suleman' })).toHaveAttribute('href', 'mailto:ssmanji89@gmail.com');
  await expect(page.getByRole('link', { name: /workshop|intake/i })).toHaveCount(0);
  await page.goto('/workshop-intake/');
  await expect(page.locator('form')).toHaveCount(0);
});
