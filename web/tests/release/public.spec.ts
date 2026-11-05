import { test, expect } from '@playwright/test'

// No route interception, identity substitution, production writes or fabricated supply.
test('deployed release SHA and PWA assets match the approved release', async ({ request }) => {
  const release = await request.get('/release.json')
  expect(release.ok()).toBe(true)
  expect((await release.json()).commit).toBe(process.env.E2E_RELEASE_SHA)
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest.icons.length).toBeGreaterThan(0)
  for (const icon of manifest.icons) {
    const asset = await request.get(new URL(icon.src, new URL('/manifest.webmanifest', process.env.E2E_BASE_URL)))
    expect(asset.ok(), icon.src).toBe(true)
    expect((await asset.body()).length).toBeGreaterThan(0)
  }
  expect((await request.get('/sw.js')).ok()).toBe(true)
})

test('signed-out keyword/location discovery opens the real job and company', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  const filteredResponse = page.waitForResponse(response => {
    if (!response.url().endsWith('/actions/list_jobs')) return false
    const params = response.request().postDataJSON()?.params
    return params?.search === process.env.E2E_SEARCH && params?.location === process.env.E2E_LOCATION
  })
  await page.getByLabel('Search jobs or companies').fill(process.env.E2E_SEARCH!)
  await page.getByLabel('Location', { exact: true }).fill(process.env.E2E_LOCATION!)
  expect((await filteredResponse).ok()).toBe(true)
  await page.getByText(process.env.E2E_JOB_TITLE!, { exact: true }).first().click()
  await expect(page).toHaveURL(new RegExp(`/#/job/${process.env.E2E_JOB_ID!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
  await expect(page.getByRole('heading', { name: process.env.E2E_JOB_TITLE!, exact: true })).toBeVisible()
  await page.getByRole('button', { name: process.env.E2E_COMPANY_NAME!, exact: true }).click()
  await expect(page.getByRole('heading', { name: process.env.E2E_COMPANY_NAME!, exact: true })).toBeVisible()
})
