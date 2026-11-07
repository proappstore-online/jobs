import { useEffect, useMemo, useState } from 'react'
import { listMyLeads, LEAD_DECISIONS, VERIFICATION_STATES, type LeadRow } from '../lib/db'
import { Loading } from '../components/Loading'
import { selectClass, timeAgo } from '../lib/constants'

const ANY = ''

export function Leads({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<LeadRow[] | null>(null)
  const [error, setError] = useState('')
  const [decision, setDecision] = useState(ANY)
  const [verification, setVerification] = useState(ANY)
  const [original, setOriginal] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMyLeads()
      .then((r) => { if (!cancelled) setRows(r) })
      .catch(() => { if (!cancelled) { setRows([]); setError('Could not load your leads. Please refresh and retry.') } })
    return () => { cancelled = true }
  }, [])

  const shown = useMemo(
    () => (rows ?? []).filter((r) =>
      (!decision || r.decision === decision) &&
      (!verification || (verification === 'unverified' ? !r.verification_state : r.verification_state === verification)) &&
      (!original || !!r.original_url)),
    [rows, decision, verification, original],
  )

  if (!rows) return <Loading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {error && <p role="alert">{error}</p>}
      <button onClick={onBack} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">&larr; All jobs</button>
      <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">Leads{rows.length > 0 ? ` (${shown.length}${shown.length !== rows.length ? ` of ${rows.length}` : ''})` : ''}</h1>
      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select aria-label="Decision" value={decision} onChange={(e) => setDecision(e.target.value)} className={selectClass}>
            <option value={ANY}>Any decision</option>
            {LEAD_DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select aria-label="Verification" value={verification} onChange={(e) => setVerification(e.target.value)} className={selectClass}>
            <option value={ANY}>Any verification</option>
            {VERIFICATION_STATES.map((v) => <option key={v} value={v}>{v}</option>)}
            <option value="unverified">not verified</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-[var(--ink)]">
            <input type="checkbox" checked={original} onChange={(e) => setOriginal(e.target.checked)} /> Has original
          </label>
        </div>
      )}
      {shown.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-full bg-[var(--line)] px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-[var(--ink)]">{r.decision}</span>
                <span className="capitalize">{r.verification_state ?? 'not verified'}</span>
                <span>Seen {timeAgo(r.seen_at)}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{r.title}</p>
              <p className="text-xs text-[var(--muted)]">{r.company_name}{r.location ? ` · ${r.location}` : ''}</p>
              <div className="mt-2 flex gap-4 text-sm">
                <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Open posting</a>
                {r.original_url && <a href={r.original_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Original</a>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-16 text-center text-sm text-[var(--muted)]">{rows.length > 0 ? 'No leads match these filters.' : 'No leads yet. The PAGS Scout saves them here.'}</p>
      )}
    </div>
  )
}
