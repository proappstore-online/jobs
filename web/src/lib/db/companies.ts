import { app } from '../app'
import { ensureMigrated } from './core'
import type { JobWithCompany } from './jobs'

export interface CompanyRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  website: string | null
  location: string | null
  industry: string | null
  size: string | null
  created_at: number
}

export interface ListCompaniesOpts {
  search?: string
  limit?: number
  offset?: number
}

export async function listCompanies(opts: ListCompaniesOpts = {}): Promise<CompanyRow[]> {
  await ensureMigrated()
  const clauses: string[] = []
  const params: unknown[] = []
  const limit = opts.limit ?? 20
  const offset = opts.offset ?? 0

  if (opts.search) {
    clauses.push(`(name LIKE ? OR industry LIKE ?)`)
    const term = `%${opts.search}%`
    params.push(term, term)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const { rows } = await app.db.query<CompanyRow>(
    `SELECT * FROM companies ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  return rows
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  await ensureMigrated()
  const { rows } = await app.db.query<CompanyRow>(
    `SELECT * FROM companies WHERE id = ?`,
    [id],
  )
  return rows[0] ?? null
}

export async function getCompanyBySlug(slug: string): Promise<CompanyRow | null> {
  await ensureMigrated()
  const { rows } = await app.db.query<CompanyRow>(
    `SELECT * FROM companies WHERE slug = ?`,
    [slug],
  )
  return rows[0] ?? null
}

export async function getCompanyJobs(companyId: string): Promise<JobWithCompany[]> {
  await ensureMigrated()
  const { rows } = await app.db.query<JobWithCompany>(
    `SELECT j.*,
            c.name        AS company_name,
            c.slug        AS company_slug,
            c.logo_url    AS company_logo_url,
            c.location    AS company_location
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
      WHERE j.company_id = ? AND j.status = 'active'
      ORDER BY j.posted_at DESC`,
    [companyId],
  )
  return rows
}
