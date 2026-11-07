import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

const manifest = JSON.parse(readFileSync(new URL('../mcp.json', import.meta.url)))
const { migrations } = JSON.parse(readFileSync(new URL('../migrations.json', import.meta.url)))
const tools = new Map(manifest.tools.map(t => [t.name, t]))

// Binds like the PAS executor (backend action-sql.ts): named params become positional `?`,
// :__uuid is fresh per occurrence, :__now is one reading per call shared by every statement.
function fixture(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close())
  for (const m of migrations) db.exec(m.sql)
  let clock = 1_800_000_000_000
  function run(name, input = {}, user = 'user-a') {
    const tool = tools.get(name)
    const params = Object.fromEntries(Object.entries(tool.params).map(([k, v]) => [k, input[k] ?? v.default ?? null]))
    const now = ++clock
    const exec = sql => {
      const names = []
      const positional = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, n) => { names.push(n); return '?' })
      const values = names.map(n => n === '__user_id' ? user : n === '__now' ? now : n === '__uuid' ? randomUUID() : params[n])
      return tool.operation === 'query' ? db.prepare(positional).all(...values) : Number(db.prepare(positional).run(...values).changes)
    }
    db.exec('BEGIN')
    try { const out = tool.statements ? tool.statements.map(exec) : exec(tool.sql); db.exec('COMMIT'); return out } catch (e) { db.exec('ROLLBACK'); throw e }
  }
  return { db, run, lead: url => db.prepare('SELECT * FROM leads WHERE source_url = ?').get(url) }
}

const seen = { source_url: 'https://au.seek.com/job/95717400', source_board: 'seek', title: 'BizTX Manager', company_name: 'Twinings Ovaltine', company_slug: 'twinings-ovaltine', location: 'Rowville VIC', category: 'Engineering', tags: '["it leadership","erp"]', seen_at: 1_790_000_000_000 }
const original = { original_url: 'https://twiningsovocareers.pinpointhq.com/postings/00c5', source_host: 'twiningsovocareers.pinpointhq.com', slug: 'biztx-manager', description: 'Lead the local IT function.' }

test('submit_lead stores a new lead once and marks a cross-board repeat as duplicate', t => {
  const { run, lead } = fixture(t)
  assert.equal(run('submit_lead', seen), 1)
  const first = lead(seen.source_url)
  assert.equal(first.status, 'new'); assert.equal(first.country, 'AU'); assert.equal(first.tags, seen.tags); assert.equal(first.seen_at, seen.seen_at)
  assert.equal(run('submit_lead', seen, 'user-b'), 0, 'same source_url is ignored')
  assert.equal(run('submit_lead', { ...seen, source_url: 'https://www.linkedin.com/jobs/view/1', source_board: 'linkedin', title: ' biztx manager ' }, 'user-b'), 1)
  const dup = lead('https://www.linkedin.com/jobs/view/1')
  assert.equal(dup.status, 'duplicate'); assert.equal(dup.duplicate_of, first.id)
  assert.equal(run('submit_lead', { ...seen, source_url: 'https://nz.seek.com/job/9', country: 'NZ' }), 1)
  assert.equal(lead('https://nz.seek.com/job/9').status, 'new', 'another country is not a duplicate')
  assert.equal(run('submit_lead', { ...seen, source_url: 'https://au.seek.com/job/later', seen_at: seen.seen_at + 61 * 86_400_000 }), 1)
  assert.equal(lead('https://au.seek.com/job/later').status, 'new', 'a repost after 60 days is a new posting')
})

test('submit_lead rejects malformed input', t => {
  const { run } = fixture(t)
  const bad = [{ source_url: 'ftp://x.example/1' }, { source_url: 'javascript:alert(1)' }, { title: ' ' }, { company_name: '' }, { company_slug: 'Bad Slug' }, { country: 'aus' }, { category: 'Wizardry' },
    { location_type: 'moon' }, { employment_type: 'forever' }, { experience_level: 'god' }, { salary_min: 9, salary_max: 1 }, { tags: 'python' }, { tags: '["Python"]' }, { tags: '[1]' }, { tags: JSON.stringify(Array(13).fill('a')) }, { source_board: 'SEEK' }]
  for (const b of bad) assert.equal(run('submit_lead', { ...seen, ...b }), 0, JSON.stringify(b))
})

test('publish_lead validates the original posting, creates job + company and publishes the lead once', t => {
  const { run, lead, db } = fixture(t)
  run('submit_lead', seen)
  const id = lead(seen.source_url).id
  for (const [original_url, source_host] of [['https://au.seek.com/job/95717400', 'au.seek.com'], ['https://www.linkedin.com/jobs/view/1', 'www.linkedin.com'], ['http://twinings.com/x', 'twinings.com']]) {
    assert.deepEqual(run('publish_lead', { ...original, lead_id: id, original_url, source_host }, 'user-b'), [0, 0, 0], original_url)
  }
  assert.deepEqual(run('publish_lead', { ...original, lead_id: id, description: ' ' }, 'user-b'), [0, 0, 0])
  assert.deepEqual(run('publish_lead', { ...original, lead_id: id, employment_type: 'full-time' }, 'user-b'), [1, 1, 1])
  const l = lead(seen.source_url)
  assert.equal(l.status, 'published'); assert.equal(l.original_url, original.original_url); assert.equal(l.job_id, 'job-' + id)
  const job = run('get_job', { job_id: l.job_id })[0]
  assert.equal(job.title, 'BizTX Manager'); assert.equal(job.company_slug, 'twinings-ovaltine'); assert.equal(job.source_url, original.original_url); assert.equal(job.category, 'Engineering'); assert.equal(job.location, 'Rowville VIC')
  assert.equal(db.prepare("SELECT country FROM companies WHERE slug = 'twinings-ovaltine'").get().country, 'AU')
  assert.deepEqual(run('publish_lead', { ...original, lead_id: id }, 'user-c'), [0, 0, 0], 'publishes once')
  assert.equal(run('get_my_jobs', {}, 'user-b').length, 1)
})

