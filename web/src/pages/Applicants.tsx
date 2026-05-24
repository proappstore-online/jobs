import { useEffect, useState } from 'react'
import { getJob, getJobApplicants, updateApplicantStatus } from '../lib/db'
import type { JobWithCompany } from '../lib/db'
import { Badge } from '../components/Badge'
import { Loading } from '../components/Loading'

interface ApplicantRow {
  user_id: string
  status: string
  note: string | null
  applied_at: number
}

interface ApplicantsProps {
  user: { id: string }
  jobId: string
  onBack: () => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

const statusColor: Record<string, 'mint' | 'sky' | 'accent'> = {
  applied: 'mint',
  interview: 'sky',
  offer: 'accent',
}

const STATUS_OPTIONS = ['applied', 'interview', 'offer', 'rejected'] as const

export function Applicants({ user, jobId, onBack }: ApplicantsProps) {
  const [job, setJob] = useState<JobWithCompany | null>(null)
  const [applicants, setApplicants] = useState<ApplicantRow[]>([])
  const [loading, setLoading] = useState(true)

  const handleStatusChange = async (applicantUserId: string, newStatus: string) => {
    await updateApplicantStatus(user.id, jobId, applicantUserId, newStatus)
    setApplicants((prev) =>
      prev.map((a) => (a.user_id === applicantUserId ? { ...a, status: newStatus } : a)),
    )
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [j, rows] = await Promise.all([getJob(jobId), getJobApplicants(user.id, jobId)])
      if (cancelled) return
      setJob(j)
      setApplicants(rows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [jobId])

  if (loading) return <Loading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; Back
      </button>

      {/* Title */}
      <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">
        {job ? job.title : 'Job'} &mdash; Applicants
      </h1>

      {/* Count */}
      <p className="mt-1 text-sm text-[var(--muted)]">
        {applicants.length} {applicants.length === 1 ? 'applicant' : 'applicants'}
      </p>

      {/* Applicant list */}
      {applicants.length > 0 ? (
        <div className="mt-5 space-y-3">
          {applicants.map((a) => (
            <div
              key={a.user_id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-[var(--ink)]">
                    {a.user_id.slice(0, 12)}...
                  </span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge
                      label={a.status}
                      color={statusColor[a.status] ?? 'muted'}
                    />
                    <span className="text-xs text-[var(--muted)]">
                      Applied {timeAgo(a.applied_at)}
                    </span>
                  </div>
                </div>
                <select
                  value={a.status}
                  onChange={(e) => handleStatusChange(a.user_id, e.target.value)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-xs text-[var(--ink)] outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {a.note && (
                <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                  {a.note}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="text-sm font-medium text-[var(--ink)]">No applicants yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Applicants will appear here when candidates apply
          </p>
        </div>
      )}
    </div>
  )
}
