import { useEffect, useMemo, useState } from 'react'
import { getMyTailored, setTailoredStatus, TAILORED_STATUSES, type TailoredApplication, type TailoredStatus } from '../lib/db'
import { Loading } from '../components/Loading'
import { renderMarkdown } from '../lib/markdown'

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  tailored: { bg: 'var(--sky-soft)', text: 'var(--sky-deep)' },
  approved: { bg: 'var(--mint-soft)', text: 'var(--mint-deep)' },
  submitted: { bg: 'var(--accent-soft)', text: 'var(--accent-deep)' },
}

export function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: 'var(--line)', text: 'var(--muted)' }
}

function Markdown({ title, md }: { title: string; md: string | null }) {
  const html = useMemo(() => (md ? renderMarkdown(md) : ''), [md])
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2>
      {html ? <div className="prose-sm mt-2 space-y-2 text-sm text-[var(--ink)]" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-2 text-xs text-[var(--muted)]">None saved.</p>}
    </section>
  )
}

export function TailoredDetail({ externalId, onBack }: { externalId: string; onBack: () => void }) {
  const [app, setApp] = useState<TailoredApplication | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setApp(undefined)
    getMyTailored(externalId)
      .then((r) => { if (!cancelled) setApp(r) })
      .catch(() => { if (!cancelled) { setApp(null); setError('Could not load this application. Please refresh and retry.') } })
    return () => { cancelled = true }
  }, [externalId])

  async function changeStatus(status: TailoredStatus) {
    setError('')
    try {
      await setTailoredStatus(externalId, status)
      setApp((a) => (a ? { ...a, status } : a))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not change status') }
  }

  if (app === undefined) return <Loading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {error && <p role="alert">{error}</p>}
      <button onClick={onBack} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">&larr; Tailored</button>
      {!app ? (
        <p className="mt-10 text-center text-sm text-[var(--muted)]">Tailored application not found.</p>
      ) : (
        <>
          <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">{app.title}</h1>
          <p className="text-sm text-[var(--muted)]">{app.company_name}{app.location ? ` · ${app.location}` : ''}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-xs text-[var(--muted)]">
              Status{' '}
              <select value={app.status} onChange={(e) => changeStatus(e.target.value as TailoredStatus)} className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs capitalize text-[var(--ink)]">
                {TAILORED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <a href={app.source_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[var(--accent-deep)] hover:underline">View posting</a>
          </div>
          {app.status_note && <p className="mt-2 text-xs text-[var(--muted)]">{app.status_note}</p>}
          <Markdown title={app.resume_file_name ? `CV (${app.resume_file_name})` : 'CV'} md={app.resume_md} />
          <Markdown title={app.cover_letter_file_name ? `Cover letter (${app.cover_letter_file_name})` : 'Cover letter'} md={app.cover_letter_md} />
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Answers</h2>
            {app.answers.length > 0 ? (
              <dl className="mt-2 space-y-3 text-sm">
                {app.answers.map((a, i) => (
                  <div key={i}><dt className="font-medium text-[var(--ink)]">{a.question}</dt><dd className="whitespace-pre-wrap text-[var(--muted)]">{a.answer}</dd></div>
                ))}
              </dl>
            ) : <p className="mt-2 text-xs text-[var(--muted)]">None saved.</p>}
          </section>
        </>
      )}
    </div>
  )
}
