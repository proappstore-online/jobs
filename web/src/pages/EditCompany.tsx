import { useEffect, useState } from 'react'
import { getMyCompanies, updateCompany } from '../lib/db'
import { inputClass } from '../lib/constants'
export function EditCompany({ user, companyId, onSaved }: { user: { id: string }; companyId: string; onSaved: () => void }) {
  const [fields, setFields] = useState({ name: '', description: '', website: '', location: '', industry: '', size: '' })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    getMyCompanies(user.id).then(rows => {
      const row = rows.find(c => c.id === companyId)
      if (!row) throw new Error('Company unavailable or not owned by you.')
      setFields({ name: row.name, description: row.description ?? '', website: row.website ?? '', location: row.location ?? '', industry: row.industry ?? '', size: row.size ?? '' }); setReady(true)
    }).catch(err => setError(err.message))
  }, [user.id, companyId])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { await updateCompany(user.id, companyId, fields); onSaved() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save company') }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-2xl p-6"><button onClick={onSaved}>Back</button><h1>Edit company</h1>
    {error && <p role="alert">{error}</p>}
    {ready && <form onSubmit={submit} className="space-y-4">{Object.entries(fields).map(([key, value]) => <label className="block" key={key}>{key}<input className={inputClass} required={key === 'name'} type={key === 'website' ? 'url' : 'text'} value={value} onChange={e => setFields({ ...fields, [key]: e.target.value })} /></label>)}<button aria-label="Save company" disabled={busy}>{busy ? 'Saving...' : 'Save company'}</button></form>}
  </main>
}
