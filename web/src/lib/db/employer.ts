import { q, changed as x } from '../actions'
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
  salary_min?: number | null
  salary_max?: number | null
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
  salary_min?: number | null
  salary_max?: number | null
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
  candidate_name: string | null
  contact_email: string | null
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
  if (!data.name.trim()) throw new Error('Company name is required.')
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
  if (data.name !== undefined && !data.name.trim()) throw new Error('Company name is required.')
  await ensureMigrated()
  await x('update_company', { company_id: companyId, ...updateParams(data) })
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

  validateJob(data)
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
  validateJob(data)
  await x('update_job', { job_id: jobId, ...updateParams(data) })
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
  if (!VALID_STATUSES.has(status)) throw new Error('Invalid application status')
  await ensureMigrated()
  // Ownership guard is in the action SQL (only the job poster can update).
  await x('update_applicant_status', {
    job_id: jobId,
    applicant_user_id: applicantUserId,
    status,
  })
}

function updateParams(data: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined).flatMap(([key, value]) => [[key, value], ['set_' + key, 1]]))
}
function validateJob(data: UpdateJobData) {
  for (const field of ['title', 'description', 'category'] as const) {
    if (data[field] !== undefined && !data[field]?.trim()) throw new Error('Title, description and category are required.')
  }
  for (const value of [data.salary_min, data.salary_max]) {
    if (value != null && (!Number.isInteger(value) || value < 0)) throw new Error('Salary must be a non-negative whole number.')
  }
  if (data.salary_min != null && data.salary_max != null && data.salary_min > data.salary_max) throw new Error('Minimum salary must not exceed maximum salary.')
}
export async function getMyJob(jobId: string) {
  const rows = await q<import('./jobs').JobWithCompany>('get_my_job', { job_id: jobId })
  return rows[0] ?? null
}
