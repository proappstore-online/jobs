import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
const manifest = JSON.parse(readFileSync(new URL('../mcp.json', import.meta.url)))
const { migrations } = JSON.parse(readFileSync(new URL('../migrations.json', import.meta.url)))
const tools = new Map(manifest.tools.map(t => [t.name, t]))
function fixture(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close())
  for (const m of migrations) db.exec(m.sql)
  let sequence = 0
  function run(name, input = {}, user = 'candidate-a') {
    const tool = tools.get(name)
    const params = Object.fromEntries(Object.entries(tool.params).map(([key, value]) => [key, input[key] ?? value.default ?? null]))
    const sqls = tool.statements ?? [tool.sql]
    const result = []
    db.exec('BEGIN')
    try {
      // Like the platform executor: :__uuid is fresh per occurrence, :__now is one reading per call.
      const auto = { __user_id: user, __now: 1000 + ++sequence }
      for (const raw of sqls) {
        const sql = raw.replace(/:__uuid\b/g, () => { const k = '__uuid_' + ++sequence; auto[k] = 'id-' + sequence; return ':' + k })
        const bound = Object.fromEntries([...sql.matchAll(/:([\w]+)/g)].map(([, key]) => [key, key in auto ? auto[key] : params[key] ?? null]))
        result.push(tool.operation === 'query' ? db.prepare(sql).all(bound) : db.prepare(sql).run(bound))
      }
      db.exec('COMMIT'); return tool.statements ? result : result[0]
    } catch (err) { db.exec('ROLLBACK'); throw err }
  }
  const company = { id: 'company-a', name: 'Acme', slug: 'acme' }
  run('register_company', company, 'employer-a')
  run('register_company', { ...company, id: 'company-b', slug: 'beta', name: 'Beta' }, 'employer-b')
  const post = { id: 'job-a', company_id: 'company-a', title: 'Engineer', slug: 'engineer', description: 'A real description', category: 'Engineering', location: 'Sydney', location_type: 'onsite', salary_currency: 'AUD', employment_type: 'full-time', experience_level: 'mid' }
  run('post_job', post, 'employer-a')
  return { db, run, post }
}
const contact = { job_id: 'job-a', candidate_name: 'Candidate A', contact_email: 'candidate@example.test', note: 'Please consider my application.', notification_id: 'notice-a' }
test('release journey preserves saved jobs, private review, one notification and closed-job protection', t => {
  const { run, db } = fixture(t)
  assert.equal(run('list_jobs', { location: 'Melbourne', location_like: '%Melbourne%' }).length, 0)
  assert.equal(run('list_jobs', { search: 'Engineer', search_like: '%Engineer%', location: 'Sydney', location_like: '%Sydney%' }).length, 1)
  assert.equal(run('get_company_by_slug', { slug: 'acme' })[0].name, 'Acme')
  run('save_job', { job_id: 'job-a' })
  assert.equal(run('list_saved_jobs')[0].id, 'job-a')
  assert.equal(run('list_saved_jobs', {}, 'candidate-b').length, 0)
  run('apply_to_job', contact)
  assert.equal(run('get_job_applicants', { job_id: 'job-a' }, 'employer-a')[0].note, contact.note)
  run('update_applicant_status', { job_id: 'job-a', applicant_user_id: 'candidate-a', status: 'interview' }, 'employer-a')
  assert.equal(run('list_applications')[0].application_status, 'interview')
  assert.deepEqual(run('apply_to_job', { ...contact, notification_id: 'duplicate' }).map(r => Number(r.changes)), [0, 0])
  assert.equal(run('close_job', { job_id: 'job-a' }, 'employer-a')[0].changes, 1)
  assert.equal(run('get_job', { job_id: 'job-a' }).length, 0)
  assert.deepEqual(run('apply_to_job', { ...contact, notification_id: 'closed' }, 'candidate-b').map(r => Number(r.changes)), [0, 0])
  assert.equal(db.prepare('SELECT COUNT(*) n FROM applications').get().n, 1)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM notifications').get().n, 1)
  assert.equal(run('get_job_applicants', { job_id: 'job-a' }, 'employer-a').length, 1)
  assert.equal(run('withdraw_application', { job_id: 'job-a' }).changes, 1)
  assert.equal(run('list_applications').length, 0)
})
test('application is private to its candidate and job poster; two candidates remain isolated', t => {
  const { run } = fixture(t)
  assert.equal(run('apply_to_job', contact)[0].changes, 1)
  assert.equal(run('get_application_status', { job_id: 'job-a' })[0].contact_email, contact.contact_email)
  assert.equal(run('get_application_status', { job_id: 'job-a' }, 'candidate-b').length, 0)
  assert.equal(run('get_job_applicants', { job_id: 'job-a' }, 'employer-b').length, 0)
  assert.equal(run('get_job_applicants', { job_id: 'job-a' }, 'employer-a')[0].candidate_name, 'Candidate A')
  run('apply_to_job', { ...contact, candidate_name: 'Candidate B', contact_email: 'b@example.test', notification_id: 'notice-b' }, 'candidate-b')
  assert.equal(run('list_applications').length, 1)
  assert.equal(run('get_job_applicants', { job_id: 'job-a' }, 'employer-a').length, 2)
})
test('duplicate applications at the same timestamp notify once; missing, own, closed and external jobs reject', t => {
  const { run, db } = fixture(t)
  run('apply_to_job', contact)
  assert.deepEqual(run('apply_to_job', { ...contact, notification_id: 'repeat' }).map(r => Number(r.changes)), [0, 0])
  assert.equal(db.prepare('SELECT COUNT(*) n FROM notifications').get().n, 1)
  for (const user of ['employer-a', 'candidate-b']) {
    if (user === 'candidate-b') run('close_job', { job_id: 'job-a' }, 'employer-a')
    assert.equal(run('apply_to_job', { ...contact, notification_id: user }, user)[0].changes, 0)
  }
  assert.equal(run('apply_to_job', { ...contact, job_id: 'missing' })[0].changes, 0)
  db.exec("UPDATE jobs SET status = 'active', source_url = 'https://example.test/apply'")
  assert.equal(run('apply_to_job', contact, 'candidate-b')[0].changes, 0)
})
test('contact validation, legacy missing contact and withdrawal stay honest', t => {
  const { run, db } = fixture(t)
  for (const bad of [{ candidate_name: '' }, { contact_email: 'invalid' }, { note: '' }]) assert.equal(run('apply_to_job', { ...contact, ...bad })[0].changes, 0)
  db.exec("INSERT INTO applications (id,user_id,job_id,applied_at) VALUES ('legacy','candidate-a','job-a',1)")
  assert.equal(run('get_job_applicants', { job_id: 'job-a' }, 'employer-a')[0].contact_email, null)
  assert.equal(run('withdraw_application', { job_id: 'job-a' }, 'candidate-b').changes, 0)
  assert.equal(run('withdraw_application', { job_id: 'job-a' }).changes, 1)
})
test('employer writes enforce ownership, optional clearing, required fields and salary ranges', t => {
  const { run, post } = fixture(t)
  assert.equal(run('post_job', { ...post, id: 'foreign' }, 'employer-b')[0].changes, 0)
  assert.equal(run('post_job', { ...post, id: 'bad', salary_min: 200, salary_max: 100 }, 'employer-a')[0].changes, 0)
  assert.equal(run('update_company', { company_id: 'company-a', set_name: 1, name: 'Other' }, 'employer-b').changes, 0)
  run('update_company', { company_id: 'company-a', set_description: 1, description: 'About us' }, 'employer-a')
  assert.equal(run('get_my_companies', {}, 'employer-a')[0].name, 'Acme')
  run('update_company', { company_id: 'company-a', set_description: 1, description: '' }, 'employer-a')
  assert.equal(run('get_my_companies', {}, 'employer-a')[0].description, '')
  assert.equal(run('update_job', { job_id: 'job-a', set_salary_min: 1, salary_min: -1 }, 'employer-a').changes, 0)
  run('update_job', { job_id: 'job-a', set_salary_min: 1, salary_min: 100 }, 'employer-a')
  run('update_job', { job_id: 'job-a', set_salary_min: 1 }, 'employer-a')
  assert.equal(run('get_my_job', { job_id: 'job-a' }, 'employer-a')[0].salary_min, null)
  assert.equal(run('get_my_job', { job_id: 'job-a' }, 'employer-b').length, 0)
  assert.equal(run('close_job', { job_id: 'job-a' }, 'employer-b')[0].changes, 0)
  assert.equal(run('close_job', { job_id: 'job-a' }, 'employer-a')[0].changes, 1)
  assert.equal(run('get_job', { job_id: 'job-a' }).length, 0)
  assert.equal(run('list_jobs').length, 0)
  assert.equal(run('get_my_job', { job_id: 'job-a' }, 'employer-a')[0].status, 'closed')
})
test('public actions are bounded explicit reads without identity or application data', t => {
  const { run } = fixture(t)
  for (const tool of tools.values()) {
    if (tool.requires_auth !== false) continue
    assert.equal(tool.operation, 'query'); assert.match(tool.sql, /LIMIT (?:20|50|100|1)\b/)
    assert.doesNotMatch(tool.sql.replace(/COUNT\(\*\)/g, 'COUNT(1)'), /\*|applications|owner_user_id|posted_by|:__user_id|contact_email|candidate_name/)
  }
  assert.equal(run('list_jobs', { search: 'Engineer', search_like: '%Engineer%', location: 'Sydney', location_like: '%Sydney%' }).length, 1)
  assert.equal(run('list_jobs', { search: 'missing', search_like: '%missing%' }).length, 0)
})

