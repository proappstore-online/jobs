import { useEffect, useState } from 'react'
import { getCompanyBySlug, getCompanyJobs, isJobSaved, saveJob, unsaveJob } from '../lib/db'
import type { CompanyRow, JobWithCompany } from '../lib/db'
import { JobCard, companyColor } from '../components/JobCard'
import { Loading } from '../components/Loading'

interface CompanyDetailProps {
  companySlug: string
  user: { id: string }
  onBack: () => void
  onOpenJob: (id: string) => void
}

export function CompanyDetail({ companySlug, user, onBack, onOpenJob }: CompanyDetailProps) {
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [jobs, setJobs] = useState<JobWithCompany[]>([])
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const c = await getCompanyBySlug(companySlug)
      if (cancelled) return
      setCompany(c)
      if (c) {
        const companyJobs = await getCompanyJobs(c.id)
        if (cancelled) return
        setJobs(companyJobs)
        const checks = await Promise.all(companyJobs.map((j) => isJobSaved(user.id, j.id)))
        const s = new Set<string>()
        companyJobs.forEach((j, i) => {
          if (checks[i]) s.add(j.id)
        })
        setSavedSet(s)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [companySlug, user.id])

  async function handleToggleSave(jobId: string) {
    const isSaved = savedSet.has(jobId)
    const newSet = new Set(savedSet)
    if (isSaved) {
      newSet.delete(jobId)
      setSavedSet(newSet)
      await unsaveJob(user.id, jobId)
    } else {
      newSet.add(jobId)
      setSavedSet(newSet)
      await saveJob(user.id, jobId)
    }
  }

  if (loading) return <Loading />

  if (!company) {
    return (
      <div className="mx-auto min-h-[100dvh] max-w-2xl px-4 py-6 sm:px-6">
        <button
          onClick={onBack}
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          &larr; All jobs
        </button>
        <p className="mt-8 text-center text-sm text-[var(--muted)]">Company not found</p>
      </div>
    )
  }

  const initial = company.name.charAt(0).toUpperCase()
  const avatarColor = companyColor(company.name)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; All jobs
      </button>

      {/* Company header */}
      <div className="mt-6 flex items-start gap-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
          style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
        >
          {initial}
        </div>
        <div>
          <h1 className="display-font text-2xl font-bold text-[var(--ink)]">{company.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            {company.industry && <span>{company.industry}</span>}
            {company.industry && company.size && <span>·</span>}
            {company.size && <span>{company.size} employees</span>}
          </div>
          {company.location && (
            <p className="mt-1 text-xs text-[var(--muted)]">{company.location}</p>
          )}
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline"
            >
              {company.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      {/* Description */}
      {company.description && (
        <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">{company.description}</p>
      )}

      {/* Open positions */}
      <div className="mt-8 border-t border-[var(--line)] pt-6">
        <h2 className="display-font text-lg font-bold text-[var(--ink)]">
          Open positions at {company.name}
          {jobs.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--muted)]">
              ({jobs.length})
            </span>
          )}
        </h2>

        {jobs.length > 0 ? (
          <div className="mt-4 space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                saved={savedSet.has(job.id)}
                onOpen={() => onOpenJob(job.id)}
                onToggleSave={() => handleToggleSave(job.id)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">No open positions right now</p>
        )}
      </div>
    </div>
  )
}
