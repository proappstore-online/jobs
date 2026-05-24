import { CATEGORIES, EMPLOYMENT_TYPES, LOCATION_TYPES, selectClass, inputClass } from '../lib/constants'

interface FiltersProps {
  search: string
  onSearchChange: (v: string) => void
  location: string
  onLocationChange: (v: string) => void
  category: string
  onCategoryChange: (v: string) => void
  employmentType: string
  onEmploymentTypeChange: (v: string) => void
  locationType: string
  onLocationTypeChange: (v: string) => void
}

export function Filters({
  search,
  onSearchChange,
  location,
  onLocationChange,
  category,
  onCategoryChange,
  employmentType,
  onEmploymentTypeChange,
  locationType,
  onLocationTypeChange,
}: FiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search jobs or companies..."
          className={`${inputClass} w-full pl-9`}
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="Location"
          className={`${inputClass} w-full sm:w-32`}
        />

        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={selectClass}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={employmentType}
          onChange={(e) => onEmploymentTypeChange(e.target.value)}
          className={selectClass}
        >
          <option value="">All types</option>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={locationType}
          onChange={(e) => onLocationTypeChange(e.target.value)}
          className={selectClass}
        >
          <option value="">Any location type</option>
          {LOCATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
