import { expect, test } from '@playwright/test';

test('About provides public human context and independent interests', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: /work, the background, and the questions/i })).toBeVisible();
  await expect(page.getByText(/brake-shop counter/)).toBeVisible();
  await expect(page.getByText(/genealogy and privacy/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Markets and probability' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Career and experience' })).toBeVisible();
});

test('Experience keeps the reviewed career timeline and current Viyu role', async ({ page }) => {
  await page.goto('/experience/');
  await expect(page.getByRole('heading', { name: 'Professional Experience' })).toBeVisible();
  await expect(page.getByText('Sr. Services Engineer').first()).toBeVisible();
  await expect(page.getByText(/July 2025/)).toBeVisible();
  await expect(page.getByRole('link', { name: /service-delivery practice/i })).toBeVisible();
});

test('Contact routes business work to Viyu and keeps personal channels available', async ({ page }) => {
  await page.goto('/contact/');
  await expect(page.getByRole('link', { name: 'Viyu Contact Us' })).toHaveAttribute('href', 'https://viyu.net/contact-support/contact-us/');
  await expect(page.getByRole('link', { name: 'Email Suleman' })).toHaveAttribute('href', 'mailto:ssmanji89@gmail.com');
  await expect(page.locator('a[href="https://www.linkedin.com/in/suleman-manji-1a46852a0"]').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /workshop|intake/i })).toHaveCount(0);
});
