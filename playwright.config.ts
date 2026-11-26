import { defineConfig } from '@playwright/test';

const preview = process.env.SITE_PREVIEW_URL ?? 'http://127.0.0.1:4000';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: preview, browserName: 'chromium' },
  webServer: process.env.SITE_PREVIEW_URL ? undefined : {
    command: 'python3 scripts/serve_preview.py --port 4000',
    url: 'http://127.0.0.1:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  reporter: 'list'
});
