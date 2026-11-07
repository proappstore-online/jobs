import { useEffect, useState } from 'react'
import { researchOverview, researchEmployerRoles } from '../lib/db'
import type { RoleRow } from '../lib/db'
import { timeAgo } from '../lib/constants'
import { readResearchPrefs } from '../lib/research-prefs'
import { BarList, ChartCard, StatTile, TagChips, WeeklyColumns } from '../components/Charts'
import { Badge } from '../components/Badge'
import { Loading } from '../components/Loading'
import { tally } from './Research'

type Overview = Awaited<ReturnType<typeof researchOverview>>
const STATUS: Record<string, { label: string; color: 'mint' | 'muted' | 'accent' }> = { published: { label: 'Listed', color: 'mint' }, new: { label: 'Seen', color: 'accent' }, unavailable: { label: 'Closed', color: 'muted' } }

/** What one employer usually hires for, from every posting seen (#15). */
export function EmployerProfile({ companySlug, onOpenJob, onBack }: { companySlug: string; onOpenJob: (id: string) => void; onBack: () => void }) {
  const country = readResearchPrefs().country ?? 'AU'
  const [data, setData] = useState<Overview | null>(null)
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [error, setError] = useState(false)
  useEffect(() => {
    let live = true
    Promise.all([researchOverview({ country, companySlug }), researchEmployerRoles(companySlug, country)])
      .then(([o, r]) => { if (live) { setData(o); setRoles(r) } })
      .catch(() => { if (live) setError(true) })
    return () => { live = false }
  }, [companySlug, country])

  if (error) return <p role="alert" className="p-6 text-sm">Could not load this employer. Please retry.</p>
  if (!data) return <Loading />
  const s = data.summary
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <button onClick={onBack} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">&larr; Employers</button>
      <h1 className="mt-4 display-font text-2xl font-bold text-[var(--ink)]">{roles[0]?.company_name ?? companySlug}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Hiring profile from every posting seen.</p>
      {!s?.postings ? <p className="mt-10 text-center text-sm text-[var(--muted)]">No postings seen for this employer yet.</p> : (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Postings seen" value={s.postings} />
            <StatTile label="Listed now or before" value={s.listed} />
            <StatTile label="First seen" value={s.first_seen ? new Date(s.first_seen).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'} />
            <StatTile label="Last seen" value={s.last_seen ? timeAgo(s.last_seen) : '—'} />
          </div>
          <ChartCard title="Postings per week" subtitle="Last 12 weeks"><WeeklyColumns rows={data.weekly} /></ChartCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChartCard title="Usually hires for"><BarList rows={tally(data.facets, 'category')} /></ChartCard>
            <ChartCard title="Seniority"><BarList rows={tally(data.facets, 'seniority')} /></ChartCard>
          </div>
          <ChartCard title="Skills in their postings"><TagChips tags={data.tags} /></ChartCard>
          <ChartCard title="Roles seen" subtitle="Newest first">
            <ul className="divide-y divide-[var(--line)]">
              {roles.map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[var(--ink)]">{r.title}</span>
                    <span className="block text-xs text-[var(--muted)]">{[r.category, r.seniority].filter(Boolean).join(' · ')} · {timeAgo(r.seen_at)}</span>
                  </span>
                  <Badge label={STATUS[r.status]?.label ?? r.status} color={STATUS[r.status]?.color ?? 'muted'} />
                  {r.job_id && <button onClick={() => onOpenJob(r.job_id!)} className="text-xs font-medium text-[var(--accent-deep)] hover:underline">View job</button>}
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      )}
    </div>
  )
}