test('employer updates preserve omitted values and reject foreign owners and invalid partial salary ranges', t => {
  const { run } = fixture(t)
  assert.equal(run('update_job', { job_id: 'job-a', set_title: 1, title: 'Stolen' }, 'employer-b').changes, 0)
  assert.equal(run('update_company', { company_id: 'company-a', set_name: 1, name: ' ' }, 'employer-a').changes, 0)
  for (const field of ['title', 'description', 'category']) {
    assert.equal(run('update_job', { job_id: 'job-a', ['set_' + field]: 1, [field]: ' ' }, 'employer-a').changes, 0)
  }
  run('update_job', { job_id: 'job-a', set_salary_min: 1, salary_min: 100, set_salary_max: 1, salary_max: 200 }, 'employer-a')
  assert.equal(run('update_job', { job_id: 'job-a', set_salary_min: 1, salary_min: 300 }, 'employer-a').changes, 0)
  assert.equal(run('update_job', { job_id: 'job-a', set_salary_max: 1, salary_max: 50 }, 'employer-a').changes, 0)
  run('update_job', { job_id: 'job-a', set_location: 1, location: '' }, 'employer-a')
  const row = run('get_my_job', { job_id: 'job-a' }, 'employer-a')[0]
  assert.equal(row.location, '')
  assert.equal(row.salary_min, 100)
  assert.equal(row.salary_max, 200)
  assert.equal(row.title, 'Engineer')
  assert.equal(run('register_company', { id: 'second', name: 'Second company', slug: 'second' }, 'employer-a').changes, 1)
  assert.equal(run('get_my_companies', {}, 'employer-a').length, 2)
})
test('every action compiles against all real migrations', t => {
  const { db } = fixture(t)
  for (const tool of tools.values()) for (const sql of tool.statements ?? [tool.sql]) assert.doesNotThrow(() => db.prepare(sql), tool.name)
})

