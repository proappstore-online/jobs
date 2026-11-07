import { q } from '../actions'
import { ensureMigrated } from './core'

/** Signed-in market research over the leads ledger (#15). Aggregates only. */
export interface ResearchFilter {
  country: string
  since?: number
  companySlug?: string
}

export interface ResearchSummary {
  postings: number
  employers: number
  listed: number
  unvalidated: number
  unavailable: number
  first_seen: number | null
  last_seen: number | null
}
export interface WeekRow { week: number; postings: number; employers: number }
export interface FacetRow {
  category: string | null
  work_mode: string | null
  contract_type: string | null
  seniority: string | null
  postings: number
  salary_floor: number | null
  salary_ceiling: number | null
  with_salary: number
}
export interface TagRow { tag: string; postings: number }
export interface EmployerRow { company_slug: string; company_name: string; postings: number; listed: number; last_seen: number; top_category: string | null }
export interface RoleRow { company_name: string; title: string; category: string | null; seniority: string | null; status: string; seen_at: number; job_id: string | null }

const params = (f: ResearchFilter) => ({ country: f.country, since: f.since ?? 0, company_slug: f.companySlug ?? null })

export async function researchCountries(): Promise<{ country: string; postings: number }[]> {
  await ensureMigrated()
  return q('research_countries')
}

/** Everything one research view needs, fetched together. */
export async function researchOverview(f: ResearchFilter) {
  await ensureMigrated()
  const p = params(f)
  const [summary, weekly, facets, tags] = await Promise.all([
    q<ResearchSummary>('research_summary', p),
    q<WeekRow>('research_weekly', p),
    q<FacetRow>('research_facets', p),
    q<TagRow>('research_tags', p),
  ])
  return { summary: summary[0], weekly, facets, tags }
}

export async function researchEmployers(opts: { country: string; since?: number; q?: string; category?: string; limit?: number; offset?: number }): Promise<EmployerRow[]> {
  await ensureMigrated()
  return q<EmployerRow>('research_employers', { country: opts.country, since: opts.since ?? 0, q: opts.q || null, category: opts.category || null, limit: opts.limit ?? 50, offset: opts.offset ?? 0 })
}

export async function researchEmployerRoles(companySlug: string, country: string): Promise<RoleRow[]> {
  await ensureMigrated()
  return q<RoleRow>('research_employer_roles', { company_slug: companySlug, country })
}
