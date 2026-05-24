import { useEffect, useState } from 'react'
import { getMyCompanies, getMyJobs } from '../lib/db'
import type { CompanyRow } from '../lib/db'
import { companyColor } from '../components/JobCard'
import { Badge } from '../components/Badge'
import { Loading } from '../components/Loading'

interface MyJob {
  id: string
  company_id: string
  title: string
  slug: string
  status: string
  posted_at: number
  company_name: string
  applicant_count: number
}

interface EmployerDashboardProps {
  user: { id: string }
  onPostJob: (companyId: string) => void
  onEditJob: (jobId: string) => void
  onViewApplicants: (jobId: string) => void
  onRegisterCompany: () => void
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

const statusColor: Record<string, 'mint' | 'muted' | 'accent'> = {
  active: 'mint',
  closed: 'muted',
  expired: 'accent',
}

export function EmployerDashboard({
  user,
  onPostJob,
  onEditJob,
  onViewApplicants,
  onRegisterCompany,
  onBack,
}: EmployerDashboardProps) {
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null)
  const [jobsByCompany, setJobsByCompany] = useState<Record<string, MyJob[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await getMyCompanies(user.id)
      if (cancelled) return
      setCompanies(rows)

      const jobMap: Record<string, MyJob[]> = {}
      for (const c of rows) {
        const jobs = await getMyJobs(user.id)
        if (cancelled) return
        jobMap[c.id] = jobs
      }
      setJobsByCompany(jobMap)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

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

      {/* Title */}
      <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">
        Employer Dashboard
      </h1>

      {/* No companies CTA */}
      {companies && companies.length === 0 && (
        <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 text-center">
          <p className="text-sm text-[var(--muted)]">
            Register your company to start posting jobs
          </p>
          <button
            onClick={onRegisterCompany}
            className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            Register Company
          </button>
        </div>
      )}

      {/* Company sections */}
      {companies &&
        companies.map((company) => {
          const initial = company.name.charAt(0).toUpperCase()
          const avatarColor = companyColor(company.name)
          const jobs = jobsByCompany[company.id] ?? []

          return (
            <div key={company.id} className="mt-8">
              {/* Company header */}
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="display-font text-lg font-bold text-[var(--ink)]">
                    {company.name}
                  </h2>
                  {company.industry && (
                    <p className="text-xs text-[var(--muted)]">{company.industry}</p>
                  )}
                </div>
                <button
                  onClick={() => onPostJob(company.id)}
                  className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Post a Job
                </button>
              </div>

              {/* Jobs list */}
              {jobs.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Title + status */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[0.95rem] font-semibold text-[var(--ink)]">
                              {job.title}
                            </span>
                            <Badge
                              label={job.status}
                              color={statusColor[job.status] ?? 'muted'}
                            />
                          </div>

                          {/* Meta row */}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                            <button
                              onClick={() => onViewApplicants(job.id)}
                              className="font-medium text-[var(--accent)] hover:underline"
                            >
                              {job.applicant_count}{' '}
                              {job.applicant_count === 1 ? 'applicant' : 'applicants'}
                            </button>
                            <span>Posted {timeAgo(job.posted_at)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => onEditJob(job.id)}
                            className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--muted)]">No jobs posted yet</p>
              )}
            </div>
          )
        })}
    </div>
  )
}
