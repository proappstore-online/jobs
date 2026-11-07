import { useEffect, useState } from 'react'
import { useProAuth } from '@proappstore/sdk/hooks'
import { ThemeToggle, TextSizeToggle } from '@proappstore/sdk/ui'
import { app } from '../lib/app'
import { getMyProfile, saveMyProfile, EMPTY_PROFILE } from '../lib/db'
import type { Profile as ProfileData } from '../lib/db'
import { CATEGORIES, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, LOCATION_TYPES, inputClass, labelClass, selectClass } from '../lib/constants'
import { COUNTRIES, countryName } from '../lib/research-prefs'
import { Loading } from '../components/Loading'

type ListKey = 'categories' | 'work_modes' | 'employment_types' | 'seniorities'

function Chips({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value)
          return (
            <button key={o.value} type="button" aria-label={o.label} aria-pressed={on} onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]' : 'border-[var(--line-strong)] text-[var(--muted)] hover:text-[var(--ink)]'}`}>
              {o.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-[0.7rem] text-[var(--muted)]">{value.length ? `${value.length} selected` : 'Any'}</p>
    </fieldset>
  )
}

const listText = (v: string[]) => v.join(', ')
const textList = (s: string, lower = false) => [...new Set(s.split(',').map((x) => (lower ? x.toLowerCase() : x).trim()).filter(Boolean))]

/** Profile: job-search preferences (#17), appearance and account. */
export function Profile({ user, onOpen }: { user: { login: string; avatarUrl: string | null }; onOpen: (hash: string) => void }) {
  const { signOut, deleteAccount } = useProAuth(app)
  const [p, setP] = useState<ProfileData | null>(null)
  const [locations, setLocations] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getMyProfile().then((row) => {
      const v = row ?? { ...EMPTY_PROFILE, display_name: user.login }
      setP(v); setLocations(listText(v.locations)); setTags(listText(v.tags))
    }).catch(() => setStatus({ kind: 'error', text: 'Could not load your profile. Please retry.' }))
  }, [user.login])

  if (!p) return status ? <p role="alert" className="p-6 text-sm">{status.text}</p> : <Loading />
  const set = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) => { setP({ ...p, [k]: v }); setStatus(null) }

  async function save() {
    if (!p) return
    setBusy(true); setStatus(null)
    try {
      await saveMyProfile({ ...p, locations: textList(locations), tags: textList(tags, true) })
      setStatus({ kind: 'ok', text: 'Saved. Matches on the job list now use these preferences.' })
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save.' })
    } finally { setBusy(false) }
  }

  async function removeAccount() {
    if (!confirm('Delete your account? This permanently removes all your data across all apps.') || !confirm('Are you absolutely sure? This cannot be undone.')) return
    await deleteAccount()
  }

  const lists: [ListKey, string, { value: string; label: string }[]][] = [
    ['categories', 'Categories', CATEGORIES.map((c) => ({ value: c, label: c }))],
    ['work_modes', 'Work mode', LOCATION_TYPES],
    ['employment_types', 'Employment type', EMPLOYMENT_TYPES],
    ['seniorities', 'Seniority', EXPERIENCE_LEVELS],
  ]
  const card = 'rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5'

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-12 rounded-full" /> : <span className="flex size-12 items-center justify-center rounded-full bg-[var(--line-strong)] text-lg font-semibold">{user.login[0]?.toUpperCase()}</span>}
        <div>
          <h1 className="display-font text-2xl font-bold text-[var(--ink)]">{p.display_name || user.login}</h1>
          <p className="text-sm text-[var(--muted)]">Profile and settings</p>
        </div>
      </div>

      <form className={`${card} space-y-5`} onSubmit={(e) => { e.preventDefault(); void save() }}>
        <h2 className="text-sm font-semibold text-[var(--ink)]">Job preferences</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={labelClass}>Display name</span>
            <input className={`${inputClass} mt-1 w-full`} maxLength={60} value={p.display_name ?? ''} onChange={(e) => set('display_name', e.target.value)} /></label>
          <label className="block"><span className={labelClass}>Country</span>
            <select className={`${selectClass} mt-1 w-full`} value={p.country} onChange={(e) => set('country', e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
            </select></label>
          <label className="block sm:col-span-2"><span className={labelClass}>Preferred locations</span>
            <input className={`${inputClass} mt-1 w-full`} placeholder="e.g. Melbourne, Geelong" value={locations} onChange={(e) => { setLocations(e.target.value); setStatus(null) }} />
            <span className="mt-1 block text-[0.7rem] text-[var(--muted)]">Comma separated. Remote jobs always match.</span></label>
        </div>
        {lists.map(([k, label, options]) => <Chips key={k} label={label} options={options} value={p[k]} onChange={(v) => set(k, v)} />)}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={labelClass}>Minimum salary</span>
            <input className={`${inputClass} mt-1 w-full`} inputMode="numeric" placeholder="e.g. 120000" value={p.min_salary ?? ''} onChange={(e) => { const n = e.target.value.replace(/\D/g, ''); set('min_salary', n ? Number(n) : null) }} />
            <span className="mt-1 block text-[0.7rem] text-[var(--muted)]">Jobs without a stated salary still match.</span></label>
          <label className="block"><span className={labelClass}>Skills</span>
            <input className={`${inputClass} mt-1 w-full`} placeholder="e.g. aws, python, project management" value={tags} onChange={(e) => { setTags(e.target.value); setStatus(null) }} /></label>
        </div>
        {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${status.kind === 'error' ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>{status.text}</p>}
        <button type="submit" aria-label="Save preferences" disabled={busy} className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save preferences'}</button>
      </form>

      <section className={card}>
        <h2 className="text-sm font-semibold text-[var(--ink)]">Appearance</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
          <span className="flex items-center gap-2">Theme <ThemeToggle /></span>
          <span className="flex items-center gap-2">Text size <TextSizeToggle /></span>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold text-[var(--ink)]">Shortcuts</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {[['#/research', 'Job market'], ['#/companies', 'Companies'], ['#/employer', 'Employer dashboard'], ['#/notifications', 'Notifications']].map(([h, l]) => (
            <button key={h} type="button" aria-label={l} onClick={() => onOpen(h)} className="rounded-xl border border-[var(--line-strong)] px-3 py-1.5 text-[var(--ink)] hover:bg-[var(--line)]">{l}</button>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold text-[var(--ink)]">Account</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={signOut} className="rounded-xl border border-[var(--line-strong)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--line)]">Sign out</button>
          <button type="button" onClick={() => void removeAccount()} className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--error)] hover:bg-[var(--line)]">Delete account</button>
        </div>
      </section>
    </div>
  )
}
