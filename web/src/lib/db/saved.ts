import { app } from '../app'
import { ensureMigrated, rid } from './core'
import type { JobWithCompany } from './jobs'

export async function saveJob(userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `INSERT OR IGNORE INTO saved_jobs (id, user_id, job_id, saved_at) VALUES (?,?,?,?)`,
    [rid(), userId, jobId, Date.now()],
  )
}

export async function unsaveJob(userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?`,
    [userId, jobId],
  )
}

export async function listSavedJobs(userId: string): Promise<JobWithCompany[]> {
  await ensureMigrated()
  const { rows } = await app.db.query<JobWithCompany>(
    `SELECT j.*,
            c.name        AS company_name,
            c.slug        AS company_slug,
            c.logo_url    AS company_logo_url,
            c.location    AS company_location
       FROM saved_jobs s
       JOIN jobs j ON j.id = s.job_id
       JOIN companies c ON c.id = j.company_id
      WHERE s.user_id = ?
      ORDER BY s.saved_at DESC`,
    [userId],
  )
  return rows
}

export async function isJobSaved(userId: string, jobId: string): Promise<boolean> {
  await ensureMigrated()
  const { rows } = await app.db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM saved_jobs WHERE user_id = ? AND job_id = ?`,
    [userId, jobId],
  )
  return (rows[0]?.cnt ?? 0) > 0
}
