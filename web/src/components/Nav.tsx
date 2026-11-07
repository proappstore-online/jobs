import { requestSignIn } from '../lib/auth-intent'

/** Icon navigation (#18): icon + label on desktop, a bottom tab bar on mobile. */
const ICONS: Record<string, string> = {
  jobs: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Zm5 0V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16',
  market: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
  companies: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16m0-11h4a1 1 0 0 1 1 1v10M8 8h3m-3 4h3m-3 4h3M3 21h18',
  saved: 'M6 4h12v16l-6-4-6 4V4Z',
  applications: 'M9 4h6v3H9V4ZM7 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1m-8 8 2 2 4-4',
  tailored: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4M9 13h6m-6 4h4',
  leads: 'M4 6h16M4 12h16M4 18h10',
  alerts: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9m-4.3 13a2 2 0 0 1-3.4 0',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  employers: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-5h6v5',
  signin: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4m4 4H4',
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

interface Item { id: string; label: string; href: string; icon: string; badge?: number; mobile?: boolean; desktop?: boolean; onClick?: () => void }
interface NavProps {
  user: { login: string; avatarUrl: string | null } | null
  current: string
  savedCount: number
  applicationsCount: number
  unreadCount: number
}

/** Which nav item a route belongs to. */
export function navSection(route: string): string {
  if (route === 'browse' || route === 'job') return 'jobs'
  if (route.startsWith('research')) return 'market'
  if (route === 'companies' || route === 'company') return 'companies'
  if (['employer', 'register-company', 'post-job', 'edit-company', 'edit-job', 'applicants'].includes(route)) return 'employers'
  if (route === 'tailored-detail') return 'tailored'
  if (route === 'notifications') return 'alerts'
  return route
}

function Badge({ count }: { count?: number }) {
  if (!count) return null
  return <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.6rem] font-semibold text-white">{count > 99 ? '99+' : count}</span>
}

export function Nav({ user, current, savedCount, applicationsCount, unreadCount }: NavProps) {
  const items: Item[] = user
    ? [
        { id: 'jobs', label: 'Jobs', href: '#/', icon: 'jobs', mobile: true },
        { id: 'market', label: 'Market', href: '#/research', icon: 'market', mobile: true },
        { id: 'companies', label: 'Companies', href: '#/companies', icon: 'companies' },
        { id: 'employers', label: 'Employers', href: '#/employer', icon: 'employers' },
        { id: 'saved', label: 'Saved', href: '#/saved', icon: 'saved', badge: savedCount, mobile: true },
        { id: 'applications', label: 'Applied', href: '#/applications', icon: 'applications', badge: applicationsCount, mobile: true },
        { id: 'leads', label: 'Leads', href: '#/leads', icon: 'leads' },
        { id: 'tailored', label: 'Tailored', href: '#/tailored', icon: 'tailored' },
        { id: 'alerts', label: 'Alerts', href: '#/notifications', icon: 'alerts', badge: unreadCount },
        { id: 'profile', label: 'Profile', href: '#/profile', icon: 'profile', mobile: true },
      ]
    : [
        { id: 'jobs', label: 'Jobs', href: '#/', icon: 'jobs', mobile: true },
        { id: 'companies', label: 'Companies', href: '#/companies', icon: 'companies', mobile: true },
        { id: 'employers', label: 'Employers', href: '#/employer', icon: 'employers', mobile: true },
        { id: 'signin', label: 'Sign in', href: '#/', icon: 'signin', mobile: true, onClick: () => requestSignIn() },
      ]
  const link = (it: Item, compact: boolean) => {
    const active = current === it.id
    const cls = compact
      ? `relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[0.65rem] font-medium ${active ? 'text-[var(--accent-deep)]' : 'text-[var(--muted)]'}`
      : `relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm font-medium ${active ? 'bg-[var(--accent-soft)] text-[var(--accent-deep)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`
    const body = (
      <>
        <span className="relative">{it.id === 'profile' && user?.avatarUrl && !compact ? <img src={user.avatarUrl} alt="" className="size-5 rounded-full" /> : <Icon name={it.icon} size={compact ? 22 : 18} />}<Badge count={it.badge} /></span>
        <span className={!compact && it.id === 'profile' ? 'sr-only lg:not-sr-only' : undefined}>{it.label}</span>
      </>
    )
    return it.onClick
      ? <button key={it.id} type="button" aria-label={it.label} onClick={it.onClick} className={cls}>{body}</button>
      : <a key={it.id} href={it.href} className={cls} aria-current={active ? 'page' : undefined} aria-label={it.badge ? `${it.label} (${it.badge})` : undefined}>{body}</a>
  }
  const alerts = items.find((i) => i.id === 'alerts')
  return (
    <>
      <nav aria-label="Main" className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--panel)] backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
          <a href="#/" aria-label="Jobs home" className="display-font text-xl font-bold text-[var(--ink)]">Jobs</a>
          <div className="hidden items-center gap-1 sm:flex">{items.map((it) => link(it, false))}</div>
          <div className="flex items-center gap-2 sm:hidden">{alerts && link(alerts, false)}</div>
        </div>
      </nav>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--line)] bg-[var(--panel-strong)] backdrop-blur-xl sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {items.filter((i) => i.mobile).map((it) => link(it, true))}
      </nav>
    </>
  )
}
