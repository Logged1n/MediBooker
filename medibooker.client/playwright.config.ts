import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, 'e2e', '.auth', 'dr-kowalski.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'https://localhost:63558',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Projekt setup — loguje się raz i zapisuje storageState
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Projekt główny — testy korzystające z loginAs() wewnętrznie
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/state-management.spec.ts',
    },

    // Projekt z gotowym stanem uwierzytelnienia (storageState)
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      testMatch: '**/state-management.spec.ts',
      dependencies: ['setup'],
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
