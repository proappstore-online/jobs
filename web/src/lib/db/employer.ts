import { q, x } from '../actions'
import { ensureMigrated, rid } from './core'
import type { CompanyRow } from './companies'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostJobData {
  title: string
  description: string
  location?: string
  location_type?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  employment_type?: string
  category: string
  experience_level?: string
}

export interface UpdateJobData {
  title?: string
  description?: string
  location?: string
  location_type?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  employment_type?: string
  category?: string
  experience_level?: string
  status?: string
}

interface MyJobRow {
  id: string
  company_id: string
  title: string
  slug: string
  status: string
  posted_at: number
  company_name: string
  applicant_count: number
}

interface ApplicantRow {
  user_id: string
  status: string
  note: string | null
  applied_at: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ---------------------------------------------------------------------------
// Company management
// ---------------------------------------------------------------------------

/**
 * The `userId` argument is kept for call-site compatibility but is NOT sent to
 * the server as an owner id — ownership is stamped from the verified caller via
 * `:__user_id` inside the registered action.
 */
export async function registerCompany(
  _userId: string,
  data: { name: string; description?: string; website?: string; location?: string; industry?: string; size?: string },
): Promise<CompanyRow> {
  await ensureMigrated()
  const id = rid()
  const now = Date.now()
  const slug = `${slugify(data.name)}-${rid().slice(0, 6)}`

  await x('register_company', {
    id,
    name: data.name,
    slug,
    description: data.description ?? null,
    website: data.website ?? null,
    location: data.location ?? null,
    industry: data.industry ?? null,
    size: data.size ?? null,
  })

  return {
    id,
    name: data.name,
    slug,
    logo_url: null,
    description: data.description ?? null,
    website: data.website ?? null,
    location: data.location ?? null,
    industry: data.industry ?? null,
    size: data.size ?? null,
    created_at: now,
  }
}

export async function updateCompany(
  _userId: string,
  companyId: string,
  data: Partial<{ name: string; description: string; website: string; location: string; industry: string; size: string }>,
): Promise<void> {
  await ensureMigrated()
  if (data.name === undefined) return // name is required by the action
  await x('update_company', {
    company_id: companyId,
    name: data.name,
    description: data.description ?? null,
    website: data.website ?? null,
    location: data.location ?? null,
    industry: data.industry ?? null,
    size: data.size ?? null,
  })
}

export async function getMyCompanies(_userId: string): Promise<CompanyRow[]> {
  await ensureMigrated()
  return q<CompanyRow>('get_my_companies')
}

export async function isCompanyOwner(_userId: string, companyId: string): Promise<boolean> {
  await ensureMigrated()
  const rows = await q<{ cnt: number }>('is_company_owner', { company_id: companyId })
  return (rows[0]?.cnt ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Job posting
// ---------------------------------------------------------------------------

export async function postJob(userId: string, companyId: string, data: PostJobData): Promise<string> {
  await ensureMigrated()

  // Friendly early error; the action SQL is the real boundary (it inserts only
  // when the caller owns the target company via a WHERE EXISTS guard).
  if (!(await isCompanyOwner(userId, companyId))) {
    throw new Error('Not the company owner')
  }

  const id = rid()
  const slug = `${slugify(data.title)}-${rid().slice(0, 6)}`

  await x('post_job', {
    id,
    company_id: companyId,
    title: data.title,
    slug,
    description: data.description,
    location: data.location ?? null,
    location_type: data.location_type ?? 'onsite',
    salary_min: data.salary_min ?? null,
    salary_max: data.salary_max ?? null,
    salary_currency: data.salary_currency ?? 'AUD',
    employment_type: data.employment_type ?? 'full-time',
    category: data.category,
    experience_level: data.experience_level ?? 'mid',
  })

  return id
}

export async function updateJob(_userId: string, jobId: string, data: UpdateJobData): Promise<void> {
  await ensureMigrated()
  // Unset fields stay null and are preserved by COALESCE in the action SQL.
  await x('update_job', {
    job_id: jobId,
    title: data.title ?? null,
    description: data.description ?? null,
    location: data.location ?? null,
    location_type: data.location_type ?? null,
    salary_min: data.salary_min ?? null,
    salary_max: data.salary_max ?? null,
    salary_currency: data.salary_currency ?? null,
    employment_type: data.employment_type ?? null,
    category: data.category ?? null,
    experience_level: data.experience_level ?? null,
    status: data.status ?? null,
  })
}

export async function closeJob(_userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await x('close_job', { job_id: jobId })
}

export async function getMyJobs(_userId: string): Promise<MyJobRow[]> {
  await ensureMigrated()
  return q<MyJobRow>('get_my_jobs')
}

export async function getJobApplicants(
  _userId: string,
  jobId: string,
): Promise<ApplicantRow[]> {
  await ensureMigrated()
  // Ownership guard is in the action SQL: rows only return when the caller
  // posted the job.
  return q<ApplicantRow>('get_job_applicants', { job_id: jobId })
}

const VALID_STATUSES = new Set(['applied', 'interview', 'offer', 'rejected'])

export async function updateApplicantStatus(
  _employerUserId: string,
  jobId: string,
  applicantUserId: string,
  status: string,
): Promise<void> {
  if (!VALID_STATUSES.has(status)) return
  await ensureMigrated()
  // Ownership guard is in the action SQL (only the job poster can update).
  await x('update_applicant_status', {
    job_id: jobId,
    applicant_user_id: applicantUserId,
    status,
  })
}
