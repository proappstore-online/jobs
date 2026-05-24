import { app } from '../app'
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

export async function registerCompany(
  userId: string,
  data: { name: string; description?: string; website?: string; location?: string; industry?: string; size?: string },
): Promise<CompanyRow> {
  await ensureMigrated()
  const id = rid()
  const now = Date.now()
  const slug = `${slugify(data.name)}-${rid().slice(0, 6)}`

  await app.db.execute(
    `INSERT INTO companies (id, name, slug, logo_url, description, website, location, industry, size, owner_user_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.name, slug, null, data.description ?? null, data.website ?? null, data.location ?? null, data.industry ?? null, data.size ?? null, userId, now],
  )

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

const COMPANY_COLUMNS = new Set(['name', 'description', 'website', 'location', 'industry', 'size'])

export async function updateCompany(
  userId: string,
  companyId: string,
  data: Partial<{ name: string; description: string; website: string; location: string; industry: string; size: string }>,
): Promise<void> {
  await ensureMigrated()

  const sets: string[] = []
  const params: unknown[] = []

  for (const [key, value] of Object.entries(data)) {
    if (!COMPANY_COLUMNS.has(key)) continue
    sets.push(`${key} = ?`)
    params.push(value)
  }

  if (sets.length === 0) return

  params.push(companyId, userId)
  await app.db.execute(
    `UPDATE companies SET ${sets.join(', ')} WHERE id = ? AND owner_user_id = ?`,
    params,
  )
}

export async function getMyCompanies(userId: string): Promise<CompanyRow[]> {
  await ensureMigrated()
  const { rows } = await app.db.query<CompanyRow>(
    `SELECT * FROM companies WHERE owner_user_id = ? ORDER BY created_at DESC`,
    [userId],
  )
  return rows
}

export async function isCompanyOwner(userId: string, companyId: string): Promise<boolean> {
  await ensureMigrated()
  const { rows } = await app.db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM companies WHERE id = ? AND owner_user_id = ?`,
    [companyId, userId],
  )
  return (rows[0]?.cnt ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Job posting
// ---------------------------------------------------------------------------

export async function postJob(userId: string, companyId: string, data: PostJobData): Promise<string> {
  await ensureMigrated()

  if (!(await isCompanyOwner(userId, companyId))) {
    throw new Error('Not the company owner')
  }

  const id = rid()
  const now = Date.now()
  const slug = `${slugify(data.title)}-${rid().slice(0, 6)}`

  await app.db.execute(
    `INSERT INTO jobs (id, company_id, title, slug, description, location, location_type, salary_min, salary_max, salary_currency, employment_type, category, experience_level, posted_at, source, status, posted_by, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      companyId,
      data.title,
      slug,
      data.description,
      data.location ?? null,
      data.location_type ?? 'onsite',
      data.salary_min ?? null,
      data.salary_max ?? null,
      data.salary_currency ?? 'AUD',
      data.employment_type ?? 'full-time',
      data.category,
      data.experience_level ?? 'mid',
      now,
      'employer',
      'active',
      userId,
      now,
    ],
  )

  return id
}

const JOB_COLUMNS = new Set([
  'title', 'description', 'location', 'location_type', 'salary_min', 'salary_max',
  'salary_currency', 'employment_type', 'category', 'experience_level', 'status',
])

export async function updateJob(userId: string, jobId: string, data: UpdateJobData): Promise<void> {
  await ensureMigrated()

  const sets: string[] = []
  const params: unknown[] = []

  for (const [key, value] of Object.entries(data)) {
    if (!JOB_COLUMNS.has(key)) continue
    sets.push(`${key} = ?`)
    params.push(value)
  }

  if (sets.length === 0) return

  params.push(jobId, userId)
  await app.db.execute(
    `UPDATE jobs SET ${sets.join(', ')} WHERE id = ? AND posted_by = ?`,
    params,
  )
}

export async function closeJob(userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `UPDATE jobs SET status = 'closed' WHERE id = ? AND posted_by = ?`,
    [jobId, userId],
  )
}

export async function getMyJobs(userId: string): Promise<MyJobRow[]> {
  await ensureMigrated()
  const { rows } = await app.db.query<MyJobRow>(
    `SELECT j.id, j.company_id, j.title, j.slug, j.status, j.posted_at,
            c.name AS company_name,
            COUNT(a.id) AS applicant_count
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       LEFT JOIN applications a ON a.job_id = j.id
      WHERE j.posted_by = ?
      GROUP BY j.id
      ORDER BY j.posted_at DESC`,
    [userId],
  )
  return rows
}

export async function getJobApplicants(
  userId: string,
  jobId: string,
): Promise<ApplicantRow[]> {
  await ensureMigrated()

  // Verify the caller owns this job
  const { rows: check } = await app.db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM jobs WHERE id = ? AND posted_by = ?`,
    [jobId, userId],
  )
  if ((check[0]?.cnt ?? 0) === 0) return []

  const { rows } = await app.db.query<ApplicantRow>(
    `SELECT user_id, status, note, applied_at
       FROM applications
      WHERE job_id = ?
      ORDER BY applied_at DESC`,
    [jobId],
  )
  return rows
}

export async function updateApplicantStatus(
  employerUserId: string,
  jobId: string,
  applicantUserId: string,
  status: string,
): Promise<void> {
  await ensureMigrated()
  // Verify the employer owns this job
  const { rows: check } = await app.db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM jobs WHERE id = ? AND posted_by = ?`,
    [jobId, employerUserId],
  )
  if ((check[0]?.cnt ?? 0) === 0) return
  await app.db.execute(
    `UPDATE applications SET status = ? WHERE job_id = ? AND user_id = ?`,
    [status, jobId, applicantUserId],
  )
}