test('publish_lead reuses an existing company and refuses an original already listed', t => {
  const { run, lead } = fixture(t)
  run('share_job', { ...original, source_url: original.original_url, title: 'BizTX Manager', category: 'Engineering', company_name: 'Twinings Ovaltine', company_slug: 'twinings-ovaltine' }, 'user-z')
  run('submit_lead', seen)
  assert.deepEqual(run('publish_lead', { ...original, lead_id: lead(seen.source_url).id }), [0, 0, 0], 'same original already active')
  run('submit_lead', { ...seen, source_url: 'https://au.seek.com/job/2', title: 'BizTX Analyst' })
  assert.deepEqual(run('publish_lead', { ...original, lead_id: lead('https://au.seek.com/job/2').id, original_url: 'https://twiningsovocareers.pinpointhq.com/postings/2', slug: 'biztx-analyst' }), [1, 0, 1])
  assert.equal(run('company_jobs', { company_id: 'company-twinings-ovaltine' }).length, 2)
})

test('mark_lead lets only the submitter retire a lead and closes its published job', t => {
  const { run, lead } = fixture(t)
  run('submit_lead', seen)
  const id = lead(seen.source_url).id
  run('publish_lead', { ...original, lead_id: id })
  assert.deepEqual(run('mark_lead', { lead_id: id, status: 'unavailable' }, 'user-b'), [0, 0])
  assert.deepEqual(run('mark_lead', { lead_id: id, status: 'published' }), [0, 0], 'only unavailable/rejected')
  assert.deepEqual(run('mark_lead', { lead_id: id, status: 'unavailable', reason: 'Filled' }), [1, 1])
  assert.equal(lead(seen.source_url).status, 'unavailable'); assert.equal(lead(seen.source_url).status_reason, 'Filled')
  assert.equal(run('get_job', { job_id: 'job-' + id }).length, 0, 'job closed')
  assert.deepEqual(run('mark_lead', { lead_id: id, status: 'rejected' }), [0, 0], 'final states stay final')
})

test('list_my_leads is private to the submitter and never exposes submitter ids', t => {
  const { run } = fixture(t)
  run('submit_lead', seen); run('submit_lead', { ...seen, source_url: 'https://au.seek.com/job/b' }, 'user-b')
  const mine = run('list_my_leads')
  assert.equal(mine.length, 1); assert.equal(mine[0].source_url, seen.source_url)
  assert.ok(!('submitted_by' in mine[0]))
  assert.equal(run('list_my_leads', { status: 'published' }).length, 0)
})

test('post_job, share_job and close_job keep the leads ledger in step', t => {
  const { run, db } = fixture(t)
  run('register_company', { id: 'c1', name: 'Acme', slug: 'acme' }, 'emp')
  assert.deepEqual(run('post_job', { id: 'j1', company_id: 'c1', title: 'Engineer', slug: 'engineer', description: 'd', category: 'Engineering', location_type: 'onsite', salary_currency: 'AUD', employment_type: 'full-time', experience_level: 'mid' }, 'emp'), [1, 1])
  const l = db.prepare("SELECT * FROM leads WHERE job_id = 'j1'").get()
  assert.equal(l.status, 'published'); assert.equal(l.source_board, 'jobs'); assert.equal(l.company_slug, 'acme')
  assert.deepEqual(run('close_job', { job_id: 'j1' }, 'emp'), [1, 1])
  assert.equal(db.prepare("SELECT status FROM leads WHERE job_id = 'j1'").get().status, 'unavailable')
  assert.deepEqual(run('post_job', { id: 'j2', company_id: 'c1', title: 'X', slug: 'x', description: 'd', category: 'Engineering', location_type: 'onsite', salary_currency: 'AUD', employment_type: 'full-time', experience_level: 'mid' }, 'intruder'), [0, 0])
})

test('migration backfills existing jobs into the ledger', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close())
  for (const m of migrations.slice(0, 5)) db.exec(m.sql)
  db.exec("INSERT INTO companies (id,name,slug,created_at) VALUES ('c','Acme','acme',1); INSERT INTO jobs (id,company_id,title,slug,description,category,posted_at,created_at,status,source_url) VALUES ('a','c','A','a','d','Engineering',5,5,'active',NULL), ('b','c','B','b','d','Engineering',6,6,'closed','https://acme.com/b')")
  db.exec(migrations[5].sql)
  const rows = db.prepare('SELECT job_id, status, source_board, source_url, seen_at FROM leads ORDER BY job_id').all().map(r => ({ ...r }))
  assert.deepEqual(rows, [
    { job_id: 'a', status: 'published', source_board: 'jobs', source_url: 'https://jobs.proappstore.online/#/job/a', seen_at: 5 },
    { job_id: 'b', status: 'unavailable', source_board: 'company', source_url: 'https://acme.com/b', seen_at: 6 },
  ])
  assert.equal(db.prepare("SELECT country FROM companies WHERE id = 'c'").get().country, 'AU')
})
