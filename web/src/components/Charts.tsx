import { useState } from 'react'

/**
 * Minimal single-series chart kit for the research pages (#15). One validated mark
 * color (--chart-mark), values as text in ink tokens, recessive axes, a hover
 * readout on columns and a table view. Single series, so no legend.
 */

export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 display-font text-2xl font-bold tabular-nums text-[var(--ink)]">{value}</p>
      {hint && <p className="mt-0.5 text-[0.7rem] text-[var(--muted)]">{hint}</p>}
    </div>
  )
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Horizontal bars, sorted by value, each directly labelled with its count. */
export function BarList({ rows, onSelect, empty = 'No data yet' }: { rows: { label: string; value: number; key?: string }[]; onSelect?: (key: string) => void; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-[var(--muted)]">{empty}</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-[var(--ink)]">{r.label}</span>
              <span className="shrink-0 tabular-nums text-[var(--muted)]">{r.value}</span>
            </div>
            <div className="mt-1 h-2 w-full" aria-hidden="true">
              <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, background: 'var(--chart-mark)' }} />
            </div>
          </>
        )
        return (
          <li key={r.key ?? r.label}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(r.key ?? r.label)} className="block w-full rounded-lg text-left hover:bg-[var(--line)] focus-visible:outline-2" aria-label={`${r.label}: ${r.value}`}>{inner}</button>
            ) : inner}
          </li>
        )
      })}
    </ul>
  )
}

const WEEK = 604_800_000
const fmtWeek = (week: number) => new Date(week * WEEK).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** Postings per week as columns, oldest → newest, missing weeks filled with 0. */
export function WeeklyColumns({ rows, weeks = 12 }: { rows: { week: number; postings: number }[]; weeks?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const last = rows.length ? Math.max(...rows.map((r) => r.week)) : Math.floor(Date.now() / WEEK)
  const byWeek = new Map(rows.map((r) => [r.week, r.postings]))
  const series = Array.from({ length: weeks }, (_, i) => last - weeks + 1 + i).map((week) => ({ week, postings: byWeek.get(week) ?? 0 }))
  const max = Math.max(...series.map((s) => s.postings), 1)
  const W = 100 / series.length
  const shown = hover === null ? null : series[hover]
  return (
    <div>
      <p className="h-5 text-xs text-[var(--muted)]" aria-live="polite">
        {shown ? <><span className="font-semibold tabular-nums text-[var(--ink)]">{shown.postings}</span> postings · week of {fmtWeek(shown.week)}</> : `Peak ${max} a week · hover a column`}
      </p>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-36 w-full" role="img" aria-label={`Postings per week for the last ${weeks} weeks`} onMouseLeave={() => setHover(null)}>
        <line x1="0" y1="39.75" x2="100" y2="39.75" stroke="var(--line-strong)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {series.map((s, i) => {
          const h = (s.postings / max) * 38
          return (
            <g key={s.week} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${s.postings} postings, week of ${fmtWeek(s.week)}`}>
              <rect x={i * W} y="0" width={W} height="40" fill="transparent" />
              {s.postings > 0 && <rect x={i * W + W * 0.18} y={39.5 - h} width={W * 0.64} height={h} rx="0.8" fill="var(--chart-mark)" opacity={hover === null || hover === i ? 1 : 0.45} />}
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[0.65rem] text-[var(--muted)]"><span>{fmtWeek(series[0].week)}</span><span>{fmtWeek(series[series.length - 1].week)}</span></div>
      <details className="mt-2 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer">Table view</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead><tr><th className="font-medium">Week of</th><th className="text-right font-medium">Postings</th></tr></thead>
          <tbody>{[...series].reverse().map((s) => <tr key={s.week}><td>{fmtWeek(s.week)}</td><td className="text-right text-[var(--ink)]">{s.postings}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  )
}

export function TagChips({ tags, onSelect }: { tags: { tag: string; postings: number }[]; onSelect?: (tag: string) => void }) {
  if (!tags.length) return <p className="text-sm text-[var(--muted)]">No tags yet</p>
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <button key={t.tag} type="button" onClick={() => onSelect?.(t.tag)} disabled={!onSelect}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-xs text-[var(--ink)] enabled:hover:bg-[var(--line)]">
          {t.tag}<span className="tabular-nums text-[var(--muted)]">{t.postings}</span>
        </button>
      ))}
    </div>
  )
}
