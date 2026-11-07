import { useEffect, useState } from 'react'
import { researchOverview, researchEmployers } from '../lib/db'
import type { EmployerRow, FacetRow } from '../lib/db'
import { sinceFor, countryName } from '../lib/research-prefs'
import { BarList, ChartCard, StatTile, TagChips, WeeklyColumns } from '../components/Charts'
import { ResearchControls, useResearchScope } from '../components/ResearchControls'
import { Loading } from '../components/Loading'

type Overview = Awaited<ReturnType<typeof researchOverview>>

const LABELS: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite', 'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract', casual: 'Casual', entry: 'Entry', mid: 'Mid', senior: 'Senior', lead: 'Lead', staff: 'Staff' }

/** Sum facet rows by one dimension; unknown values fold into "Not stated". */
export function tally(facets: FacetRow[], key: keyof FacetRow) {
  const m = new Map<string, number>()
  for (const f of facets) {
    const k = (f[key] as string | null) ?? ''
    m.set(k, (m.get(k) ?? 0) + f.postings)
  }
  return [...m].map(([k, value]) => ({ key: k, label: k ? LABELS[k] ?? k : 'Not stated', value })).sort((a, b) => b.value - a.value)
}

function salaryRows(facets: FacetRow[]) {
  const m = new Map<string, { lo: number; hi: number; n: number }>()
  for (const f of facets) {
    if (!f.with_salary || !f.category) continue
    const cur = m.get(f.category) ?? { lo: Infinity, hi: 0, n: 0 }
    m.set(f.category, { lo: Math.min(cur.lo, f.salary_floor ?? Infinity), hi: Math.max(cur.hi, f.salary_ceiling ?? 0), n: cur.n + f.with_salary })
  }
  return [...m].sort((a, b) => b[1].n - a[1].n)
}

const money = (n: number) => `$${Math.round(n / 1000)}k`

export function Research({ onOpenEmployer, onOpenDirectory }: { onOpenEmployer: (slug: string) => void; onOpenDirectory: (category?: string) => void }) {
  const scope = useResearchScope()
  const [data, setData] = useState<Overview | null>(null)
  const [top, setTop] = useState<EmployerRow[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!scope.country) return
    let live = true
    setData(null); setError(false)
    const since = sinceFor(scope.days)
    Promise.all([researchOverview({ country: scope.country, since }), researchEmployers({ country: scope.country, since, limit: 10 })])
      .then(([o, e]) => { if (live) { setData(o); setTop(e) } })
      .catch(() => { if (live) setError(true) })
    return () => { live = false }
  }, [scope.country, scope.days])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-font text-2xl font-bold text-[var(--ink)]">Job market</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Who is hiring for what in {countryName(scope.country ?? 'AU')}, from every posting seen — listed jobs and job-alert leads.</p>
        </div>
        <ResearchControls scope={scope} />
      </div>

      {error && <p role="alert" className="mt-6 text-sm">Could not load market data. Please retry.</p>}
      {!error && !data && <Loading />}
      {data && (data.summary?.postings ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Postings seen" value={data.summary.postings} />
            <StatTile label="Employers hiring" value={data.summary.employers} />
            <StatTile label="Listed with original" value={data.summary.listed} hint="validated, apply on the company site" />
            <StatTile label="Awaiting validation" value={data.summary.unvalidated} />
          </div>
          <ChartCard title="Postings per week" subtitle="Last 12 weeks">
            <WeeklyColumns rows={data.weekly} />
          </ChartCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChartCard title="Hiring by category" subtitle="Select a category to see its employers">
              <BarList rows={tally(data.facets, 'category')} onSelect={(k) => onOpenDirectory(k || undefined)} />
            </ChartCard>
            <ChartCard title="Seniority">
              <BarList rows={tally(data.facets, 'seniority')} />
            </ChartCard>
            <ChartCard title="Work mode">
              <BarList rows={tally(data.facets, 'work_mode')} />
            </ChartCard>
            <ChartCard title="Contract type">
              <BarList rows={tally(data.facets, 'contract_type')} />
            </ChartCard>
          </div>
          <ChartCard title="Most requested skills" subtitle="Tags on postings">
            <TagChips tags={data.tags} />
          </ChartCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChartCard title="Top hiring employers">
              <BarList rows={top.map((e) => ({ key: e.company_slug, label: e.company_name, value: e.postings }))} onSelect={onOpenEmployer} />
              <button type="button" onClick={() => onOpenDirectory()} className="mt-3 text-sm font-medium text-[var(--accent-deep)] hover:underline">All employers →</button>
            </ChartCard>
            <ChartCard title="Salary ranges stated" subtitle="Only postings that publish a salary">
              {salaryRows(data.facets).length ? (
                <table className="w-full text-sm tabular-nums">
                  <tbody>{salaryRows(data.facets).map(([cat, s]) => (
                    <tr key={cat} className="border-b border-[var(--line)] last:border-0"><td className="py-1.5 text-[var(--ink)]">{cat}</td><td className="py-1.5 text-right text-[var(--ink)]">{money(s.lo)}–{money(s.hi)}</td><td className="py-1.5 pl-3 text-right text-[var(--muted)]">{s.n}</td></tr>
                  ))}</tbody>
                </table>
              ) : <p className="text-sm text-[var(--muted)]">No salaries published yet</p>}
            </ChartCard>
          </div>
        </div>
      ) : <p className="mt-10 text-center text-sm text-[var(--muted)]">No postings seen for {countryName(scope.country ?? 'AU')} in this period yet.</p>)}
    </div>
  )
}