test('only discovery actions are public; editing and candidate reads require auth', () => {
  const publicNames = [...tools.values()].filter(tool => tool.requires_auth === false).map(tool => tool.name).sort()
  assert.deepEqual(publicNames, ['list_jobs', 'count_jobs', 'get_job', 'get_job_by_slug', 'list_companies', 'get_company', 'get_company_by_slug', 'company_jobs', 'search_jobs'].sort())
  for (const name of publicNames) {
    assert.equal(tools.get(name).auth, undefined, name)
  }
  for (const name of ['get_my_job', 'get_my_companies', 'get_my_jobs', 'list_saved_jobs', 'list_applications', 'get_job_applicants', 'get_application_status']) {
    assert.equal(tools.get(name).requires_auth, true, name)
    assert.match(tools.get(name).sql, /:__user_id/, name)
  }
})

test('two employers see only their own candidates and cannot change foreign applications', t => {
  const { run, post } = fixture(t)
  run('post_job', { ...post, id: 'job-b', company_id: 'company-b' }, 'employer-b')
  run('apply_to_job', contact)
  run('apply_to_job', { ...contact, job_id: 'job-b', candidate_name: 'Candidate B', contact_email: 'b@example.test', notification_id: 'notice-b' }, 'candidate-b')
  assert.deepEqual(run('get_job_applicants', { job_id: 'job-a' }, 'employer-a').map(a => a.contact_email), [contact.contact_email])
  assert.deepEqual(run('get_job_applicants', { job_id: 'job-b' }, 'employer-b').map(a => a.contact_email), ['b@example.test'])
  assert.equal(run('get_job_applicants', { job_id: 'job-b' }, 'employer-a').length, 0)
  const update = { job_id: 'job-a', applicant_user_id: 'candidate-a', status: 'interview' }
  assert.equal(run('update_applicant_status', update, 'employer-b').changes, 0)
  assert.equal(run('update_applicant_status', update, 'employer-a').changes, 1)
  assert.equal(run('get_application_status', { job_id: 'job-a' }).at(0).status, 'interview')
  assert.equal(run('list_applications', {}, 'candidate-b').at(0).contact_email, 'b@example.test')
  assert.equal(run('withdraw_application', { job_id: 'job-a' }, 'candidate-b').changes, 0)
  assert.equal(run('withdraw_application', { job_id: 'job-a' }).changes, 1)
  assert.equal(run('get_application_status', { job_id: 'job-a' }).length, 0)
})

