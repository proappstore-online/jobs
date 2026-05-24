import { expect, test } from '@playwright/test'

test.describe('Sign-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api.freeappstore.online/v1/auth/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
    await page.route('**/api.proappstore.online/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
  })

  test('renders sign-in page when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /jobs/i })).toBeVisible()
    await expect(page.getByText(/find your next role/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with github/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /proappstore/i })).toBeVisible()
  })

  test('Google sign-in fires OAuth start request', async ({ page }) => {
    await page.goto('/')
    const oauthRequest = page.waitForRequest(
      (req) => req.url().includes('api.freeappstore.online') && req.url().includes('/auth/'),
      { timeout: 5_000 },
    )
    await page.getByRole('button', { name: /sign in with google/i }).click()
    const req = await oauthRequest
    expect(req.url()).toMatch(/api\.freeappstore\.online/)
    expect(req.url()).toMatch(/google/)
  })

  test('GitHub sign-in fires OAuth start request', async ({ page }) => {
    await page.goto('/')
    const oauthRequest = page.waitForRequest(
      (req) => req.url().includes('api.freeappstore.online') && req.url().includes('/auth/'),
      { timeout: 5_000 },
    )
    await page.getByRole('button', { name: /sign in with github/i }).click()
    const req = await oauthRequest
    expect(req.url()).toMatch(/api\.freeappstore\.online/)
    expect(req.url()).toMatch(/github/)
  })
})
