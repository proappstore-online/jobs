import { Badge } from './Badge'

export interface JobCardData {
  id: string
  title: string
  company_name: string
  company_slug: string
  location: string | null
  location_type: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  employment_type: string
  posted_at: number
}

interface JobCardProps {
  job: JobCardData
  saved: boolean
  onOpen: () => void
  onToggleSave: () => void
  onOpenCompany?: () => void
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

export function JobCard({ job, saved, onOpen, onToggleSave, onOpenCompany }: JobCardProps) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const initial = job.company_name.charAt(0).toUpperCase()

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-all hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-start gap-3">
        {/* Company logo placeholder */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-deep)]">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          {/* Company name */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenCompany?.()
            }}
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            {job.company_name}
          </button>

          {/* Job title */}
          <button
            onClick={onOpen}
            className="mt-0.5 block text-left text-[0.95rem] font-semibold leading-snug text-[var(--ink)] hover:text-[var(--accent)]"
          >
            {job.title}
          </button>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {job.location && (
              <span className="text-xs text-[var(--muted)]">{job.location}</span>
            )}
            <Badge label={job.location_type} color={locationTypeColor[job.location_type]} />
            <Badge label={job.employment_type} color={typeColor[job.employment_type]} />
          </div>

          {/* Salary + time row */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {salary && (
              <span className="text-xs font-medium text-[var(--ink)]">{salary}</span>
            )}
            <span className="text-xs text-[var(--muted)]">{timeAgo(job.posted_at)}</span>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave()
          }}
          className="mt-1 shrink-0 p-1 text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          title={saved ? 'Unsave job' : 'Save job'}
        >
          {saved ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