test('share_job accepts original company/ATS postings, rejects job boards and duplicates', t => {
  const { run, db } = fixture(t)
  const share = { source_url: 'https://boards.greenhouse.io/canva/jobs/123', source_host: 'boards.greenhouse.io', title: 'Platform Engineer', slug: 'platform-engineer', description: 'Build the platform.', category: 'Engineering', company_name: 'Canva', company_slug: 'canva', company_website: 'https://www.canva.com', location: 'Sydney' }
  const added = run('share_job', share, 'sharer-a')
  assert.deepEqual(added.map(r => Number(r.changes)), [1, 1, 1])
  assert.equal(db.prepare("SELECT status FROM leads WHERE source_url = ?").get(share.source_url).status, 'published')
  const job = run('list_jobs', { search: 'Platform', search_like: '%Platform%' })[0]
  assert.equal(job.company_name, 'Canva'); assert.equal(job.source, 'community'); assert.equal(job.source_url, share.source_url)
  assert.equal(job.employment_type, 'full-time'); assert.equal(job.salary_currency, 'AUD')
  assert.equal(run('get_my_jobs', {}, 'sharer-a').length, 1)
  assert.equal(run('get_my_companies', {}, 'sharer-a').length, 0)
  assert.deepEqual(run('share_job', share, 'sharer-b').map(r => Number(r.changes)), [0, 0, 0])
  assert.deepEqual(run('share_job', { ...share, source_url: 'https://acme.com/careers/1', source_host: 'acme.com', company_slug: 'acme' }, 'sharer-b').map(r => Number(r.changes)), [1, 0, 1])
  assert.equal(db.prepare("SELECT COUNT(*) n FROM companies WHERE slug = 'acme'").get().n, 1)
  assert.equal(run('company_jobs', { company_id: 'company-a' }).length, 2)
  assert.equal(run('apply_to_job', { ...contact, job_id: job.id })[0].changes, 0)
  const rejected = [
    ['https://www.seek.com.au/job/1', 'www.seek.com.au'], ['https://au.linkedin.com/jobs/view/1', 'au.linkedin.com'],
    ['https://au.indeed.com/viewjob?jk=1', 'au.indeed.com'], ['https://uk.indeed.co.uk/x', 'uk.indeed.co.uk'], ['https://lnkd.in/abc', 'lnkd.in'],
    ['https://au.jora.com/job/1', 'au.jora.com'], ['http://acme.org/careers', 'acme.org'], ['https://evil.com@acme.org/x', 'acme.org'],
    ['https://acme.org.evil.com/x', 'acme.org'], ['https://ACME.org/x', 'ACME.org'], ['https://localhost/x', 'localhost'], ['https://jobs.proappstore.online/#/', 'jobs.proappstore.online']
  ]
  for (const [source_url, source_host] of rejected) assert.equal(run('share_job', { ...share, source_url, source_host, slug: 'x' }, 'sharer-c')[0].changes, 0, source_url)
  for (const bad of [{ title: ' ' }, { description: '' }, { company_name: '' }, { company_slug: 'Bad Slug' }, { salary_min: 200, salary_max: 100 }]) {
    assert.equal(run('share_job', { ...share, source_url: 'https://jobs.lever.co/x/1', source_host: 'jobs.lever.co', ...bad }, 'sharer-c')[0].changes, 0, JSON.stringify(bad))
  }
  assert.equal(run('close_job', { job_id: job.id }, 'sharer-b')[0].changes, 0)
  assert.equal(run('close_job', { job_id: job.id }, 'sharer-a')[0].changes, 1)
  assert.deepEqual(run('share_job', share, 'sharer-b').map(r => Number(r.changes)), [1, 0, 0])
  assert.equal(db.prepare("SELECT status FROM leads WHERE source_url = ?").get(share.source_url).status, 'unavailable')
})
