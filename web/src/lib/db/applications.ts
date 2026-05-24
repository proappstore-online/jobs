import { app } from '../app'
import { ensureMigrated, rid } from './core'
import type { JobWithCompany } from './jobs'

export interface ApplicationRow {
  id: string
  user_id: string
  job_id: string
  status: string
  note: string | null
  applied_at: number
}

export interface ApplicationWithJob extends JobWithCompany {
  application_status: string
  applied_at: number
  note: string | null
}

export async function applyToJob(userId: string, jobId: string, note?: string): Promise<boolean> {
  await ensureMigrated()
  const { meta } = await app.db.execute(
    `INSERT OR IGNORE INTO applications (id, user_id, job_id, status, note, applied_at) VALUES (?,?,?,?,?,?)`,
    [rid(), userId, jobId, 'applied', note ?? null, Date.now()],
  )
  return meta.changes > 0
}

export async function withdrawApplication(userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `DELETE FROM applications WHERE user_id = ? AND job_id = ?`,
    [userId, jobId],
  )
}

export async function listApplications(userId: string): Promise<ApplicationWithJob[]> {
  await ensureMigrated()
  const { rows } = await app.db.query<ApplicationWithJob>(
    `SELECT j.*,
            c.name        AS company_name,
            c.slug        AS company_slug,
            c.logo_url    AS company_logo_url,
            c.location    AS company_location,
            a.status      AS application_status,
            a.applied_at,
            a.note
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN companies c ON c.id = j.company_id
      WHERE a.user_id = ?
      ORDER BY a.applied_at DESC`,
    [userId],
  )
  return rows
}

export async function getApplicationStatus(
  userId: string,
  jobId: string,
): Promise<{ status: string; applied_at: number; note: string | null } | null> {
  await ensureMigrated()
  const { rows } = await app.db.query<{ status: string; applied_at: number; note: string | null }>(
    `SELECT status, applied_at, note FROM applications WHERE user_id = ? AND job_id = ?`,
    [userId, jobId],
  )
  return rows[0] ?? null
}

export async function updateApplicationNote(userId: string, jobId: string, note: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `UPDATE applications SET note = ? WHERE user_id = ? AND job_id = ?`,
    [note, userId, jobId],
  )
}
