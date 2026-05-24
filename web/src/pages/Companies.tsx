import { useEffect, useRef, useState } from 'react'
import { listCompanies } from '../lib/db'
import type { CompanyRow } from '../lib/db'
import { companyColor } from '../components/JobCard'
import { Loading } from '../components/Loading'

interface CompaniesProps {
  onOpenCompany: (slug: string) => void
  onBack: () => void
}

export function Companies({ onOpenCompany, onBack }: CompaniesProps) {
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const fetchCount = useRef(0)
  useEffect(() => {
    const id = ++fetchCount.current
    setLoading(true)
    listCompanies({ search: debouncedSearch || undefined, limit: 100 }).then(
      (rows) => {
        if (id !== fetchCount.current) return
        setCompanies(rows)
        setLoading(false)
      },
    )
  }, [debouncedSearch])

  if (loading && !companies) return <Loading />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        &larr; All jobs
      </button>

      {/* Header */}
      <h1 className="mt-5 display-font text-2xl font-bold text-[var(--ink)]">
        Companies
      </h1>

      {/* Search */}
      <div className="mt-4">
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--muted)] outline-none transition-colors focus:border-[var(--accent)]"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 shrink-0 rounded-xl bg-[var(--line)]" />
                <div className="space-y-2">
                  <div className="h-4 w-28 rounded bg-[var(--line)]" />
                  <div className="h-3 w-20 rounded bg-[var(--line)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : companies && companies.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {companies.map((company) => {
            const color = companyColor(company.name)
            const initial = company.name.charAt(0).toUpperCase()
            return (
              <button
                key={company.id}
                onClick={() => onOpenCompany(company.slug)}
                className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left transition-all hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {company.name}
                    </p>
                    {(company.industry || company.size) && (
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        {[company.industry, company.size]
                          .filter(Boolean)
                          .join(' \u00B7 ')}
                      </p>
                    )}
                    {company.location && (
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        {company.location}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--muted)]">No companies found</p>
        </div>
      )}
    </div>
  )
}
