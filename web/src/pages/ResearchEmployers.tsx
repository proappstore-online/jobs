import { useEffect, useRef, useState } from 'react'
import { researchEmployers } from '../lib/db'
import type { EmployerRow } from '../lib/db'
import { CATEGORIES, inputClass, selectClass, timeAgo } from '../lib/constants'
import { countryName, sinceFor } from '../lib/research-prefs'
import { ResearchControls, useResearchScope } from '../components/ResearchControls'
import { companyColor } from '../components/JobCard'

const PAGE = 50

export function ResearchEmployers({ initialCategory, onOpenEmployer, onBack }: { initialCategory?: string; onOpenEmployer: (slug: string) => void; onBack: () => void }) {
  const scope = useResearchScope()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState(initialCategory ?? '')
  const [rows, setRows] = useState<EmployerRow[] | null>(null)
  const [more, setMore] = useState(false)
  const [error, setError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timer.current) }, [search])

  const opts = (offset: number) => ({ country: scope.country ?? 'AU', since: sinceFor(scope.days), q: debounced, category, limit: PAGE, offset })
  const req = useRef(0)
  useEffect(() => {
    if (!scope.country) return
    const id = ++req.current
    setRows(null); setError(false)
    researchEmployers(opts(0)).then((r) => { if (id === req.current) { setRows(r); setMore(r.length === PAGE) } }).catch(() => { if (id === req.current) setError(true) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.country, scope.days, debounced, category])

  async function loadMore() {
    const next = await researchEmployers(opts(rows?.length ?? 0))
    setRows((prev) => [...(prev ?? []), ...next]); setMore(next.length === PAGE)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button onClick={onBack} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">&larr; Job market</button>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-font text-2xl font-bold text-[var(--ink)]">Employers</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Every employer seen hiring in {countryName(scope.country ?? 'AU')}.</p>
        </div>
        <ResearchControls scope={scope} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className={`${inputClass} min-w-0 flex-1`} placeholder="Search employers" aria-label="Search employers" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={selectClass} aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="mt-6 text-sm">Could not load employers. Please retry.</p>}
      {!error && !rows && <p className="mt-6 text-sm text-[var(--muted)]">Loading…</p>}
      {rows && (rows.length ? (
        <ul className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          {rows.map((e) => (
            <li key={e.company_slug}>
              <button type="button" onClick={() => onOpenEmployer(e.company_slug)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--line)]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: companyColor(e.company_name).bg, color: companyColor(e.company_name).text }} aria-hidden="true">{e.company_name[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">{e.company_name}</span>
                  <span className="block text-xs text-[var(--muted)]">{e.top_category ?? 'Mixed'} · last seen {timeAgo(e.last_seen)}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-[var(--muted)]">
                  <span className="block text-sm font-semibold tabular-nums text-[var(--ink)]">{e.postings}</span>
                  {e.listed > 0 ? `${e.listed} listed` : 'postings'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-8 text-center text-sm text-[var(--muted)]">No employers match.</p>)}
      {more && <div className="pt-3 text-center"><button onClick={loadMore} className="rounded-2xl border border-[var(--line-strong)] px-6 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]">Load more</button></div>}
    </div>
  )
}
