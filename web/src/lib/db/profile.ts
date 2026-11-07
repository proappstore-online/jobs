import { q, x } from '../actions'
import { ensureMigrated } from './core'
import type { JobWithCompany } from './jobs'

/** The signed-in user's job-search profile (#17). Private to its owner. */
export interface Profile {
  display_name: string | null
  country: string
  locations: string[]
  categories: string[]
  work_modes: string[]
  employment_types: string[]
  seniorities: string[]
  tags: string[]
  min_salary: number | null
}

const LISTS = ['locations', 'categories', 'work_modes', 'employment_types', 'seniorities', 'tags'] as const

export const EMPTY_PROFILE: Profile = { display_name: null, country: 'AU', locations: [], categories: [], work_modes: [], employment_types: [], seniorities: [], tags: [], min_salary: null }

export async function getMyProfile(): Promise<Profile | null> {
  await ensureMigrated()
  const row = (await q<Record<string, unknown>>('get_my_profile'))[0]
  if (!row) return null
  const parsed = { ...EMPTY_PROFILE, display_name: (row.display_name as string | null) ?? null, country: (row.country as string) || 'AU', min_salary: (row.min_salary as number | null) ?? null }
  for (const key of LISTS) {
    try { parsed[key] = JSON.parse(String(row[key] ?? '[]')) } catch { parsed[key] = [] }
  }
  return parsed
}

export async function saveMyProfile(p: Profile): Promise<void> {
  await ensureMigrated()
  const lists = Object.fromEntries(LISTS.map((k) => [k, JSON.stringify(p[k])]))
  const meta = await x('save_my_profile', { display_name: p.display_name, country: p.country, min_salary: p.min_salary, ...lists })
  if (meta.changes !== 1) throw new Error('Profile not saved. Check the values and retry.')
}

export async function listMyMatches(): Promise<JobWithCompany[]> {
  await ensureMigrated()
  return q<JobWithCompany>('list_my_matches')
}
