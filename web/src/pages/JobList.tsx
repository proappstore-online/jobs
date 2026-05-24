import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listJobs,
  countJobs,
  isJobSaved,
  saveJob,
  unsaveJob,
} from '../lib/db'
import type { JobWithCompany, ListJobsOpts } from '../lib/db'
import { JobCard } from '../components/JobCard'
import { Filters } from '../components/Filters'

interface JobListProps {
  user: { id: string }
  onOpenJob: (id: string) => void
  onOpenCompany: (slug: string) => void
  onOpenSaved: () => void
}

const PAGE_SIZE = 20

const EMPLOYMENT_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  casual: 'Casual',
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'Onsite',
}

export function JobList({ user, onOpenJob, onOpenCompany }: JobListProps) {
  const [jobs, setJobs] = useState<JobWithCompany[] | null>(null)
  const [total, setTotal] = useState(0)
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [category, setCategory] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [locationType, setLocationType] = useState('')

  // Debounce search + location
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setDebouncedLocation(locationFilter)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search, locationFilter])

  const buildOpts = useCallback(
    (offset = 0): ListJobsOpts => ({
      search: debouncedSearch || undefined,
      location: debouncedLocation || undefined,
      category: category || undefined,
      type: employmentType || undefined,
      locationType: locationType || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [debouncedSearch, debouncedLocation, category, employmentType, locationType],
  )

  // Fetch jobs whenever filters change.
  const fetchCount = useRef(0)
  useEffect(() => {
    const id = ++fetchCount.current
    setLoading(true)
    const opts = buildOpts()
    Promise.all([listJobs(opts), countJobs(opts)])
      .then(async ([rows, cnt]) => {
        if (id !== fetchCount.current) return
        const savedChecks = await Promise.all(rows.map((j) => isJobSaved(user.id, j.id)))
        if (id !== fetchCount.current) return
        const saved = new Set<string>()
        rows.forEach((j, i) => {
          if (savedChecks[i]) saved.add(j.id)
        })
        setSavedSet(saved)
        setJobs(rows)
        setTotal(cnt)
        setLoading(false)
      })
  }, [buildOpts, user.id])

  async function handleLoadMore() {
    if (!jobs) return
    setLoadingMore(true)
    const opts = buildOpts(jobs.length)
    const rows = await listJobs(opts)
    const savedChecks = await Promise.all(rows.map((j) => isJobSaved(user.id, j.id)))
    const newSaved = new Set(savedSet)
    rows.forEach((j, i) => {
      if (savedChecks[i]) newSaved.add(j.id)
    })
    setSavedSet(newSaved)
    setJobs((prev) => [...(prev ?? []), ...rows])
    setLoadingMore(false)
  }

  async function handleToggleSave(jobId: string) {
    const isSaved = savedSet.has(jobId)
    const newSet = new Set(savedSet)
    if (isSaved) {
      newSet.delete(jobId)
      setSavedSet(newSet)
      await unsaveJob(user.id, jobId)
    } else {
      newSet.add(jobId)
      setSavedSet(newSet)
      await saveJob(user.id, jobId)
    }
  }

  // Build active filter pills
  const activeFilters: { key: string; label: string; clear: () => void }[] = []
  if (category) activeFilters.push({ key: 'cat', label: category, clear: () => setCategory('') })
  if (employmentType) activeFilters.push({ key: 'type', label: EMPLOYMENT_LABELS[employmentType] ?? employmentType, clear: () => setEmploymentType('') })
  if (locationType) activeFilters.push({ key: 'loc-type', label: LOCATION_TYPE_LABELS[locationType] ?? locationType, clear: () => setLocationType('') })
  if (locationFilter) activeFilters.push({ key: 'loc', label: locationFilter, clear: () => setLocationFilter('') })
  if (search) activeFilters.push({ key: 'search', label: `"${search}"`, clear: () => setSearch('') })
  const hasFilters = activeFilters.length > 0

  function clearAllFilters() {
    setSearch('')
    setLocationFilter('')
    setCategory('')
    setEmploymentType('')
    setLocationType('')
  }

  // Build results summary text (e.g. "16 jobs in Engineering · Remote")
  function resultsSummary(): string {
    const count = `${total} ${total === 1 ? 'job' : 'jobs'}`
    const parts: string[] = []
    if (category) parts.push(category)
    if (locationType) parts.push(LOCATION_TYPE_LABELS[locationType] ?? locationType)
    if (employmentType) parts.push(EMPLOYMENT_LABELS[employmentType] ?? employmentType)
    if (locationFilter) parts.push(locationFilter)
    if (search) parts.push(`matching "${search}"`)
    if (parts.length === 0) return `${count} found`
    return `${count} in ${parts.join(' \u00B7 ')}`
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Filters */}
      <Filters
        search={search}
        onSearchChange={setSearch}
        location={locationFilter}
        onLocationChange={setLocationFilter}
        category={category}
        onCategoryChange={setCategory}
        employmentType={employmentType}
        onEmploymentTypeChange={setEmploymentType}
        locationType={locationType}
        onLocationTypeChange={setLocationType}
      />

      {/* Active filter pills */}
      {hasFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.clear}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[0.7rem] font-medium text-[var(--accent-deep)] transition-colors hover:bg-[var(--accent)] hover:text-white"
            >
              {f.label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-[0.7rem] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results count */}
      {!loading && jobs && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          {resultsSummary()}
        </p>
      )}

      {/* Job list */}
      {loading ? (
        <div className="mt-3 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="mt-3 space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={savedSet.has(job.id)}
              onOpen={() => onOpenJob(job.id)}
              onToggleSave={() => handleToggleSave(job.id)}
              onOpenCompany={() => onOpenCompany(job.company_slug)}
            />
          ))}

          {/* Load more */}
          {jobs.length < total && (
            <div className="pt-2 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-2xl border border-[var(--line-strong)] px-6 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-40"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--muted)]">No jobs match your search</p>
        </div>
      )}
    </div>
  )
}

/** Animated skeleton placeholder that mimics JobCard layout. */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="size-10 shrink-0 rounded-xl bg-[var(--line)]" />

        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Company name */}
          <div className="h-3 w-24 rounded bg-[var(--line)]" />
          {/* Job title */}
          <div className="h-4 w-48 rounded bg-[var(--line)]" />
          {/* Badges row */}
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-[var(--line)]" />
            <div className="h-5 w-14 rounded-full bg-[var(--line)]" />
            <div className="h-5 w-20 rounded-full bg-[var(--line)]" />
          </div>
          {/* Salary + time */}
          <div className="flex gap-3">
            <div className="h-3 w-28 rounded bg-[var(--line)]" />
            <div className="h-3 w-16 rounded bg-[var(--line)]" />
          </div>
        </div>

        {/* Bookmark placeholder */}
        <div className="mt-1 size-5 shrink-0 rounded bg-[var(--line)]" />
      </div>
    </div>
  )
}
