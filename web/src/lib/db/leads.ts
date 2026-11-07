import { q } from '../actions'
import { ensureMigrated } from './core'

export const LEAD_DECISIONS = ['pending', 'apply', 'skip', 'archived'] as const
export type LeadDecision = (typeof LEAD_DECISIONS)[number]
export const VERIFICATION_STATES = ['live', 'expired', 'unverifiable'] as const
export type VerificationState = (typeof VERIFICATION_STATES)[number]

/** One of the caller's own leads (list_my_leads). A lead with no recorded decision reads as 'pending'. */
export interface LeadRow {
  id: string
  source_url: string
  original_url: string | null
  title: string
  company_name: string
  location: string | null
  seen_at: number
  status: string
  external_id: string | null
  verification_state: VerificationState | null
  verified_at: number | null
  decision: LeadDecision
  no_original_reason: string | null
  created_at: number
}

export async function listMyLeads(): Promise<LeadRow[]> {
  await ensureMigrated()
  return q<LeadRow>('list_my_leads', { limit: 200 })
}
