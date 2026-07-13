import { q } from '../actions'
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

function filterParams(opts: ListJobsOpts): Record<string, unknown> {
  return {
    search: opts.search ?? null,
    search_like: opts.search ? `%${opts.search}%` : null,
    location: opts.location ?? null,
    location_like: opts.location ? `%${opts.location}%` : null,
    category: opts.category ?? null,
    employment_type: opts.type ?? null,
    location_type: opts.locationType ?? null,
  }
}

export async function listJobs(opts: ListJobsOpts = {}): Promise<JobWithCompany[]> {
  await ensureMigrated()
  return q<JobWithCompany>('list_jobs', {
    ...filterParams(opts),
    limit: opts.limit ?? 20,
    offset: opts.offset ?? 0,
  })
}

export async function countJobs(opts: ListJobsOpts = {}): Promise<number> {
  await ensureMigrated()
  const rows = await q<{ cnt: number }>('count_jobs', filterParams(opts))
  return rows[0]?.cnt ?? 0
}

export async function getJob(id: string): Promise<JobWithCompany | null> {
  await ensureMigrated()
  const rows = await q<JobWithCompany>('get_job', { job_id: id })
  return rows[0] ?? null
}

export async function getJobBySlug(slug: string): Promise<JobWithCompany | null> {
  await ensureMigrated()
  const rows = await q<JobWithCompany>('get_job_by_slug', { slug })
  return rows[0] ?? null
}

export async function searchJobs(query: string): Promise<JobWithCompany[]> {
  await ensureMigrated()
  return q<JobWithCompany>('search_jobs', { term: `%${query}%` })
}
