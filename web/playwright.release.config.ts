import { defineConfig, devices } from '@playwright/test'

// Read-only deployed checks. Missing release inputs fail instead of silently skipping.
for (const key of ['E2E_BASE_URL', 'E2E_RELEASE_SHA', 'E2E_JOB_ID', 'E2E_JOB_TITLE', 'E2E_COMPANY_NAME', 'E2E_SEARCH', 'E2E_LOCATION']) {
  if (!process.env[key]) throw new Error(`Deployed acceptance requires ${key}; use an approved real active listing.`)
}
if (!/^[a-f0-9]{40}$/.test(process.env.E2E_RELEASE_SHA!)) throw new Error('E2E_RELEASE_SHA must be the full pushed commit SHA')
if (!process.env.E2E_BASE_URL!.startsWith('https://')) throw new Error('Deployed acceptance requires an HTTPS E2E_BASE_URL')

export default defineConfig({
  testDir: './tests/release',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: process.env.E2E_BASE_URL, serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
})
