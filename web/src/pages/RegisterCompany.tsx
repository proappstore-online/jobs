import { useState } from 'react'
import { registerCompany } from '../lib/db'
import { inputClass, selectClass, labelClass, COMPANY_SIZES } from '../lib/constants'

interface RegisterCompanyProps {
  user: { id: string }
  onCreated: (companyId: string) => void
  onBack: () => void
}

export function RegisterCompany({ user, onCreated, onBack }: RegisterCompanyProps) {
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [size, setSize] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const company = await registerCompany(user.id, {
        name: name.trim(),
        industry: industry.trim() || undefined,
        size: size || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      })
      onCreated(company.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; Back
      </button>

      {/* Title */}
      <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">
        Register Your Company
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Create a company profile to start posting jobs
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          {/* Company name */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Company name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              className={`${inputClass} w-full`}
            />
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Technology, Finance, Healthcare..."
              className={`${inputClass} w-full`}
            />
          </div>

          {/* Company size */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Company size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className={`${selectClass} w-full`}
            >
              <option value="">Select size</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Sydney, Australia"
              className={`${inputClass} w-full`}
            />
          </div>

          {/* Website */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className={`${inputClass} w-full`}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell candidates about your company..."
              rows={3}
              className={`${inputClass} w-full resize-none`}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs font-medium text-[var(--error)]">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="mt-5 w-full rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? 'Creating...' : 'Create Company'}
        </button>
      </form>
    </div>
  )
}
