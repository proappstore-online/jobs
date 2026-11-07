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
import { Tailored } from './pages/Tailored'
import { TailoredDetail } from './pages/TailoredDetail'
import { EmployerDashboard } from './pages/EmployerDashboard'
import { RegisterCompany } from './pages/RegisterCompany'
import { PostJob } from './pages/PostJob'
import { EditJob } from './pages/EditJob'
import { Applicants } from './pages/Applicants'
import { Notifications } from './pages/Notifications'
import { EditCompany } from './pages/EditCompany'
import { Loading } from './components/Loading'
import { Nav, navSection } from './components/Nav'
import { Research } from './pages/Research'
import { ResearchEmployers } from './pages/ResearchEmployers'
import { EmployerProfile } from './pages/EmployerProfile'
import { Profile } from './pages/Profile'

type Route =
  | { name: 'browse' }
  | { name: 'job'; jobId: string }
  | { name: 'company'; companySlug: string }
  | { name: 'saved' }
  | { name: 'companies' }
  | { name: 'applications' }
  | { name: 'tailored' }
  | { name: 'tailored-detail'; externalId: string }
  | { name: 'employer' }
  | { name: 'register-company' }
  | { name: 'post-job'; companyId: string }
  | { name: 'edit-company'; companyId: string }
  | { name: 'edit-job'; jobId: string }
  | { name: 'applicants'; jobId: string }
  | { name: 'notifications' }
  | { name: 'research' }
  | { name: 'research-employers'; category?: string }
  | { name: 'research-employer'; companySlug: string }
  | { name: 'profile' }

function parseHash(): Route {
  const h = location.hash
  let m = h.match(/^#\/job\/([\w-]+)$/)
  if (m) return { name: 'job', jobId: m[1] }
  m = h.match(/^#\/company\/([\w-]+)$/)
  if (m) return { name: 'company', companySlug: m[1] }
  if (h === '#/research') return { name: 'research' }
  m = h.match(/^#\/research\/employers(?:\?category=([\w-]+))?$/)
  if (m) return { name: 'research-employers', category: m[1] }
  m = h.match(/^#\/research\/employers\/([\w-]+)$/)
  if (m) return { name: 'research-employer', companySlug: m[1] }
  if (h === '#/profile') return { name: 'profile' }
  if (h === '#/saved') return { name: 'saved' }
  if (h === '#/companies') return { name: 'companies' }
  if (h === '#/applications') return { name: 'applications' }
  if (h === '#/tailored') return { name: 'tailored' }
  m = h.match(/^#\/tailored\/([^/?#]+)$/)
  if (m) return { name: 'tailored-detail', externalId: decodeURIComponent(m[1]) }
  if (h === '#/notifications') return { name: 'notifications' }
  if (h === '#/employer') return { name: 'employer' }
  if (h === '#/register-company') return { name: 'register-company' }
  m = h.match(/^#\/post-job\/([\w-]+)$/)
  if (m) return { name: 'post-job', companyId: m[1] }
  m = h.match(/^#\/edit-company\/([\w-]+)$/)
  if (m) return { name: 'edit-company', companyId: m[1] }
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
    const returnHash = sessionStorage.getItem('jobs.return')
    if (returnHash) { sessionStorage.removeItem('jobs.return'); location.hash = returnHash; setRoute(parseHash()) }
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
  const publicRoute = ['browse', 'job', 'company', 'companies'].includes(route.name)
  if (!user && !publicRoute) return <SignIn />
  if (user && !dbReady) return <Loading />

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
    if (!user && !['browse', 'companies'].includes(route.name)) return <SignIn />
    if (route.name === 'research' && user)
      return <Research onOpenEmployer={(slug) => nav(`#/research/employers/${slug}`)} onOpenDirectory={(cat) => nav(cat ? `#/research/employers?category=${cat}` : '#/research/employers')} />
    if (route.name === 'research-employers' && user)
      return <ResearchEmployers key={route.category ?? ''} initialCategory={route.category} onOpenEmployer={(slug) => nav(`#/research/employers/${slug}`)} onBack={() => nav('#/research')} />
    if (route.name === 'research-employer' && user)
      return <EmployerProfile companySlug={route.companySlug} onOpenJob={(id) => nav(`#/job/${id}`)} onBack={() => nav('#/research/employers')} />
    if (route.name === 'profile' && user) return <Profile user={user} onOpen={nav} />
    if (route.name === 'edit-company' && user) return <EditCompany user={user} companyId={route.companyId} onSaved={() => nav('#/employer')} />
    if (route.name === 'saved' && user)
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
    if (route.name === 'applications' && user)
      return (
        <Applications
          user={user}
          onOpenJob={(id) => nav(`#/job/${id}`)}
          onBack={() => nav('#/')}
        />
      )
    if (route.name === 'tailored' && user)
      return <Tailored onOpen={(id) => nav(`#/tailored/${encodeURIComponent(id)}`)} onBack={() => nav('#/')} />
    if (route.name === 'tailored-detail' && user)
      return <TailoredDetail externalId={route.externalId} onBack={() => nav('#/tailored')} />
    if (route.name === 'notifications' && user)
      return (
        <Notifications
          user={user}
          onBack={() => nav('#/')}
        />
      )
    if (route.name === 'employer' && user)
      return (
        <EmployerDashboard
          user={user}
          onEditCompany={(id) => nav(`#/edit-company/${id}`)}
          onPostJob={(companyId) => nav(`#/post-job/${companyId}`)}
          onEditJob={(jobId) => nav(`#/edit-job/${jobId}`)}
          onViewApplicants={(jobId) => nav(`#/applicants/${jobId}`)}
          onRegisterCompany={() => nav('#/register-company')}
          onBack={() => nav('#/')}
        />
      )
    if (route.name === 'register-company' && user)
      return (
        <RegisterCompany
          user={user}
          onCreated={() => nav('#/employer')}
          onBack={() => nav('#/employer')}
        />
      )
    if (route.name === 'post-job' && user)
      return (
        <PostJob
          user={user}
          companyId={route.companyId}
          onPosted={() => nav('#/employer')}
          onBack={() => nav('#/employer')}
        />
      )
    if (route.name === 'edit-job' && user)
      return (
        <EditJob
          user={user}
          jobId={route.jobId}
          onSaved={() => nav('#/employer')}
          onBack={() => nav('#/employer')}
        />
      )
    if (route.name === 'applicants' && user)
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
      <Nav user={user} current={navSection(route.name)} savedCount={savedCount} applicationsCount={applicationsCount} unreadCount={unreadCount} />
      <main className="pb-20 sm:pb-0">{content}</main>
    </>
  )
}
