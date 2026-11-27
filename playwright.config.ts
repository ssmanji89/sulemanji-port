import { defineConfig } from '@playwright/test';

const preview = process.env.SITE_PREVIEW_URL ?? 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: preview, browserName: 'chromium' },
  webServer: process.env.SITE_PREVIEW_URL ? undefined : {
    command: 'python3 scripts/serve_preview.py --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 60_000
  },
  reporter: 'list'
});
