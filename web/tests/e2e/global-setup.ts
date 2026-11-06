import { request } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default async function setup() {
  const token = process.env.E2E_SESSION_TOKEN || process.env.PAS_E2E_SESSION_TOKEN
  if (!token) throw new Error('Authenticated setup requires a platform session token')
  const target = process.env.E2E_BASE_URL
  if (!target) throw new Error('Authenticated setup requires E2E_BASE_URL for the deployed app')
  const origin = new URL(target).origin
  if (new URL(origin).protocol !== 'https:') throw new Error('Authenticated setup requires HTTPS')

  // Jobs uses platform-cookie auth. Legacy localStorage/hash tokens are ignored.
  // Keep the credential outside the checkout, reports and browser traces.
  const directory = await mkdtemp(join(tmpdir(), 'jobs-e2e-'))
  const state = join(directory, 'state.json')
  const api = await request.newContext({
    baseURL: origin,
    storageState: { cookies: [{
      name: '__Host-pas_session', value: token, domain: new URL(origin).hostname,
      path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax',
    }], origins: [] },
  })
  try {
    const response = await api.get('/.pas/auth/me', { maxRedirects: 0 })
    if (response.status() !== 200) throw new Error(`Platform session validation failed (HTTP ${response.status()})`)
    const user = await response.json()
    if (!user?.id) throw new Error('Platform session validation returned no user identity')
    await api.storageState({ path: state })
    process.env.JOBS_E2E_STORAGE_STATE = state
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  } finally {
    await api.dispose()
  }
  return async () => { await rm(directory, { recursive: true, force: true }) }
}
