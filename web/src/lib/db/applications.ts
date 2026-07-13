import { b, q, x } from '../actions'
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

/**
 * The `userId` argument is kept for call-site compatibility but is NOT sent to
 * the server — the registered action scopes rows to the verified caller via
 * `:__user_id`. `apply_to_job` inserts the application and, atomically, a
 * notification for the job poster (only when the application is genuinely new).
 */
export async function applyToJob(_userId: string, jobId: string, note?: string): Promise<boolean> {
  await ensureMigrated()
  const results = await b('apply_to_job', {
    job_id: jobId,
    note: note ?? null,
    notification_id: rid(),
  })
  // results[0] is the application INSERT OR IGNORE; changes > 0 means a new
  // application (a duplicate is a no-op). results[1] is the poster notification.
  return (results[0]?.meta.changes ?? 0) > 0
}

export async function withdrawApplication(_userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await x('withdraw_application', { job_id: jobId })
}

export async function listApplications(_userId: string): Promise<ApplicationWithJob[]> {
  await ensureMigrated()
  return q<ApplicationWithJob>('list_applications')
}

export async function getApplicationStatus(
  _userId: string,
  jobId: string,
): Promise<{ status: string; applied_at: number; note: string | null } | null> {
  await ensureMigrated()
  const rows = await q<{ status: string; applied_at: number; note: string | null }>(
    'get_application_status',
    { job_id: jobId },
  )
  return rows[0] ?? null
}

export async function updateApplicationNote(_userId: string, jobId: string, note: string): Promise<void> {
  await ensureMigrated()
  await x('update_application_note', { job_id: jobId, note })
}
