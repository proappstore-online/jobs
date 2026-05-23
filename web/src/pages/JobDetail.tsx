import { useEffect, useState } from 'react'
import { getJob, isJobSaved, saveJob, unsaveJob, getCompanyJobs } from '../lib/db'
import type { JobWithCompany } from '../lib/db'
import { Badge } from '../components/Badge'
import { JobCard } from '../components/JobCard'
import { Loading } from '../components/Loading'

interface JobDetailProps {
  jobId: string
  user: { id: string }
  onBack: () => void
  onOpenCompany: (slug: string) => void
}

function formatSalary(min: number | null, max: number | null, currency: string): string | null {
  if (min == null && max == null) return null
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`
    return `$${n}`
  }
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)} ${currency}`
  if (min != null) return `From ${fmt(min)} ${currency}`
  return `Up to ${fmt(max!)} ${currency}`
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

const typeColor: Record<string, 'accent' | 'sky' | 'mint' | 'muted'> = {
  'full-time': 'sky',
  'part-time': 'mint',
  contract: 'accent',
  casual: 'muted',
}

const locationTypeColor: Record<string, 'accent' | 'sky' | 'mint' | 'muted'> = {
  remote: 'mint',
  hybrid: 'sky',
  onsite: 'muted',
}

export function JobDetail({ jobId, user, onBack, onOpenCompany }: JobDetailProps) {
  const [job, setJob] = useState<JobWithCompany | null>(null)
  const [saved, setSaved] = useState(false)
  const [relatedJobs, setRelatedJobs] = useState<JobWithCompany[]>([])
  const [savedRelated, setSavedRelated] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [applyMsg, setApplyMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const [j, isSaved] = await Promise.all([getJob(jobId), isJobSaved(user.id, jobId)])
      if (cancelled) return
      setJob(j)
      setSaved(isSaved)
      if (j) {
        const related = await getCompanyJobs(j.company_id)
        if (cancelled) return
        const others = related.filter((r) => r.id !== jobId).slice(0, 4)
        setRelatedJobs(others)
        const checks = await Promise.all(others.map((r) => isJobSaved(user.id, r.id)))
        const s = new Set<string>()
        others.forEach((r, i) => {
          if (checks[i]) s.add(r.id)
        })
        setSavedRelated(s)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [jobId, user.id])

  async function handleToggleSave() {
    if (saved) {
      setSaved(false)
      await unsaveJob(user.id, jobId)
    } else {
      setSaved(true)
      await saveJob(user.id, jobId)
    }
  }

  async function handleToggleRelatedSave(id: string) {
    const isSaved = savedRelated.has(id)
    const newSet = new Set(savedRelated)
    if (isSaved) {
      newSet.delete(id)
      setSavedRelated(newSet)
      await unsaveJob(user.id, id)
    } else {
      newSet.add(id)
      setSavedRelated(newSet)
      await saveJob(user.id, id)
    }
  }

  function handleApply() {
    if (job?.source_url) {
      window.open(job.source_url, '_blank', 'noopener,noreferrer')
    } else {
      setApplyMsg('Applications coming soon')
      setTimeout(() => setApplyMsg(null), 3000)
    }
  }

  if (loading) return <Loading />
  if (!job) {
    return (
      <div className="mx-auto min-h-[100dvh] max-w-2xl px-4 py-6 sm:px-6">
        <button
          onClick={onBack}
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          &larr; All jobs
        </button>
        <p className="mt-8 text-center text-sm text-[var(--muted)]">Job not found</p>
      </div>
    )
  }

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const initial = job.company_name.charAt(0).toUpperCase()

  return (
    <div className="mx-auto min-h-[100dvh] max-w-2xl px-4 py-6 sm:px-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; All jobs
      </button>

      {/* Company info bar */}
      <button
        onClick={() => onOpenCompany(job.company_slug)}
        className="mt-5 flex items-center gap-3 text-left hover:opacity-80"
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent-deep)]">
          {initial}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">{job.company_name}</p>
          {job.company_location && (
            <p className="text-xs text-[var(--muted)]">{job.company_location}</p>
          )}
        </div>
      </button>

      {/* Job title */}
      <h1 className="display-font mt-5 text-2xl font-bold text-[var(--ink)] sm:text-3xl">
        {job.title}
      </h1>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge label={job.employment_type} color={typeColor[job.employment_type]} />
        <Badge label={job.location_type} color={locationTypeColor[job.location_type]} />
        {job.location && (
          <span className="text-xs text-[var(--muted)]">{job.location}</span>
        )}
        {salary && (
          <span className="text-xs font-medium text-[var(--ink)]">{salary}</span>
        )}
        <span className="text-xs text-[var(--muted)]">Posted {timeAgo(job.posted_at)}</span>
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleApply}
          className="rounded-2xl bg-[var(--ink)] px-6 py-2.5 text-sm font-semibold text-[var(--paper)] hover:opacity-90"
        >
          Apply
        </button>
        <button
          onClick={handleToggleSave}
          className="rounded-2xl border border-[var(--line-strong)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Toast */}
      {applyMsg && (
        <p className="mt-3 text-xs font-medium text-[var(--accent)]">{applyMsg}</p>
      )}

      {/* Description */}
      <div
        className="job-description mt-8 text-sm leading-relaxed text-[var(--ink)]"
        dangerouslySetInnerHTML={{ __html: job.description }}
      />

      {/* More jobs at company */}
      {relatedJobs.length > 0 && (
        <div className="mt-10 border-t border-[var(--line)] pt-6">
          <h2 className="display-font text-lg font-bold text-[var(--ink)]">
            More jobs at {job.company_name}
          </h2>
          <div className="mt-4 space-y-3">
            {relatedJobs.map((rj) => (
              <JobCard
                key={rj.id}
                job={rj}
                saved={savedRelated.has(rj.id)}
                onOpen={() => {
                  location.hash = `#/job/${rj.id}`
                }}
                onToggleSave={() => handleToggleRelatedSave(rj.id)}
                onOpenCompany={() => onOpenCompany(rj.company_slug)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
