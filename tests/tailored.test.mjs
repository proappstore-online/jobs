import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

const manifest = JSON.parse(readFileSync(new URL('../mcp.json', import.meta.url)))
const { migrations } = JSON.parse(readFileSync(new URL('../migrations.json', import.meta.url)))
const tools = new Map(manifest.tools.map(t => [t.name, t]))

// Same binding rules as the PAS executor: named params become positional, :__uuid fresh, :__now one reading per call.
function fixture(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close())
  for (const m of migrations) db.exec(m.sql)
  let clock = 1_800_000_000_000
  function run(name, input = {}, user = 'user-a') {
    const tool = tools.get(name)
    const params = Object.fromEntries(Object.entries(tool.params).map(([k, v]) => [k, input[k] ?? v.default ?? null]))
    const now = ++clock
    const names = []
    const sql = tool.sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, n) => { names.push(n); return '?' })
    const values = names.map(n => n === '__user_id' ? user : n === '__now' ? now : n === '__uuid' ? randomUUID() : params[n])
    return tool.operation === 'query' ? db.prepare(sql).all(...values) : Number(db.prepare(sql).run(...values).changes)
  }
  return { db, run }
}

const app = { external_id: 'pags-app-1', source_url: 'https://careers.example.com/jobs/1', title: 'Platform Engineer', company_name: 'Example Co', location: 'Melbourne VIC', resume_md: '# CV\n- item', cover_letter_md: 'Dear team', answers: '[{"question":"Why us?","answer":"Fit"}]', resume_file_name: 'cv.pdf', cover_letter_file_name: 'cl.pdf' }

test('save_tailored_application upserts per (caller, external_id) and keeps status', t => {
  const { run, db } = fixture(t)
  assert.equal(run('save_tailored_application', app), 1)
  const first = run('get_my_tailored', { external_id: app.external_id })[0]
  assert.equal(first.status, 'tailored'); assert.equal(first.resume_md, app.resume_md)
  assert.equal(run('set_tailored_status', { external_id: app.external_id, status: 'approved', note: 'ok' }), 1)
  assert.equal(run('save_tailored_application', { ...app, resume_md: '# CV v2', answers: undefined }), 1)
  const again = run('get_my_tailored', { external_id: app.external_id })[0]
  assert.equal(again.resume_md, '# CV v2'); assert.equal(again.answers, '[]'); assert.equal(again.status, 'approved'); assert.equal(again.id, first.id)
  assert.equal(db.prepare('SELECT count(*) AS n FROM tailored_applications').get().n, 1)
})

test('rows are scoped to the caller', t => {
  const { run } = fixture(t)
  run('save_tailored_application', app)
  assert.equal(run('save_tailored_application', { ...app, title: 'Other' }, 'user-b'), 1, 'same external_id for another caller is a separate row')
  assert.equal(run('get_my_tailored', { external_id: app.external_id }, 'user-b')[0].title, 'Other')
  assert.equal(run('get_my_tailored', { external_id: app.external_id })[0].title, 'Platform Engineer')
  assert.equal(run('get_my_tailored', { external_id: app.external_id }, 'user-c').length, 0)
  assert.equal(run('set_tailored_status', { external_id: app.external_id, status: 'archived' }, 'user-c'), 0)
  assert.equal(run('list_my_tailored', {}, 'user-c').length, 0)
  assert.equal(run('get_my_tailored', { external_id: app.external_id })[0].status, 'tailored')
})

test('set_tailored_status enforces the five statuses and records submitted_at', t => {
  const { run } = fixture(t)
  run('save_tailored_application', app)
  for (const status of ['bogus', 'Approved', '', null]) assert.equal(run('set_tailored_status', { external_id: app.external_id, status }), 0, String(status))
  assert.equal(run('set_tailored_status', { external_id: app.external_id, status: 'approved', note: 'x'.repeat(2001) }), 0)
  for (const status of ['approved', 'failed', 'archived', 'tailored']) assert.equal(run('set_tailored_status', { external_id: app.external_id, status }), 1, status)
  assert.equal(run('set_tailored_status', { external_id: app.external_id, status: 'submitted', submitted_at: 1_790_000_000_000, note: 'sent' }), 1)
  const row = run('get_my_tailored', { external_id: app.external_id })[0]
  assert.equal(row.status, 'submitted'); assert.equal(row.submitted_at, 1_790_000_000_000); assert.equal(row.status_note, 'sent')
  assert.equal(run('set_tailored_status', { external_id: 'missing', status: 'approved' }), 0)
})

test('save_tailored_application rejects malformed input', t => {
  const { run, db } = fixture(t)
  const bad = [{ external_id: ' ' }, { source_url: 'javascript:alert(1)' }, { source_url: 'ftp://x.example' }, { title: ' ' }, { company_name: '' }, { answers: 'nope' }, { answers: '{}' }, { answers: '["x"]' }, { answers: '[{"question":"q"}]' }, { answers: '[{"question":1,"answer":"a"}]' }]
  for (const b of bad) assert.equal(run('save_tailored_application', { ...app, ...b }), 0, JSON.stringify(b))
  assert.equal(db.prepare('SELECT count(*) AS n FROM tailored_applications').get().n, 0)
})

test('list_my_tailored filters by status, orders newest updated first and omits large columns', t => {
  const { run } = fixture(t)
  run('save_tailored_application', app)
  run('save_tailored_application', { ...app, external_id: 'pags-app-2' })
  run('set_tailored_status', { external_id: 'pags-app-1', status: 'approved' })
  const all = run('list_my_tailored')
  assert.deepEqual(all.map(r => r.external_id), ['pags-app-1', 'pags-app-2'])
  for (const col of ['resume_md', 'cover_letter_md', 'answers']) assert.equal(col in all[0], false, col)
  assert.deepEqual(run('list_my_tailored', { status: 'tailored' }).map(r => r.external_id), ['pags-app-2'])
})
