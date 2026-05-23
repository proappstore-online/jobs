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

      {/* Results count */}
      {!loading && jobs && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          {total} {total === 1 ? 'job' : 'jobs'} found
        </p>
      )}

      {/* Job list */}
      {loading ? (
        <div className="mt-12 text-center text-sm text-[var(--muted)]">Loading...</div>
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
