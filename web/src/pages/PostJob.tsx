import { useState } from 'react'
import { postJob } from '../lib/db'
import {
  CATEGORIES,
  EMPLOYMENT_TYPES,
  LOCATION_TYPES,
  EXPERIENCE_LEVELS,
  inputClass,
  selectClass,
  labelClass,
} from '../lib/constants'

interface PostJobProps {
  user: { id: string }
  companyId: string
  onPosted: () => void
  onBack: () => void
}

export function PostJob({ user, companyId, onPosted, onBack }: PostJobProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('mid')
  const [employmentType, setEmploymentType] = useState('full-time')
  const [location, setLocation] = useState('')
  const [locationType, setLocationType] = useState('remote')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [salaryCurrency, setSalaryCurrency] = useState('AUD')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !category || !description.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await postJob(user.id, companyId, {
        title: title.trim(),
        category,
        experience_level: experienceLevel,
        employment_type: employmentType,
        location: location.trim() || undefined,
        location_type: locationType,
        salary_min: salaryMin ? Number(salaryMin) : undefined,
        salary_max: salaryMax ? Number(salaryMax) : undefined,
        salary_currency: salaryCurrency.trim() || 'AUD',
        description: description.trim(),
      })
      onPosted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post job')
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
        Post a Job
      </h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          {/* Job title */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Job title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Software Engineer"
              className={`${inputClass} w-full`}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Category *</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${selectClass} w-full`}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Experience level */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Experience level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className={`${selectClass} w-full`}
            >
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Employment type */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Employment type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className={`${selectClass} w-full`}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
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

          {/* Location type */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Location type</label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className={`${selectClass} w-full`}
            >
              {LOCATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Salary row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Salary min</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="80000"
                className={`${inputClass} w-full`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Salary max</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="120000"
                className={`${inputClass} w-full`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Currency</label>
              <input
                type="text"
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Description *</label>
            <p className="text-[0.65rem] text-[var(--muted)]">
              Supports HTML for formatting (paragraphs, lists, bold, etc.)
            </p>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role, responsibilities, and requirements..."
              rows={8}
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
          disabled={!title.trim() || !category || !description.trim() || submitting}
          className="mt-5 w-full rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  )
}
