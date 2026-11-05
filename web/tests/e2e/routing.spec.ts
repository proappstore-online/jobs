import { expect, test } from '@playwright/test'

test.describe('Route gating (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/.pas/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
    await page.route('**/api.proappstore.online/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
  })

  const guardedHashes = [
    '#/saved',
    '#/applications',
    '#/notifications',
    '#/employer',
    '#/register-company',
    '#/post-job/some-company',
    '#/edit-job/some-job',
    '#/edit-company/some-company',
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
    await page.route('**/.pas/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
    await page.route('**/api.proappstore.online/**', (route) =>
      route.fulfill({ status: 401, body: '{"error":"not signed in"}' }),
    )
  })

  test('root path offers public browsing', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Jobs', exact: true })).toBeVisible()
  })

  test('unknown hash falls through to public browse', async ({ page }) => {
    await page.goto('/#/unknown-route')
    await expect(
      page.getByRole('button', { name: 'Sign in', exact: true }),
    ).toBeVisible()
  })
})
