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

test('submit_leads stores valid elements, skips invalid/known ones and dedupes against the ledger', t => {
  const { run, lead, db } = fixture(t)
  run('submit_lead', seen)
  const batch = [
    { ...seen, tags: ['it leadership'] },
    { ...seen, source_url: 'https://www.linkedin.com/jobs/view/7', source_board: 'linkedin', tags: ['erp'] },
    { ...seen, source_url: 'https://au.seek.com/job/2', title: 'Data Engineer', company_slug: 'acme', company_name: 'Acme', tags: ['python', 'aws'], seen_at: 1_790_000_000_001 },
    { ...seen, source_url: 'https://au.seek.com/job/3', title: 'Graphic Designer', company_slug: 'deeca', company_name: 'DEECA', tags: undefined, seen_at: undefined, category: undefined },
    { ...seen, source_url: 'https://au.seek.com/job/4', company_slug: 'Bad Slug' },
    { ...seen, source_url: 'https://au.seek.com/job/5', seen_at: 12 },
    { ...seen, source_url: 'https://au.seek.com/job/6', tags: ['UPPER'] },
  ].map(({ tags, ...rest }) => tags === undefined ? rest : { ...rest, tags })
  assert.equal(run('submit_leads', { leads: JSON.stringify(batch) }, 'scout'), 3)
  assert.equal(lead('https://www.linkedin.com/jobs/view/7').status, 'duplicate')
  const acme = lead('https://au.seek.com/job/2')
  assert.equal(acme.status, 'new'); assert.equal(acme.tags, '["python","aws"]'); assert.equal(acme.submitted_by, 'scout'); assert.match(acme.id, /^lead-[0-9a-f]{32}$/)
  const deeca = lead('https://au.seek.com/job/3')
  assert.equal(deeca.tags, '[]'); assert.equal(deeca.country, 'AU'); assert.equal(deeca.category, null)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM leads').get().n, 4)
  assert.equal(run('submit_leads', { leads: JSON.stringify(Array.from({ length: 51 }, (_, i) => ({ ...seen, source_url: 'https://au.seek.com/x/' + i }))) }), 0, 'max 50 per call')
  assert.equal(run('submit_leads', { leads: 'not json' }), 0)
  assert.equal(run('list_my_leads', {}, 'scout').length, 3)
})

function seed(run) {
  const rows = [
    ['https://au.seek.com/job/r1', 'Engineering Manager', 'Acme', 'acme', 'Engineering', 'hybrid', 'senior', '["engineering management","aws"]', 1_790_000_000_000],
    ['https://au.seek.com/job/r2', 'Data Engineer', 'Acme', 'acme', 'Engineering', 'remote', 'mid', '["python","aws"]', 1_790_700_000_000],
    ['https://au.seek.com/job/r3', 'Project Manager', 'Beta', 'beta', 'Operations', 'onsite', 'senior', '["project management"]', 1_790_700_000_001],
    ['https://nz.seek.com/job/r4', 'Designer', 'Kiwi', 'kiwi', 'Design', null, 'mid', '[]', 1_790_700_000_002, 'NZ'],
  ]
  for (const [source_url, title, company_name, company_slug, category, location_type, experience_level, tags, seen_at, country = 'AU'] of rows) {
    run('submit_lead', { source_url, title, company_name, company_slug, category, location_type, experience_level, tags, seen_at, country, salary_min: title === 'Data Engineer' ? 150000 : null, salary_max: title === 'Data Engineer' ? 180000 : null }, 'submitter-secret')
  }
  run('submit_lead', { source_url: 'https://www.linkedin.com/jobs/view/r1', title: 'Engineering Manager', company_name: 'Acme', company_slug: 'acme', seen_at: 1_790_000_000_005 }, 'submitter-secret')
}

