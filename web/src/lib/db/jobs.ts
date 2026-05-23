import { app } from '../app'
import { ensureMigrated } from './core'

export interface JobRow {
  id: string
  company_id: string
  title: string
  slug: string
  description: string
  location: string | null
  location_type: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  employment_type: string
  category: string
  experience_level: string
  posted_at: number
  expires_at: number | null
  source: string
  source_url: string | null
  status: string
  created_at: number
}

export interface JobWithCompany extends JobRow {
  company_name: string
  company_slug: string
  company_logo_url: string | null
  company_location: string | null
}

export interface ListJobsOpts {
  search?: string
  location?: string
  category?: string
  type?: string
  locationType?: string
  limit?: number
  offset?: number
}

function buildWhereClause(opts: ListJobsOpts): { where: string; params: unknown[] } {
  const clauses: string[] = [`j.status = 'active'`]
  const params: unknown[] = []

  if (opts.search) {
    clauses.push(`(j.title LIKE ? OR j.description LIKE ? OR c.name LIKE ?)`)
    const term = `%${opts.search}%`
    params.push(term, term, term)
  }
  if (opts.location) {
    clauses.push(`j.location LIKE ?`)
    params.push(`%${opts.location}%`)
  }
  if (opts.category) {
    clauses.push(`j.category = ?`)
    params.push(opts.category)
  }
  if (opts.type) {
    clauses.push(`j.employment_type = ?`)
    params.push(opts.type)
  }
  if (opts.locationType) {
    clauses.push(`j.location_type = ?`)
    params.push(opts.locationType)
  }

  return { where: clauses.join(' AND '), params }
}

export async function listJobs(opts: ListJobsOpts = {}): Promise<JobWithCompany[]> {
  await ensureMigrated()
  const { where, params } = buildWhereClause(opts)
  const limit = opts.limit ?? 20
  const offset = opts.offset ?? 0

  const { rows } = await app.db.query<JobWithCompany>(
    `SELECT j.*,
            c.name     AS company_name,
            c.slug     AS company_slug,
            c.logo_url AS company_logo_url,
            c.location AS company_location
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
      WHERE ${where}
      ORDER BY j.posted_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  return rows
}

export async function countJobs(opts: ListJobsOpts = {}): Promise<number> {
  await ensureMigrated()
  const { where, params } = buildWhereClause(opts)

  const { rows } = await app.db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
      WHERE ${where}`,
    params,
  )
  return rows[0]?.cnt ?? 0
}

export async function getJob(id: string): Promise<JobWithCompany | null> {
  await ensureMigrated()
  const { rows } = await app.db.query<JobWithCompany>(
    `SELECT j.*,
            c.name        AS company_name,
            c.slug        AS company_slug,
            c.logo_url    AS company_logo_url,
            c.location    AS company_location
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
      WHERE j.id = ?`,
    [id],
  )
  return rows[0] ?? null
}

export async function getJobBySlug(slug: string): Promise<JobWithCompany | null> {
  await ensureMigrated()
  const { rows } = await app.db.query<JobWithCompany>(
    `SELECT j.*,
            c.name        AS company_name,
            c.slug        AS company_slug,
            c.logo_url    AS company_logo_url,
            c.location    AS company_location
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
      WHERE j.slug = ? AND j.status = 'active'`,
    [slug],
  )
  return rows[0] ?? null
}

export async function searchJobs(query: string): Promise<JobWithCompany[]> {
  await ensureMigrated()
  const term = `%${query}%`
  const { rows } = await app.db.query<JobWithCompany>(
    `SELECT j.*,
            c.name        AS company_name,
            c.slug        AS company_slug,
            c.logo_url    AS company_logo_url,
            c.location    AS company_location
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'active'
        AND (j.title LIKE ? OR j.description LIKE ? OR c.name LIKE ?)
      ORDER BY j.posted_at DESC
      LIMIT 50`,
    [term, term, term],
  )
  return rows
}
