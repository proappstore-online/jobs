export const CATEGORIES = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'HR',
  'Legal',
  'Other',
]

export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
]

export const LOCATION_TYPES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
]

export const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'staff', label: 'Staff' },
]

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

export const inputClass =
  'rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--line-strong)]'

export const selectClass =
  'rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--line-strong)]'

export const labelClass = 'text-xs font-semibold uppercase tracking-wider text-[var(--muted)]'

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export function formatSalary(min: number | null, max: number | null, currency: string): string | null {
  if (min == null && max == null) return null
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`
    return `$${n}`
  }
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)} ${currency}`
  if (min != null) return `From ${fmt(min)} ${currency}`
  return `Up to ${fmt(max!)} ${currency}`
}

export const typeColor: Record<string, 'accent' | 'sky' | 'mint' | 'muted'> = {
  'full-time': 'sky',
  'part-time': 'mint',
  contract: 'accent',
  casual: 'muted',
}

export const locationTypeColor: Record<string, 'accent' | 'sky' | 'mint' | 'muted'> = {
  remote: 'mint',
  hybrid: 'sky',
  onsite: 'muted',
}
