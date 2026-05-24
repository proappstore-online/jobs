import { expect, test } from '@playwright/test'

test.describe('Route gating (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api.freeappstore.online/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
    await page.route('**/api.proappstore.online/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
  })

  const guardedHashes = [
    '#/saved',
    '#/companies',
    '#/applications',
    '#/employer',
    '#/register-company',
    '#/job/some-id',
    '#/company/some-slug',
    '#/post-job/some-company',
    '#/applicants/some-job',
  ]

  for (const hash of guardedHashes) {
    test(`${hash} shows sign-in when unauthenticated`, async ({ page }) => {
      await page.goto(`/${hash}`)
      await expect(
        page.getByRole('button', { name: /sign in with google/i }),
      ).toBeVisible()
    })
  }
})

test.describe('Hash routing (structure)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api.freeappstore.online/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
    await page.route('**/api.proappstore.online/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
  })

  test('root path shows sign-in (no hash)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /jobs/i })).toBeVisible()
  })

  test('unknown hash shows sign-in (falls through to browse)', async ({ page }) => {
    await page.goto('/#/unknown-route')
    await expect(
      page.getByRole('button', { name: /sign in with google/i }),
    ).toBeVisible()
  })
})
