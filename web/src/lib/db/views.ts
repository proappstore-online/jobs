import { q, x } from '../actions'
import { ensureMigrated } from './core'
import type { JobWithCompany } from './jobs'

/**
 * The `userId` argument is kept for call-site compatibility but is NOT sent to
 * the server — the registered action scopes rows to the verified caller via
 * `:__user_id`.
 */
export async function recordView(_userId: string, jobId: string): Promise<void> {
  await ensureMigrated()
  await x('record_view', { job_id: jobId })
}

export async function listRecentViews(_userId: string, limit = 10): Promise<JobWithCompany[]> {
  await ensureMigrated()
  return q<JobWithCompany>('list_recent_views', { limit })
}

export async function clearRecentViews(_userId: string): Promise<void> {
  await ensureMigrated()
  await x('clear_recent_views')
}
