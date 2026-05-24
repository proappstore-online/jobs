import { app } from '../app'
import { ensureMigrated, rid } from './core'
import type { JobWithCompany } from './jobs'

export async function recordView(userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `INSERT OR REPLACE INTO recent_views (id, user_id, job_id, viewed_at) VALUES (?,?,?,?)`,
    [rid(), userId, jobId, Date.now()],
  )
}

export async function listRecentViews(userId: string, limit = 10): Promise<JobWithCompany[]> {
  await ensureMigrated()
  const { rows } = await app.db.query<JobWithCompany>(
    `SELECT j.*,
            c.name        AS company_name,
            c.slug        AS company_slug,
            c.logo_url    AS company_logo_url,
            c.location    AS company_location
       FROM recent_views v
       JOIN jobs j ON j.id = v.job_id
       JOIN companies c ON c.id = j.company_id
      WHERE v.user_id = ?
      ORDER BY v.viewed_at DESC
      LIMIT ?`,
    [userId, limit],
  )
  return rows
}

export async function clearRecentViews(userId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `DELETE FROM recent_views WHERE user_id = ?`,
    [userId],
  )
}
