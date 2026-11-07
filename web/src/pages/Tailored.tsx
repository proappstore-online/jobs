import { useEffect, useState } from 'react'
import { listMyTailored, type TailoredSummary } from '../lib/db'
import { Loading } from '../components/Loading'
import { timeAgo } from '../lib/constants'
import { statusStyle } from './TailoredDetail'

export function Tailored({ onOpen, onBack }: { onOpen: (externalId: string) => void; onBack: () => void }) {
  const [rows, setRows] = useState<TailoredSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listMyTailored()
      .then((r) => { if (!cancelled) setRows(r) })
      .catch(() => { if (!cancelled) { setRows([]); setError('Could not load tailored applications. Please refresh and retry.') } })
    return () => { cancelled = true }
  }, [])

  if (!rows) return <Loading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {error && <p role="alert">{error}</p>}
      <button onClick={onBack} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">&larr; All jobs</button>
      <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">Tailored{rows.length > 0 ? ` (${rows.length})` : ''}</h1>
      {rows.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const style = statusStyle(r.status)
            return (
              <li key={r.id}>
                <a href={`#/tailored/${encodeURIComponent(r.external_id)}`} onClick={(e) => { e.preventDefault(); onOpen(r.external_id) }} className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold capitalize" style={{ backgroundColor: style.bg, color: style.text }}>{r.status}</span>
                    <span className="text-xs text-[var(--muted)]">Updated {timeAgo(r.updated_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{r.title}</p>
                  <p className="text-xs text-[var(--muted)]">{r.company_name}{r.location ? ` · ${r.location}` : ''}</p>
                </a>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-16 text-center text-sm text-[var(--muted)]">No tailored applications yet. The PAGS Tailor saves them here.</p>
      )}
    </div>
  )
}
