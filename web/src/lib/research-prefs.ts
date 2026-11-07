/** Country + period choice shared by the research pages (per device, best effort). */
const KEY = 'jobs.research'

export const PERIODS = [
  { value: 0, label: 'All time' },
  { value: 90, label: 'Last 90 days' },
  { value: 30, label: 'Last 30 days' },
] as const

export const COUNTRIES = ['AU', 'NZ', 'GB', 'US', 'CA', 'IE', 'SG', 'IN', 'DE', 'NL', 'FR', 'AE']

let names: Intl.DisplayNames | null = null
export function countryName(code: string): string {
  try { names ??= new Intl.DisplayNames(undefined, { type: 'region' }); return names.of(code) ?? code } catch { return code }
}

export function readResearchPrefs(): { country: string | null; days: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { country: typeof v.country === 'string' ? v.country : null, days: [0, 30, 90].includes(v.days) ? v.days : 0 }
  } catch { return { country: null, days: 0 } }
}

export function writeResearchPrefs(country: string, days: number) {
  try { localStorage.setItem(KEY, JSON.stringify({ country, days })) } catch { /* private mode: keep in memory only */ }
}

export const sinceFor = (days: number) => (days ? Date.now() - days * 86_400_000 : 0)
