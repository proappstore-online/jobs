import { useEffect, useRef, useState } from 'react'
import { useProAuth } from '@proappstore/sdk/hooks'
import { app } from './lib/app'
import { ensureMigrated, seedIfEmpty, listSavedJobs } from './lib/db'
import { SignIn } from './pages/SignIn'
import { JobList } from './pages/JobList'
import { JobDetail } from './pages/JobDetail'
import { CompanyDetail } from './pages/CompanyDetail'
import { SavedJobs } from './pages/SavedJobs'
import { Loading } from './components/Loading'

type Route =
  | { name: 'browse' }
  | { name: 'job'; jobId: string }
  | { name: 'company'; companySlug: string }
  | { name: 'saved' }

function parseHash(): Route {
  const h = location.hash
  let m = h.match(/^#\/job\/([\w-]+)$/)
  if (m) return { name: 'job', jobId: m[1] }
  m = h.match(/^#\/company\/([\w-]+)$/)
  if (m) return { name: 'company', companySlug: m[1] }
  if (h === '#/saved') return { name: 'saved' }
  return { name: 'browse' }
}

export default function App() {
  const { user, loading } = useProAuth(app)
  const [route, setRoute] = useState<Route>(parseHash())
  const [dbReady, setDbReady] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  // Run migrations + seed AFTER user signs in (data worker requires auth).
  const initRef = useRef(false)
  useEffect(() => {
    if (!user || initRef.current) return
    initRef.current = true
    ensureMigrated()
      .then(() => seedIfEmpty())
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('DB init failed:', err)
        initRef.current = false
      })
  }, [user])

  // Listen for hash changes + scroll to top.
  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Track saved-jobs count for the badge.
  useEffect(() => {
    if (!user || !dbReady) {
      setSavedCount(0)
      return
    }
    listSavedJobs(user.id).then((jobs) => setSavedCount(jobs.length))
  }, [user, dbReady, route])

  if (loading) return <Loading />
  if (!user) return <SignIn />
  if (!dbReady) return <Loading />

  const nav = (hash: string) => { location.hash = hash }

  const content = (() => {
    if (route.name === 'job')
      return (
        <JobDetail
          jobId={route.jobId}
          user={user}
          onBack={() => nav('#/')}
          onOpenCompany={(slug) => nav(`#/company/${slug}`)}
        />
      )
    if (route.name === 'company')
      return (
        <CompanyDetail
          companySlug={route.companySlug}
          user={user}
          onBack={() => nav('#/')}
          onOpenJob={(id) => nav(`#/job/${id}`)}
        />
      )
    if (route.name === 'saved')
      return (
        <SavedJobs
          user={user}
          onOpenJob={(id) => nav(`#/job/${id}`)}
          onBack={() => nav('#/')}
        />
      )
    return (
      <JobList
        user={user}
        onOpenJob={(id) => nav(`#/job/${id}`)}
        onOpenCompany={(slug) => nav(`#/company/${slug}`)}
        onOpenSaved={() => nav('#/saved')}
      />
    )
  })()

  return (
    <>
      <Nav user={user} savedCount={savedCount} />
      {content}
    </>
  )
}

function Nav({
  user,
  savedCount,
}: {
  user: { id: string; login: string; avatarUrl: string | null }
  savedCount: number
}) {
  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3 backdrop-blur-xl">
      <a href="#/" className="display-font text-xl font-bold text-[var(--ink)]">
        Jobs
      </a>

      <div className="flex items-center gap-4">
        <a
          href="#/saved"
          className="relative text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Saved
          {savedCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[0.65rem] font-semibold text-white">
              {savedCount}
            </span>
          )}
        </a>

        <button
          onClick={() => app.auth.signOut()}
          className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--line-strong)] text-xs font-semibold text-[var(--ink)]">
              {user.login[0].toUpperCase()}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}
