import { useEffect, useState } from 'react'
import { listSavedJobs, unsaveJob } from '../lib/db'
import type { JobWithCompany } from '../lib/db'
import { JobCard } from '../components/JobCard'
import { Loading } from '../components/Loading'

interface SavedJobsProps {
  user: { id: string }
  onOpenJob: (id: string) => void
  onBack: () => void
}

export function SavedJobs({ user, onOpenJob, onBack }: SavedJobsProps) {
  const [jobs, setJobs] = useState<JobWithCompany[] | null>(null)
  const [loading, setLoading] = useState(true)

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

  async function handleUnsave(jobId: string) {
    await unsaveJob(user.id, jobId)
    setJobs((prev) => prev?.filter((j) => j.id !== jobId) ?? null)
  }

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

      <h1 className="display-font mt-5 text-2xl font-bold text-[var(--ink)]">Saved Jobs</h1>

      {jobs && jobs.length > 0 ? (
        <div className="mt-4 space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={true}
              onOpen={() => onOpenJob(job.id)}
              onToggleSave={() => handleUnsave(job.id)}
              onOpenCompany={() => {
                location.hash = `#/company/${job.company_slug}`
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--muted)]">You haven't saved any jobs yet</p>
          <button
            onClick={onBack}
            className="mt-4 rounded-full border border-[var(--line-strong)] px-4 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Browse jobs
          </button>
        </div>
      )}
    </div>
  )
}
