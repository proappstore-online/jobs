import { q } from '../actions'
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
  return q<CompanyRow>('list_companies', {
    search: opts.search ?? null,
    search_like: opts.search ? `%${opts.search}%` : null,
    limit: opts.limit ?? 20,
    offset: opts.offset ?? 0,
  })
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  await ensureMigrated()
  const rows = await q<CompanyRow>('get_company', { company_id: id })
  return rows[0] ?? null
}

export async function getCompanyBySlug(slug: string): Promise<CompanyRow | null> {
  await ensureMigrated()
  const rows = await q<CompanyRow>('get_company_by_slug', { slug })
  return rows[0] ?? null
}

export async function getCompanyJobs(companyId: string): Promise<JobWithCompany[]> {
  await ensureMigrated()
  return q<JobWithCompany>('company_jobs', { company_id: companyId })
}
