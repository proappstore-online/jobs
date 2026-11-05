import { app } from './app'

/**
 * Registered-action helpers. Every user-facing read/write goes through
 * `app.actions.call` (platform-prepared, role-checked SQL registered in
 * mcp.json) instead of raw browser SQL — the data worker only accepts raw
 * SQL from the app's own team since the cross-tenant lockdown.
 */

export interface ActionMeta {
  changes: number
  duration?: number
  last_row_id?: number
}

/** Call a query action; resolves to the result rows. */
export async function q<T>(name: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const res = await app.actions.call<{ rows: T[] }>(name, params)
  return res.rows
}

/** Call an execute action; resolves to the write metadata. */
export async function x(name: string, params: Record<string, unknown> = {}): Promise<ActionMeta> {
  const res = await app.actions.call<{ meta: ActionMeta }>(name, params)
  return res.meta
}

/** Call a batch action; resolves to per-statement results (rows + meta). */
export async function b(
  name: string,
  params: Record<string, unknown> = {},
): Promise<Array<{ rows: unknown[]; meta: ActionMeta }>> {
  const res = await app.actions.call<{ results: Array<{ rows: unknown[]; meta: ActionMeta }> }>(name, params)
  return res.results
}

export async function publicQuery<T>(name: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const res = await app.actions.callPublic<{ rows: T[] }>(name, params)
  return res.rows
}
export async function changed(name: string, params: Record<string, unknown>): Promise<void> {
  const meta = await x(name, params)
  if (meta.changes !== 1) throw new Error('No changes saved. Check ownership, listing availability and required fields, then retry.')
}
