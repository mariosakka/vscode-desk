import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/sidebar.spec.ts', '**/page-viewer.spec.ts', '**/mcp.spec.ts'],
    },
  ],
});
