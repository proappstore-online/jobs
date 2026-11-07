import { test, expect, type Page } from '@playwright/test'

const W = 604_800_000, week = Math.floor(Date.now() / W)
const rows: Record<string, unknown[]> = {
  research_countries: [{ country: 'AU', postings: 233 }, { country: 'NZ', postings: 4 }],
  research_summary: [{ postings: 233, employers: 141, listed: 18, unvalidated: 205, unavailable: 2, first_seen: Date.now() - 60 * 86_400_000, last_seen: Date.now() - 3_600_000 }],
  research_weekly: [{ week, postings: 61, employers: 40 }, { week: week - 1, postings: 48, employers: 33 }, { week: week - 3, postings: 22, employers: 18 }],
  research_facets: [
    { category: 'Engineering', work_mode: 'hybrid', contract_type: 'full-time', seniority: 'senior', postings: 80, salary_floor: 150000, salary_ceiling: 220000, with_salary: 6 },
    { category: 'Operations', work_mode: null, contract_type: 'contract', seniority: 'senior', postings: 60, salary_floor: null, salary_ceiling: null, with_salary: 0 },
    { category: 'Engineering', work_mode: 'remote', contract_type: 'full-time', seniority: 'lead', postings: 40, salary_floor: 190000, salary_ceiling: 260000, with_salary: 2 },
  ],
  research_tags: [{ tag: 'project management', postings: 68 }, { tag: 'government', postings: 26 }, { tag: 'ai', postings: 17 }],
  research_employers: [{ company_slug: 'deeca', company_name: 'Department of Energy, Environment and Climate Action (DEECA)', postings: 20, listed: 10, last_seen: Date.now() - 86_400_000, top_category: 'Operations' }, { company_slug: 'randstad-digital', company_name: 'Randstad Digital', postings: 9, listed: 0, last_seen: Date.now() - 2 * 86_400_000, top_category: 'Engineering' }],
  research_employer_roles: [{ company_name: 'Department of Energy, Environment and Climate Action (DEECA)', title: 'Manager Transmission', category: 'Operations', seniority: 'lead', status: 'published', seen_at: Date.now() - 86_400_000, job_id: 'job-x' }],
  get_my_profile: [{ display_name: 'Person', country: 'AU', locations: '["Melbourne"]', categories: '["Engineering"]', work_modes: '[]', employment_types: '[]', seniorities: '["senior"]', tags: '["aws"]', min_salary: 120000 }],
  list_my_matches: [{ id: 'job-x', company_id: 'c', title: 'Manager Transmission', slug: 'm', description: 'd', location: 'East Melbourne VIC', location_type: 'hybrid', salary_min: null, salary_max: null, salary_currency: 'AUD', employment_type: 'contract', category: 'Operations', experience_level: 'lead', posted_at: Date.now(), status: 'active', source: 'community', source_url: 'https://careers.deeca.vic.gov.au/job/1', company_name: 'DEECA', company_slug: 'deeca', company_location: null }],
  list_jobs: [], count_jobs: [{ cnt: 0 }], list_saved_jobs: [], list_applications: [], count_unread_notifications: [{ cnt: 3 }],
}

async function mock(page: Page) {
  const calls: { name: string; params: Record<string, unknown> }[] = []
  await page.route('**/.pas/**', (route) => route.fulfill({ json: { id: 'person-a', login: 'person', name: 'Person', avatarUrl: null } }))
  await page.route(/(?:api\.proappstore\.online|\/\.pas\/api\/)/, async (route) => {
    const name = route.request().url().split('/').at(-1)!
    calls.push({ name, params: route.request().postDataJSON()?.params ?? {} })
    await route.fulfill({ json: name in rows ? { rows: rows[name] } : { meta: { changes: 1 } } })
  })
  return calls
}
const shot = (page: Page, name: string) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve())

for (const [label, size] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]] as const) {
  test(`research overview, directory and employer profile render (${label})`, async ({ page }) => {
    await page.setViewportSize(size)
    const calls = await mock(page)
    await page.goto('/#/research')
    await expect(page.getByRole('heading', { name: 'Job market' })).toBeVisible()
    await expect(page.getByText('Postings seen')).toBeVisible()
    await expect(page.getByText('233', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Postings per week/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Engineering: 120' })).toBeVisible()
    await shot(page, `research-${label}`)
    await page.getByRole('button', { name: 'Engineering: 120' }).click()
    await expect(page).toHaveURL(/#\/research\/employers\?category=Engineering$/)
    await expect(page.getByRole('heading', { name: 'Employers' })).toBeVisible()
    expect(calls.some((c) => c.name === 'research_employers' && c.params.category === 'Engineering')).toBe(true)
    await page.getByRole('button', { name: /Department of Energy/ }).click()
    await expect(page.getByRole('heading', { name: /Department of Energy/ })).toBeVisible()
    await expect(page.getByText('Manager Transmission')).toBeVisible()
    await shot(page, `employer-${label}`)
  })

  test(`profile saves preferences and matches use them; icon nav shows (${label})`, async ({ page }) => {
    await page.setViewportSize(size)
    const calls = await mock(page)
    await page.goto('/#/profile')
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Engineering' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Remote' }).click()
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page.getByText(/^Saved\./)).toBeVisible()
    const saved = calls.find((c) => c.name === 'save_my_profile')!.params
    expect(JSON.parse(saved.work_modes as string)).toEqual(['remote'])
    expect(JSON.parse(saved.locations as string)).toEqual(['Melbourne'])
    await shot(page, `profile-${label}`)
    const nav = page.getByRole('navigation', { name: label === 'phone' ? 'Primary' : 'Main' })
    for (const name of ['Jobs', 'Market', 'Saved', 'Applied', 'Profile']) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
    await nav.getByRole('link', { name: 'Jobs', exact: true }).click()
    await page.getByRole('button', { name: 'Matches for you' }).click()
    await expect(page.getByText(/1 job matches/)).toBeVisible()
    await expect(page.getByText('Manager Transmission')).toBeVisible()
    await shot(page, `matches-${label}`)
  })
}
