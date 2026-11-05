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
      const auto = { __user_id: user, __uuid: 'id-' + ++sequence, __now: 1000 }
      for (const sql of sqls) {
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
  assert.equal(run('post_job', { ...post, id: 'foreign' }, 'employer-b').changes, 0)
  assert.equal(run('post_job', { ...post, id: 'bad', salary_min: 200, salary_max: 100 }, 'employer-a').changes, 0)
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
  assert.equal(run('close_job', { job_id: 'job-a' }, 'employer-b').changes, 0)
  assert.equal(run('close_job', { job_id: 'job-a' }, 'employer-a').changes, 1)
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
