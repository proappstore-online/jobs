import { q, x } from '../actions'
import { ensureMigrated } from './core'

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: number
  created_at: number
}

/**
 * The `userId` argument is kept for call-site compatibility but is NOT sent to
 * the server — the registered action scopes rows to the verified caller via
 * `:__user_id`.
 */
export async function listNotifications(_userId: string): Promise<NotificationRow[]> {
  await ensureMigrated()
  return q<NotificationRow>('list_notifications')
}

export async function markRead(notificationId: string): Promise<void> {
  await ensureMigrated()
  await x('mark_notification_read', { notification_id: notificationId })
}

export async function markAllRead(_userId: string): Promise<void> {
  await ensureMigrated()
  await x('mark_all_notifications_read')
}

export async function countUnread(_userId: string): Promise<number> {
  await ensureMigrated()
  const rows = await q<{ cnt: number }>('count_unread_notifications')
  return rows[0]?.cnt ?? 0
}
