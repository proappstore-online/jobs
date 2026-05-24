import { app } from '../app'
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

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  await ensureMigrated()
  const { rows } = await app.db.query<NotificationRow>(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId],
  )
  return rows
}

export async function markRead(notificationId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `UPDATE notifications SET read = 1 WHERE id = ?`,
    [notificationId],
  )
}

export async function markAllRead(userId: string): Promise<void> {
  await ensureMigrated()
  await app.db.execute(
    `UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`,
    [userId],
  )
}

export async function countUnread(userId: string): Promise<number> {
  await ensureMigrated()
  const { rows } = await app.db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND read = 0`,
    [userId],
  )
  return rows[0]?.cnt ?? 0
}
