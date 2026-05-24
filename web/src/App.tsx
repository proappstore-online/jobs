import { useEffect, useRef, useState } from 'react'
import { useProAuth } from '@proappstore/sdk/hooks'
import { app } from './lib/app'
import { ensureMigrated, listSavedJobs, listApplications, recordView, countUnread } from './lib/db'
import { SignIn } from './pages/SignIn'
import { JobList } from './pages/JobList'
import { JobDetail } from './pages/JobDetail'
import { CompanyDetail } from './pages/CompanyDetail'
import { SavedJobs } from './pages/SavedJobs'
import { Companies } from './pages/Companies'
import { Applications } from './pages/Applications'
import { EmployerDashboard } from './pages/EmployerDashboard'
import { RegisterCompany } from './pages/RegisterCompany'
import { PostJob } from './pages/PostJob'
import { EditJob } from './pages/EditJob'
import { Applicants } from './pages/Applicants'
import { Notifications } from './pages/Notifications'
import { Loading } from './components/Loading'

type Route =
  | { name: 'browse' }
  | { name: 'job'; jobId: string }
  | { name: 'company'; companySlug: string }
  | { name: 'saved' }
  | { name: 'companies' }
  | { name: 'applications' }
  | { name: 'employer' }
  | { name: 'register-company' }
  | { name: 'post-job'; companyId: string }
  | { name: 'edit-job'; jobId: string }
  | { name: 'applicants'; jobId: string }
  | { name: 'notifications' }

