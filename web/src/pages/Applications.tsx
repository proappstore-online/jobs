import { useEffect, useRef, useState } from 'react'
import { listApplications, withdrawApplication } from '../lib/db'
import type { JobWithCompany } from '../lib/db'
import { JobCard } from '../components/JobCard'
import { Loading } from '../components/Loading'
import { timeAgo } from '../lib/constants'

export interface ApplicationWithJob extends JobWithCompany {
  application_status: string
  applied_at: number
  note: string | null
}

interface ApplicationsProps {
  user: { id: string }
  onOpenJob: (id: string) => void
  onBack: () => void
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  applied: { bg: 'var(--mint-soft)', text: 'var(--mint-deep)' },
  interview: { bg: 'var(--sky-soft)', text: 'var(--sky-deep)' },
  offer: { bg: 'var(--accent-soft)', text: 'var(--accent-deep)' },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: 'var(--line)', text: 'var(--muted)' }
}

export function Applications({ user, onOpenJob, onBack }: ApplicationsProps) {
  const [apps, setApps] = useState<ApplicationWithJob[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmingWithdraw, setConfirmingWithdraw] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await listApplications(user.id)
      if (!cancelled) {
        setApps(rows)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

  // Auto-dismiss confirmation after 3s
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    return () => clearTimeout(confirmTimer.current)
  }, [])

  function handleWithdrawClick(jobId: string) {
    clearTimeout(confirmTimer.current)
    setConfirmingWithdraw(jobId)
    confirmTimer.current = setTimeout(() => setConfirmingWithdraw(null), 3000)
  }

  async function handleWithdrawConfirm(jobId: string) {
    clearTimeout(confirmTimer.current)
    setConfirmingWithdraw(null)
    await withdrawApplication(user.id, jobId)
    setApps((prev) => prev?.filter((a) => a.id !== jobId) ?? null)
  }

  if (loading) return <Loading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; All jobs
      </button>

      {/* Header */}
      <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">
        Applications{apps && apps.length > 0 ? ` (${apps.length})` : ''}
      </h1>

      {apps && apps.length > 0 ? (
        <div className="mt-4 space-y-3">
          {apps.map((application) => {
            const style = statusStyle(application.application_status)
            const isConfirming = confirmingWithdraw === application.id
            return (
              <div key={application.id}>
                {/* Status + applied date bar */}
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold capitalize"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {application.application_status}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    Applied {timeAgo(application.applied_at)}
                  </span>
                </div>

                {/* Job card */}
                <JobCard
                  job={application}
                  saved={false}
                  onOpen={() => onOpenJob(application.id)}
                  onToggleSave={() => {}}
                />

                {/* Note + withdraw row */}
                <div className="mt-1.5 flex items-start justify-between gap-3 px-1">
                  {application.note ? (
                    <p className="text-xs text-[var(--muted)]">{application.note}</p>
                  ) : (
                    <span />
                  )}
                  {isConfirming ? (
                    <button
                      onClick={() => handleWithdrawConfirm(application.id)}
                      className="shrink-0 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Confirm withdraw
                    </button>
                  ) : (
                    <button
                      onClick={() => handleWithdrawClick(application.id)}
                      className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="mt-16 flex flex-col items-center text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-40"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
          <p className="mt-4 text-sm font-medium text-[var(--ink)]">
            No applications yet
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Find a job and click Apply to track it here
          </p>
          <button
            onClick={onBack}
            className="mt-5 rounded-full bg-[var(--accent)] px-5 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            Browse jobs
          </button>
        </div>
      )}
    </div>
  )
}
