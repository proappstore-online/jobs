import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

const manifest = JSON.parse(readFileSync(new URL('../mcp.json', import.meta.url)))
const { migrations } = JSON.parse(readFileSync(new URL('../migrations.json', import.meta.url)))
const tools = new Map(manifest.tools.map((tool) => [tool.name, tool]))
const view = manifest.operator_view

function fixture(t) {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  for (const migration of migrations) db.exec(migration.sql)
  const company = db.prepare('INSERT INTO companies (id, name, slug, location, industry, owner_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  company.run('company-a', 'Acme', 'acme', 'Melbourne', 'Technology', 'private-owner-a', 1)
  company.run('company-b', 'Beta', 'beta', 'Sydney', 'Health', 'private-owner-b', 2)
  const job = db.prepare('INSERT INTO jobs (id, company_id, title, slug, description, category, status, posted_by, posted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  for (let i = 0; i < 55; i++) {
    const id = `job-${String(i).padStart(3, '0')}`
    job.run(id, i % 2 ? 'company-b' : 'company-a', `Engineer ${i}`, id, 'Job description', 'Engineering', i === 54 ? 'closed' : 'active', `private-owner-${i % 2 ? 'b' : 'a'}`, i + 1, i + 1)
  }
  db.prepare("INSERT INTO applications (id, user_id, job_id, note, applied_at) VALUES ('application-a', 'private-candidate', 'job-000', 'private application note', 1)").run()
  db.exec("UPDATE applications SET candidate_name = 'Private Name', contact_email = 'private@example.test'")
  function execute(name, params = {}) {
    const tool = tools.get(name)
    const bound = Object.fromEntries(Object.entries(tool.params).map(([key, value]) => [key, params[key] ?? value.default ?? null]))
    const statement = db.prepare(tool.sql)
    return tool.operation === 'query' ? statement.all(bound) : statement.run(bound)
  }
  return { db, execute }
}

test('every console entry point declares the same restricted roles and no alternate callers', () => {
  assert.deepEqual(view.admin_access.roles, ['moderator'])
  const referenced = new Set(view.resources.flatMap((r) => [r.action, r.detail.action]))
  for (const action of view.actions) referenced.add(action.action)
  assert.deepEqual([...referenced].sort(), manifest.tools.filter((tool) => tool.name.startsWith('op_')).map((tool) => tool.name).sort())
  for (const name of referenced) {
    const tool = tools.get(name)
    assert.equal(tool.requires_auth, true, name)
    assert.deepEqual(tool.auth.app_roles, ['owner', 'moderator'], name)
    assert.ok(tool.auth.caller_unscoped.reason, name)
    assert.equal(tool.schedule, undefined, name)
    assert.deepEqual(tool.callers ?? ['user'], ['user'], name)
  }
})

test('job lists page without overlap and filter by company, title and status', (t) => {
  const { execute } = fixture(t)
  const first = execute('op_list_jobs')
  assert.equal(first.length, 50)
  const second = execute('op_list_jobs', { after: first.at(-1).job_id })
  assert.equal(second.length, 5)
  assert.equal(new Set([...first, ...second].map((r) => r.job_id)).size, 55)
  assert.equal(execute('op_list_jobs', { after: second.at(-1).job_id }).length, 0)
  const acme = execute('op_list_jobs', { q: 'Acme', status: 'active' })
  assert.equal(acme.length, 27)
  assert.ok(acme.every((row) => row.company_name === 'Acme' && row.status === 'active'))
  assert.equal(execute('op_list_jobs', { q: 'Engineer 54', status: 'closed' })[0].job_id, 'job-054')
  assert.equal(execute('op_list_jobs', { q: "' OR 1=1 --" }).length, 0)
})

test('company search, paging and missing record behavior work against the deployed schema', (t) => {
  const { execute } = fixture(t)
  assert.equal(execute('op_list_companies', { q: 'Health' })[0].company_id, 'company-b')
  assert.deepEqual(execute('op_list_companies', { after: 'company-a' }).map((r) => r.company_id), ['company-b'])
  assert.equal(execute('op_company_detail', { company_id: 'company-a' })[0].name, 'Acme')
  assert.equal(execute('op_company_detail', { company_id: 'missing' }).length, 0)
  assert.equal(execute('op_job_detail', { job_id: 'missing' }).length, 0)
})

test('console queries return only declared public listing/company fields', (t) => {
  const { execute } = fixture(t)
  for (const resource of view.resources) {
    const rows = execute(resource.action)
    assert.ok(rows.length)
    assert.deepEqual(Object.keys(rows[0]).sort(), resource.columns.map((c) => c.key).sort())
    const detail = execute(resource.detail.action, { [resource.detail.param]: rows[0][resource.detail.key] })
    assert.deepEqual(Object.keys(detail[0]).sort(), resource.detail.fields.map((c) => c.key).sort())
    assert.doesNotMatch(JSON.stringify([rows, detail]), /private-owner|private-candidate|private application note|Private Name|private@example.test/)
  }
})

test('closing targets one active job and excludes it from ordinary search', (t) => {
  const { execute, db } = fixture(t)
  assert.equal(execute('op_close_job', { job_id: 'job-000', from_status: 'active' }).changes, 1)
  assert.equal(db.prepare("SELECT status FROM jobs WHERE id = 'job-000'").get().status, 'closed')
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE status = 'active'").get().count, 53)
  assert.ok(!execute('list_jobs', { search: 'Engineer 0', search_like: '%Engineer 0%' }).some((r) => r.id === 'job-000'))
  assert.equal(db.prepare('SELECT note FROM applications').get().note, 'private application note')
})

test('stale, replayed, tampered and missing-target close requests change nothing', (t) => {
  const { execute } = fixture(t)
  assert.equal(execute('op_close_job', { job_id: 'job-000', from_status: 'closed' }).changes, 0)
  assert.equal(execute('op_close_job', { job_id: 'job-054', from_status: 'active' }).changes, 0)
  assert.equal(execute('op_close_job', { job_id: 'job-054', from_status: 'closed' }).changes, 0)
  assert.equal(execute('op_close_job', { job_id: 'missing', from_status: 'active' }).changes, 0)
  assert.equal(execute('op_close_job', { job_id: "' OR 1=1 --", from_status: 'active' }).changes, 0)
  execute('op_close_job', { job_id: 'job-000', from_status: 'active' })
  assert.equal(execute('op_close_job', { job_id: 'job-000', from_status: 'active' }).changes, 0)
})