function parseHash(): Route {
  const h = location.hash
  let m = h.match(/^#\/job\/([\w-]+)$/)
  if (m) return { name: 'job', jobId: m[1] }
  m = h.match(/^#\/company\/([\w-]+)$/)
  if (m) return { name: 'company', companySlug: m[1] }
  if (h === '#/saved') return { name: 'saved' }
  if (h === '#/companies') return { name: 'companies' }
  if (h === '#/applications') return { name: 'applications' }
  if (h === '#/notifications') return { name: 'notifications' }
  if (h === '#/employer') return { name: 'employer' }
  if (h === '#/register-company') return { name: 'register-company' }
  m = h.match(/^#\/post-job\/([\w-]+)$/)
  if (m) return { name: 'post-job', companyId: m[1] }
  m = h.match(/^#\/edit-job\/([\w-]+)$/)
  if (m) return { name: 'edit-job', jobId: m[1] }
  m = h.match(/^#\/applicants\/([\w-]+)$/)
  if (m) return { name: 'applicants', jobId: m[1] }
  return { name: 'browse' }
}

export default function App() {
  const { user, loading } = useProAuth(app)
  const [route, setRoute] = useState<Route>(parseHash())
  const [dbReady, setDbReady] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [applicationsCount, setApplicationsCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  // Run migrations AFTER user signs in (data worker requires auth).
  const initRef = useRef(false)
  useEffect(() => {
    if (!user || initRef.current) return
    initRef.current = true
    ensureMigrated()
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

  // Track badge counts.
  useEffect(() => {
    if (!user || !dbReady) {
      setSavedCount(0)
      setApplicationsCount(0)
      setUnreadCount(0)
      return
    }
    listSavedJobs(user.id).then((jobs) => setSavedCount(jobs.length))
    listApplications(user.id).then((apps) => setApplicationsCount(apps.length))
    countUnread(user.id).then(setUnreadCount)
  }, [user, dbReady, route])

  // Record recent views when navigating to a job.
  useEffect(() => {
    if (route.name === 'job' && user && dbReady) {
      recordView(user.id, route.jobId)
    }
  }, [route, user, dbReady])

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
    if (route.name === 'companies')
      return (
        <Companies
          onOpenCompany={(slug) => nav(`#/company/${slug}`)}
          onBack={() => nav('#/')}
        />
      )
    if (route.name === 'applications')
      return (
        <Applications
          user={user}
          onOpenJob={(id) => nav(`#/job/${id}`)}
          onBack={() => nav('#/')}
        />
      )
    if (route.name === 'notifications')
      return (
        <Notifications
          user={user}
          onBack={() => nav('#/')}
        />
      )
    if (route.name === 'employer')
      return (
        <EmployerDashboard
          user={user}
          onPostJob={(companyId) => nav(`#/post-job/${companyId}`)}
          onEditJob={(jobId) => nav(`#/edit-job/${jobId}`)}
          onViewApplicants={(jobId) => nav(`#/applicants/${jobId}`)}
          onRegisterCompany={() => nav('#/register-company')}
          onBack={() => nav('#/')}
        />
      )
    if (route.name === 'register-company')
      return (
        <RegisterCompany
          user={user}
          onCreated={() => nav('#/employer')}
          onBack={() => nav('#/employer')}
        />
      )
    if (route.name === 'post-job')
      return (
        <PostJob
          user={user}
          companyId={route.companyId}
          onPosted={() => nav('#/employer')}
          onBack={() => nav('#/employer')}
        />
      )
    if (route.name === 'edit-job')
      return (
        <EditJob
          user={user}
          jobId={route.jobId}
          onSaved={() => nav('#/employer')}
          onBack={() => nav('#/employer')}
        />
      )
    if (route.name === 'applicants')
      return (
        <Applicants
          user={user}
          jobId={route.jobId}
          onBack={() => nav('#/employer')}
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
      <Nav user={user} savedCount={savedCount} applicationsCount={applicationsCount} unreadCount={unreadCount} />
      {content}
    </>
  )
}

function Nav({
  user,
  savedCount,
  applicationsCount,
  unreadCount,
}: {
  user: { id: string; login: string; avatarUrl: string | null }
  savedCount: number
  applicationsCount: number
  unreadCount: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--panel)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 py-3">
        <a href="#/" className="display-font text-xl font-bold text-[var(--ink)]">
          Jobs
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-4 sm:flex">
          <NavLinks savedCount={savedCount} applicationsCount={applicationsCount} unreadCount={unreadCount} />
          <UserButton user={user} />
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 sm:hidden"
          aria-label="Menu"
        >
          {unreadCount > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent)]" />
          )}
          <UserButton user={user} />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="flex flex-col gap-3 border-t border-[var(--line)] px-5 py-4 sm:hidden">
          <NavLinks savedCount={savedCount} applicationsCount={applicationsCount} unreadCount={unreadCount} onClick={() => setMenuOpen(false)} />
          <button
            onClick={() => app.auth.signOut()}
            className="text-left text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}

function NavLinks({
  savedCount,
  applicationsCount,
  unreadCount,
  onClick,
}: {
  savedCount: number
  applicationsCount: number
  unreadCount: number
  onClick?: () => void
}) {
  const linkClass = 'text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]'
  return (
    <>
      <a href="#/companies" className={linkClass} onClick={onClick}>Companies</a>
      <a href="#/employer" className={linkClass} onClick={onClick}>Employers</a>
      <a href="#/notifications" className={`relative ${linkClass}`} onClick={onClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && <CountBadge count={unreadCount} />}
      </a>
      <a href="#/applications" className={`relative ${linkClass}`} onClick={onClick}>
        Applications
        {applicationsCount > 0 && <CountBadge count={applicationsCount} />}
      </a>
      <a href="#/saved" className={`relative ${linkClass}`} onClick={onClick}>
        Saved
        {savedCount > 0 && <CountBadge count={savedCount} />}
      </a>
    </>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[0.65rem] font-semibold text-white">
      {count}
    </span>
  )
}

function UserButton({ user }: { user: { login: string; avatarUrl: string | null } }) {
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
  ) : (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--line-strong)] text-xs font-semibold text-[var(--ink)]">
      {user.login[0].toUpperCase()}
    </span>
  )
}
