import { test, expect, type Page } from '@playwright/test'
const job = { id: 'job-a', company_id: 'company-a', title: 'Software Engineer', slug: 'engineer', description: '<p>Build useful software.</p>', location: 'Sydney', location_type: 'hybrid', salary_min: 100000, salary_max: 140000, salary_currency: 'AUD', employment_type: 'full-time', category: 'Engineering', experience_level: 'mid', posted_at: Date.now(), status: 'active', source: 'employer', source_url: null, company_name: 'Acme', company_slug: 'acme', company_location: 'Sydney' }
const company = { id: 'company-a', name: 'Acme', slug: 'acme', description: 'About Acme', website: '', location: 'Sydney', industry: 'Technology', size: '' }
async function mock(page: Page, signedIn = false, changes = 1) {
  const calls: { name: string; params: Record<string, unknown> }[] = []
  await page.route('**/.pas/**', route => route.fulfill({ status: route.request().url().includes('/auth/me') && !signedIn ? 401 : 200, json: { id: 'person-a', login: 'person', name: 'Person', avatarUrl: null } }))
  await page.route(/(?:api\.proappstore\.online|\/\.pas\/api\/)/, async route => {
    const name = route.request().url().split('/').at(-1)!
    const params = route.request().postDataJSON()?.params ?? {}
    calls.push({ name, params })
    const rows: Record<string, unknown[]> = {
      list_jobs: params.search && params.search !== 'Software' ? [] : [job], count_jobs: [{ cnt: params.search && params.search !== 'Software' ? 0 : 1 }],
      get_job: [job], get_my_job: [job], company_jobs: [job], list_companies: [company], get_company_by_slug: [company],
      list_saved_jobs: [], list_applications: [], count_unread_notifications: [{ cnt: 0 }], is_job_saved: [{ cnt: 0 }], get_application_status: [],
      get_my_companies: [company], get_my_jobs: [{ ...job, applicant_count: 1 }], is_company_owner: [{ cnt: 1 }],
      get_job_applicants: [{ user_id: 'candidate', candidate_name: 'Jane Candidate', contact_email: 'jane@example.test', note: 'My message', status: 'applied', applied_at: Date.now() }],
    }
    await route.fulfill({ json: name === 'apply_to_job' ? { results: [{ meta: { changes } }, { meta: { changes } }] } : name in rows ? { rows: rows[name] } : { meta: { changes } } })
  })
  return calls
}

