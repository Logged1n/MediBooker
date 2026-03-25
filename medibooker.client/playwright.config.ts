import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'https://localhost:63558',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'dotnet run --project ../MediBooker.Server --no-launch-profile',
      env: { ASPNETCORE_URLS: 'https://localhost:7075', ASPNETCORE_ENVIRONMENT: 'Development' },
      url: 'https://localhost:7075/api/rooms',
      timeout: 90_000,
      ignoreHTTPSErrors: true,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      url: 'https://localhost:63558',
      timeout: 30_000,
      ignoreHTTPSErrors: true,
      reuseExistingServer: true,
    },
  ],
});
