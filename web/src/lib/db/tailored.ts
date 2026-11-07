import { q, x } from '../actions'
import { ensureMigrated } from './core'

export const TAILORED_STATUSES = ['tailored', 'approved', 'submitted', 'failed', 'archived'] as const
export type TailoredStatus = (typeof TAILORED_STATUSES)[number]

/** A tailored application written by the PAGS Tailor/Runner (#19). Private to its owner. */
export interface TailoredSummary {
  id: string
  external_id: string
  source_url: string
  title: string
  company_name: string
  location: string | null
  status: TailoredStatus
  status_note: string | null
  submitted_at: number | null
  resume_file_name: string | null
  cover_letter_file_name: string | null
  created_at: number
  updated_at: number
}

export interface TailoredAnswer { question: string; answer: string }

export interface TailoredApplication extends TailoredSummary {
  resume_md: string | null
  cover_letter_md: string | null
  answers: TailoredAnswer[]
}

export async function listMyTailored(): Promise<TailoredSummary[]> {
  await ensureMigrated()
  return q<TailoredSummary>('list_my_tailored')
}

export async function getMyTailored(externalId: string): Promise<TailoredApplication | null> {
  await ensureMigrated()
  const row = (await q<Omit<TailoredApplication, 'answers'> & { answers: string }>('get_my_tailored', { external_id: externalId }))[0]
  if (!row) return null
  let answers: TailoredAnswer[] = []
  try { answers = JSON.parse(row.answers) } catch { /* stored value is validated in SQL; show none if unreadable */ }
  return { ...row, answers }
}

export async function setTailoredStatus(externalId: string, status: TailoredStatus): Promise<void> {
  await ensureMigrated()
  const meta = await x('set_tailored_status', { external_id: externalId, status })
  if (meta.changes !== 1) throw new Error('Status not saved. Refresh and retry.')
}