test('malformed auth intent does not break the job page', async ({ page }) => {
  await mock(page, true)
  await page.addInitScript(() => sessionStorage.setItem('jobs.intent', '{invalid'))
  await page.goto('/#/job/job-a')
  await expect(page.getByRole('heading', { name: 'Software Engineer', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('jobs.intent'))).toBeNull()
  await expect(page.getByRole('button', { name: 'Submit application' })).toHaveCount(0)
})

test('failed navigation clears the previous job and application controls', async ({ page }) => {
  await mock(page)
  await page.goto('/#/job/job-a')
  await expect(page.getByRole('heading', { name: 'Software Engineer', exact: true })).toBeVisible()
  await page.route('**/actions/get_job', route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
  await page.evaluate(() => { location.hash = '#/job/unavailable' })
  await expect(page.getByText('Could not load job. Please retry.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0)
})

test('signed-out external apply requires auth and preserves its intent', async ({ page }) => {
  await mock(page)
  await page.route('**/actions/get_job', route => route.fulfill({ json: { rows: [{ ...job, source_url: 'https://example.test/vacancy' }] } }))
  await page.goto('/#/job/job-a')
  await page.getByRole('button', { name: 'Apply', exact: true }).filter({ visible: true }).click()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('jobs.intent'))).toBe(JSON.stringify({ jobId: 'job-a', action: 'apply' }))
})
for (const width of [390, 1280]) {
  test(`keyword/location filters and public company detail at ${width}px`, async ({ page }) => {
    const calls = await mock(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.getByLabel('Search jobs or companies').fill('Software')
    await page.getByLabel('Location', { exact: true }).fill('Sydney')
    await page.getByLabel('Employment type').selectOption('full-time')
    await page.getByLabel('Location type').selectOption('hybrid')
    await expect.poll(() => calls.some(c => c.name === 'list_jobs' && c.params.search === 'Software' && c.params.location === 'Sydney' && c.params.employment_type === 'full-time' && c.params.location_type === 'hybrid')).toBe(true)
    await page.getByText('Software Engineer', { exact: true }).click()
    await page.getByRole('button', { name: 'Acme', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Acme', exact: true })).toBeVisible()
    await expect(page.getByText('About Acme', { exact: true })).toBeVisible()
    await expect(page.getByText('Software Engineer', { exact: true })).toBeVisible()
    expect(calls.some(c => ['get_application_status', 'get_job_applicants', 'is_job_saved'].includes(c.name))).toBe(false)
  })

  test(`candidate save/apply and employer review/close journey at ${width}px (mocked identities)`, async ({ page }) => {
    const calls = await mock(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.getByText('Software Engineer', { exact: true }).click()
    await page.getByRole('button', { name: 'Save job', exact: true }).filter({ visible: true }).click()
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('jobs.intent'))).toContain('save')
    // Simulate the OAuth return; this is UI coverage, not proof of PAS sign-in.
    await page.route('**/.pas/auth/me', route => route.fulfill({ json: { id: 'candidate', name: 'Jane Candidate' } }))
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Unsave job', exact: true }).filter({ visible: true })).toBeVisible()
    await page.getByRole('button', { name: 'Apply', exact: true }).filter({ visible: true }).click()
    await page.getByLabel('Name', { exact: true }).fill('Jane Candidate')
    await page.getByLabel('Contact email').fill('jane@example.test')
    await page.getByLabel('Message', { exact: true }).fill('My message')
    await page.getByRole('button', { name: 'Submit application' }).click()
    await expect(page.getByText('Application submitted!', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Applied', exact: true }).filter({ visible: true }).click()
    expect(calls.filter(c => c.name === 'apply_to_job')).toHaveLength(1)
    await page.route('**/.pas/auth/me', route => route.fulfill({ json: { id: 'employer', name: 'Employer' } }))
    await page.goto('/#/applicants/job-a')
    await expect(page.getByRole('link', { name: 'jane@example.test' })).toBeVisible()
    await expect(page.getByText('My message', { exact: true })).toBeVisible()
    await page.getByLabel('Application status').selectOption('interview')
    await expect(page.getByLabel('Application status')).toHaveValue('interview')
    await page.goto('/#/edit-job/job-a')
    await page.getByRole('button', { name: 'Close job', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Employer Dashboard' })).toBeVisible()
    expect(calls.some(c => c.name === 'save_job')).toBe(true)
    expect(calls.find(c => c.name === 'update_applicant_status')?.params.status).toBe('interview')
    expect(calls.some(c => c.name === 'close_job')).toBe(true)
    await page.route('**/actions/get_job', route => route.fulfill({ json: { rows: [] } }))
    await page.goto('/#/job/job-a')
    await expect(page.getByText('Job unavailable or closed')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0)
  })

  test(`public search, detail and sign-in intent at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const calls = await mock(page)
    await page.goto('/')
    await expect(page.getByText('Software Engineer', { exact: true })).toBeVisible()
    await page.getByText('Software Engineer', { exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Software Engineer', exact: true })).toBeVisible()
    expect(calls.some(c => ['is_job_saved', 'get_application_status'].includes(c.name))).toBe(false)
    await page.getByRole('button', { name: 'Apply', exact: true }).filter({ visible: true }).click()
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('jobs.intent'))).toContain('apply')
  })
}
test('candidate reviews private contact details before submitting and employer sees them', async ({ page }) => {
  const calls = await mock(page, true)
  await page.goto('/#/job/job-a')
  await page.getByRole('button', { name: 'Apply', exact: true }).filter({ visible: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Jane Candidate')
  await page.getByLabel('Contact email').fill('jane@example.test')
  await page.getByLabel('Message', { exact: true }).fill('My message')
  await page.getByRole('button', { name: 'Submit application' }).click()
  await expect(page.getByText('Application submitted!', { exact: true })).toBeVisible()
  expect(calls.find(c => c.name === 'apply_to_job')?.params).toMatchObject({ candidate_name: 'Jane Candidate', contact_email: 'jane@example.test', note: 'My message' })
  await page.goto('/#/applicants/job-a')
  await expect(page.getByText('Jane Candidate', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'jane@example.test' })).toHaveAttribute('href', 'mailto:jane@example.test')
})
test('application rejection never shows submission success', async ({ page }) => {
  await mock(page, true, 0)
  await page.goto('/#/job/job-a')
  await page.getByRole('button', { name: 'Apply', exact: true }).filter({ visible: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Jane')
  await page.getByLabel('Contact email').fill('jane@example.test')
  await page.getByLabel('Message', { exact: true }).fill('Hello')
  await page.getByRole('button', { name: 'Submit application' }).click()
  await expect(page.getByText(/Application not submitted/)).toBeVisible()
  await expect(page.getByText('Application submitted!', { exact: true })).toHaveCount(0)
})
test('employer edits company, posts, edits and closes a listing', async ({ page }) => {
  const calls = await mock(page, true)
  await page.goto('/#/employer')
  await page.getByRole('button', { name: 'Edit company', exact: true }).click()
  await page.getByLabel('name', { exact: true }).fill('Acme Updated')
  await page.getByRole('button', { name: 'Save company' }).click()
  await expect(page.getByRole('heading', { name: 'Employer Dashboard' })).toBeVisible()
  expect(calls.find(c => c.name === 'update_company')?.params.name).toBe('Acme Updated')
  await page.getByRole('button', { name: 'Post a Job' }).click()
  await page.getByLabel('Job title *', { exact: true }).fill('New Engineer')
  await page.getByLabel('Category *', { exact: true }).selectOption({ index: 1 })
  await page.getByLabel('Description *', { exact: true }).fill('Build software')
  await page.getByRole('button', { name: 'Post job', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Employer Dashboard' })).toBeVisible()
  expect(calls.some(c => c.name === 'post_job')).toBe(true)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Job title *', { exact: true }).fill('Updated Engineer')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Employer Dashboard' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByRole('button', { name: 'Close job', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Employer Dashboard' })).toBeVisible()
  expect(calls.some(c => c.name === 'close_job')).toBe(true)
})
test('OAuth return restores intended job and opens review without submitting', async ({ page }) => {
  const calls = await mock(page, true)
  await page.addInitScript(() => { sessionStorage.setItem('jobs.return', '#/job/job-a'); sessionStorage.setItem('jobs.intent', JSON.stringify({ jobId: 'job-a', action: 'apply' })) })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible()
  expect(calls.some(c => c.name === 'apply_to_job')).toBe(false)
})

test('employer can register another company from the dashboard', async ({ page }) => {
  const calls = await mock(page, true)
  await page.goto('/#/employer')
  await page.getByRole('button', { name: 'Register another company' }).click()
  await page.getByLabel('Company name *', { exact: true }).fill('Second company')
  await page.getByRole('button', { name: 'Create company', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Employer Dashboard' })).toBeVisible()
  expect(calls.find(c => c.name === 'register_company')?.params.name).toBe('Second company')
})

test('invalid salary and rejected job writes keep the employer on the form', async ({ page }) => {
  const calls = await mock(page, true, 0)
  await page.goto('/#/edit-job/job-a')
  await page.getByLabel('Salary min', { exact: true }).fill('200000')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('Minimum salary must not exceed maximum salary.')).toBeVisible()
  expect(calls.some(c => c.name === 'update_job')).toBe(false)
  await page.getByLabel('Salary min', { exact: true }).fill('')
  await page.getByLabel('Salary max', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText(/No changes saved/)).toBeVisible()
  expect(calls.find(c => c.name === 'update_job')?.params).toMatchObject({ salary_min: null, salary_max: null, set_salary_min: 1, set_salary_max: 1 })
  await page.getByRole('button', { name: 'Close job', exact: true }).click()
  await expect(page.getByText(/No changes saved/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Edit Job', exact: true })).toBeVisible()
})

test('employer load failures show recovery controls', async ({ page }) => {
  await mock(page, true)
  await page.route('**/actions/get_my_jobs', route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
  await page.goto('/#/employer')
  await expect(page.getByRole('alert')).toContainText('Could not load your companies and listings')
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
  await page.route('**/actions/get_my_job', route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
  await page.goto('/#/edit-job/job-a')
  await expect(page.getByRole('alert')).toContainText('Could not load this listing')
})
test('public discovery reports empty and failed reads', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await page.getByPlaceholder(/search jobs/i).fill('Missing')
  await expect(page.getByText(/no jobs match your search/i)).toBeVisible()
  await page.route('**/actions/list_jobs', route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Could not load jobs')
})

test('unavailable job has no application controls', async ({ page }) => {
  await mock(page)
  await page.route('**/actions/get_job', route => route.fulfill({ json: { rows: [] } }))
  await page.goto('/#/job/closed')
  await expect(page.getByText('Job unavailable or closed')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0)
})
test('external apply opens the source without creating an application', async ({ page }) => {
  const calls = await mock(page, true)
  await page.route('**/actions/get_job', route => route.fulfill({ json: { rows: [{ ...job, source_url: 'https://example.test/vacancy' }] } }))
  await page.addInitScript(() => { window.open = () => null })
  await page.goto('/#/job/job-a')
  await page.getByRole('button', { name: 'Apply', exact: true }).filter({ visible: true }).click()
  expect(calls.some(c => c.name === 'apply_to_job')).toBe(false)
  await expect(page.getByRole('button', { name: 'Submit application' })).toHaveCount(0)
})
test('save intent resumes after auth and failed employer writes remain on the form', async ({ page }) => {
  const calls = await mock(page, true, 0)
  await page.addInitScript(() => sessionStorage.setItem('jobs.intent', JSON.stringify({ jobId: 'job-a', action: 'save' })))
  await page.goto('/#/job/job-a')
  await expect.poll(() => calls.some(c => c.name === 'save_job')).toBe(true)
  await page.goto('/#/edit-company/company-a')
  await page.getByLabel('name', { exact: true }).fill('Updated')
  await page.getByRole('button', { name: 'Save company' }).click()
  await expect(page.getByRole('alert')).toContainText('No changes saved')
  await expect(page.getByRole('heading', { name: 'Edit company' })).toBeVisible()
})

for (const changes of [0, 1]) {
  test(`candidate sees contact and status; withdrawal changes=${changes}`, async ({ page }) => {
    await mock(page, true, changes)
    await page.route('**/actions/list_applications', route => route.fulfill({ json: { rows: [{ ...job, application_status: 'interview', applied_at: Date.now(), candidate_name: 'Jane Candidate', contact_email: 'jane@example.test', note: 'My message' }] } }))
    await page.goto('/#/applications')
    await expect(page.getByText('interview', { exact: true })).toBeVisible()
    await expect(page.getByText(/Jane Candidate/)).toContainText('jane@example.test')
    await page.getByRole('button', { name: 'Withdraw', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm withdraw' }).click()
    if (changes) await expect(page.getByText('No applications yet')).toBeVisible()
    else {
      await expect(page.getByRole('alert')).toContainText('Application was not withdrawn')
      await expect(page.getByText('Software Engineer', { exact: true })).toBeVisible()
    }
  })
}

test('older applications show missing contact and failed status writes stay unchanged', async ({ page }) => {
  await mock(page, true, 0)
  await page.route('**/actions/get_job_applicants', route => route.fulfill({ json: { rows: [{ user_id: 'legacy', status: 'applied', candidate_name: null, contact_email: null, note: null, applied_at: 1 }] } }))
  await page.goto('/#/applicants/job-a')
  await expect(page.getByText('Contact details not supplied with this older application.')).toBeVisible()
  await page.getByLabel('Application status').selectOption('interview')
  await expect(page.getByRole('alert')).toContainText('No changes saved')
  await expect(page.getByLabel('Application status')).toHaveValue('applied')
})

test('application read failures show an error', async ({ page }) => {
  await mock(page, true)
  await page.route('**/actions/list_applications', route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
  await page.goto('/#/applications')
  await expect(page.getByRole('alert')).toContainText('Could not load applications')
})
