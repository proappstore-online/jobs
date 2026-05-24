import { useEffect, useState } from 'react'
import { listNotifications, markRead, markAllRead } from '../lib/db'
import type { NotificationRow } from '../lib/db'
import { Loading } from '../components/Loading'

interface NotificationsProps {
  user: { id: string }
  onBack: () => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function Notifications({ user, onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listNotifications(user.id).then((rows) => {
      if (!cancelled) {
        setNotifications(rows)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [user.id])

  async function handleMarkAllRead() {
    await markAllRead(user.id)
    setNotifications((prev) => prev?.map((n) => ({ ...n, read: 1 })) ?? null)
  }

  async function handleClick(n: NotificationRow) {
    if (!n.read) {
      await markRead(n.id)
      setNotifications((prev) =>
        prev?.map((x) => (x.id === n.id ? { ...x, read: 1 } : x)) ?? null,
      )
    }
    if (n.link) {
      location.hash = n.link
    }
  }

  if (loading) return <Loading />

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; Back
      </button>

      <div className="mt-5 flex items-baseline justify-between">
        <h1 className="display-font text-2xl font-bold text-[var(--ink)]">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--muted)]">
              ({unreadCount} unread)
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="mt-4 space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full rounded-2xl border p-4 text-left transition-all hover:border-[var(--line-strong)] ${
                n.read
                  ? 'border-[var(--line)] bg-transparent'
                  : 'border-[var(--accent-soft)] bg-[var(--accent-soft)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${n.read ? 'text-[var(--muted)]' : 'text-[var(--ink)]'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{n.body}</p>
                  )}
                </div>
                <span className="shrink-0 text-[0.65rem] text-[var(--muted)]">
                  {timeAgo(n.created_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <p className="mt-4 text-sm font-medium text-[var(--ink)]">No notifications</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            You'll be notified when someone applies to your jobs
          </p>
        </div>
      )}
    </div>
  )
}
