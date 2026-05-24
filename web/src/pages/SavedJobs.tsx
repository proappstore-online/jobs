import { useCallback, useEffect, useRef, useState } from 'react'
import { listSavedJobs, unsaveJob } from '../lib/db'
import type { JobWithCompany } from '../lib/db'
import { JobCard } from '../components/JobCard'
import { Loading } from '../components/Loading'

interface SavedJobsProps {
  user: { id: string }
  onOpenJob: (id: string) => void
  onBack: () => void
}

type SortMode = 'saved' | 'posted'

export function SavedJobs({ user, onOpenJob, onBack }: SavedJobsProps) {
  const [jobs, setJobs] = useState<JobWithCompany[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortMode>('saved')

  // Track jobs pending removal (unsaved with undo window)
  const [pendingRemoval, setPendingRemoval] = useState<Set<string>>(new Set())
  const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await listSavedJobs(user.id)
      if (!cancelled) {
        setJobs(rows)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = undoTimers.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
    }
  }, [])

  const commitRemoval = useCallback(
    async (jobId: string) => {
      undoTimers.current.delete(jobId)
      await unsaveJob(user.id, jobId)
      setJobs((prev) => prev?.filter((j) => j.id !== jobId) ?? null)
      setPendingRemoval((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    },
    [user.id],
  )

  function handleUnsave(jobId: string) {
    // Mark as pending removal
    setPendingRemoval((prev) => new Set(prev).add(jobId))
    // Schedule actual removal after 3 seconds
    const timer = setTimeout(() => commitRemoval(jobId), 3000)
    undoTimers.current.set(jobId, timer)
  }

  function handleUndo(jobId: string) {
    const timer = undoTimers.current.get(jobId)
    if (timer) clearTimeout(timer)
    undoTimers.current.delete(jobId)
    setPendingRemoval((prev) => {
      const next = new Set(prev)
      next.delete(jobId)
      return next
    })
  }

  async function handleShare(job: JobWithCompany) {
    const url = `${window.location.origin}${window.location.pathname}#/job/${job.id}`
    const shareData = { title: `${job.title} at ${job.company_name}`, url }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // user cancelled — ignore
      }
    } else {
      await navigator.clipboard.writeText(url)
      // Brief visual feedback handled by the share button itself
    }
  }

  // Sort jobs client-side
  const sortedJobs =
    jobs && sort === 'posted'
      ? [...jobs].sort((a, b) => b.posted_at - a.posted_at)
      : jobs

  // Count only non-pending jobs for the header
  const visibleCount = sortedJobs
    ? sortedJobs.filter((j) => !pendingRemoval.has(j.id)).length
    : 0

  if (loading) return <Loading />

  return (
    <div className="mx-auto min-h-[100dvh] max-w-2xl px-4 py-6 sm:px-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; All jobs
      </button>

      {/* Header + sort */}
      <div className="mt-5 flex items-baseline justify-between">
        <h1 className="display-font text-2xl font-bold text-[var(--ink)]">
          Saved Jobs{sortedJobs && sortedJobs.length > 0 ? ` (${visibleCount})` : ''}
        </h1>

        {sortedJobs && sortedJobs.length > 0 && (
          <div className="flex gap-1 rounded-lg bg-[var(--line)] p-0.5 text-[0.7rem] font-medium">
            <button
              onClick={() => setSort('saved')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                sort === 'saved'
                  ? 'bg-[var(--panel)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Recently saved
            </button>
            <button
              onClick={() => setSort('posted')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                sort === 'posted'
                  ? 'bg-[var(--panel)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Recently posted
            </button>
          </div>
        )}
      </div>

      {sortedJobs && sortedJobs.length > 0 ? (
        <div className="mt-4 space-y-3">
          {sortedJobs.map((job) => {
            const isPending = pendingRemoval.has(job.id)
            return (
              <div key={job.id} className="relative">
                {isPending ? (
                  /* Removed state with undo */
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
                    <span className="text-sm text-[var(--muted)]">Removed</span>
                    <button
                      onClick={() => handleUndo(job.id)}
                      className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <JobCard
                        job={job}
                        saved={true}
                        onOpen={() => onOpenJob(job.id)}
                        onToggleSave={() => handleUnsave(job.id)}
                        onOpenCompany={() => {
                          location.hash = `#/company/${job.company_slug}`
                        }}
                      />
                    </div>
                    {/* Share button */}
                    <ShareButton onClick={() => handleShare(job)} />
                  </div>
                )}
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
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          <p className="mt-4 text-sm font-medium text-[var(--ink)]">No saved jobs yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Browse jobs and tap the bookmark icon to save them here
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

/** Small share icon button shown beside each saved job card. */
function ShareButton({ onClick }: { onClick: () => void }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    onClick()
    // Show "Copied" feedback if no native share
    if (!navigator.share) {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="mt-4 shrink-0 rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--line)] hover:text-[var(--ink)]"
      title={copied ? 'Copied!' : 'Share job'}
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
    </button>
  )
}
