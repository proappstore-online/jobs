import { q, x } from '../actions'
import { ensureMigrated } from './core'
import type { JobWithCompany } from './jobs'

/**
 * The `userId` argument is kept for call-site compatibility but is NOT sent to
 * the server — the registered action scopes every row to the verified caller
 * via `:__user_id`. Passing a client-controlled user id would be a trust hole.
 */
export async function saveJob(_userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await x('save_job', { job_id: jobId })
}

export async function unsaveJob(_userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await x('unsave_job', { job_id: jobId })
}

export async function listSavedJobs(_userId: string): Promise<JobWithCompany[]> {
  await ensureMigrated()
  return q<JobWithCompany>('list_saved_jobs')
}

export async function isJobSaved(_userId: string, jobId: string): Promise<boolean> {
  await ensureMigrated()
  const rows = await q<{ cnt: number }>('is_job_saved', { job_id: jobId })
  return (rows[0]?.cnt ?? 0) > 0
}
