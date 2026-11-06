import { expect, test } from '@playwright/test'

test.skip(!(process.env.E2E_SESSION_TOKEN || process.env.PAS_E2E_SESSION_TOKEN), 'requires platform session grant')

test.use({
  // Only this file receives real credentials; mocked tests keep clean contexts.
  storageState: async ({}, use) => {
    const state = process.env.JOBS_E2E_STORAGE_STATE
    if (!state) throw new Error('Authenticated global setup did not produce storage state')
    await use(state)
  },
  trace: 'off',
  screenshot: 'off',
  video: 'off',
})

test('real platform session opens saved jobs and survives reload', async ({ page }) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const saved = page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith('/actions/list_saved_jobs') && response.request().method() === 'POST')
    if (attempt === 0) await page.goto('/#/saved')
    else await page.reload()
    const response = await saved
    expect(response.status()).toBe(200)
    expect(Array.isArray((await response.json()).rows)).toBe(true)
    await expect(page.getByRole('link', { name: /^Applications/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with google/i })).toHaveCount(0)
  }
})