test('research actions aggregate the ledger by country, exclude duplicates and never expose submitters', t => {
  const { run } = fixture(t)
  seed(run)
  assert.deepEqual(run('research_countries').map(r => [r.country, r.postings]), [['AU', 3], ['NZ', 1]])
  const s = run('research_summary')[0]
  assert.equal(s.postings, 3); assert.equal(s.employers, 2); assert.equal(s.unvalidated, 3)
  assert.equal(run('research_summary', { company_slug: 'acme' })[0].postings, 2)
  assert.equal(run('research_summary', { since: 1_790_500_000_000 })[0].postings, 2)
  assert.deepEqual(run('research_weekly').map(r => r.postings).reduce((a, b) => a + b, 0), 3)
  const facets = run('research_facets')
  assert.equal(facets.find(f => f.work_mode === 'remote').salary_floor, 150000)
  assert.deepEqual(run('research_tags').slice(0, 1).map(r => [r.tag, r.postings]), [['aws', 2]])
  const employers = run('research_employers')
  assert.deepEqual(employers.map(e => [e.company_slug, e.postings, e.top_category]), [['acme', 2, 'Engineering'], ['beta', 1, 'Operations']])
  assert.equal(run('research_employers', { q: 'Bet' }).length, 1)
  assert.equal(run('research_employers', { country: 'NZ' })[0].company_name, 'Kiwi')
  assert.deepEqual(run('research_employer_roles', { company_slug: 'acme' }).map(r => r.title), ['Data Engineer', 'Engineering Manager'])
  const everything = JSON.stringify([...['research_countries', 'research_summary', 'research_weekly', 'research_facets', 'research_tags', 'research_employers'].map(n => run(n)), run('research_employer_roles', { company_slug: 'acme' })])
  assert.doesNotMatch(everything, /submitter-secret|submitted_by|seek\.com/)
})

test('research actions are approved, aggregate-only and require sign-in', () => {
  const approved = new Set(manifest.approved_unscoped.map(a => a.action))
  for (const t of manifest.tools.filter(t => t.name.startsWith('research_'))) {
    assert.equal(t.requires_auth, true, t.name); assert.ok(approved.has(t.name), t.name)
    assert.doesNotMatch(t.sql.replaceAll("COUNT(*)", "COUNT(1)"), /submitted_by|source_url|original_url|\*/, t.name)
  }
})

const prefs = { display_name: 'Serge', country: 'AU', locations: '["melbourne"]', categories: '["Engineering"]', work_modes: '[]', employment_types: '[]', seniorities: '["senior","lead"]', tags: '["aws"]', min_salary: 120000 }

test('profile is private and validated; matches follow the saved preferences', t => {
  const { run } = fixture(t)
  assert.equal(run('get_my_profile').length, 0)
  assert.equal(run('save_my_profile', prefs), 1)
  assert.equal(run('get_my_profile')[0].display_name, 'Serge')
  assert.equal(run('get_my_profile', {}, 'user-b').length, 0)
  for (const bad of [{ country: 'au' }, { categories: '["Wizardry"]' }, { work_modes: '["moon"]' }, { tags: '["UPPER"]' }, { locations: 'melbourne' }, { min_salary: -1 }, { display_name: 'x'.repeat(61) }]) {
    assert.equal(run('save_my_profile', { ...prefs, ...bad }), 0, JSON.stringify(bad))
  }
  assert.equal(run('save_my_profile', { ...prefs, display_name: 'S2' }), 1, 'upsert')
  assert.equal(run('get_my_profile')[0].display_name, 'S2')
  run('register_company', { id: 'c1', name: 'Acme', slug: 'acme' }, 'emp')
  const job = (id, extra) => ({ id, company_id: 'c1', title: id, slug: id, description: 'd', category: 'Engineering', location: 'Melbourne VIC', location_type: 'hybrid', salary_currency: 'AUD', employment_type: 'full-time', experience_level: 'senior', ...extra })
  run('post_job', job('match'), 'emp')
  run('post_job', job('sydney', { location: 'Sydney NSW' }), 'emp')
  run('post_job', job('remote-sydney', { location: 'Sydney NSW', location_type: 'remote' }), 'emp')
  run('post_job', job('junior', { experience_level: 'entry' }), 'emp')
  run('post_job', job('cheap', { salary_max: 90000 }), 'emp')
  run('post_job', job('design', { category: 'Design' }), 'emp')
  assert.deepEqual(run('list_my_matches').map(j => j.id).sort(), ['match', 'remote-sydney'])
  assert.equal(run('list_my_matches', {}, 'user-b').length, 0, 'no profile, no matches')
})
