import { app } from './app'
export function requestSignIn(jobId?: string, action?: 'save' | 'apply') {
  sessionStorage.setItem('jobs.return', jobId ? '#/job/' + jobId : location.hash)
  sessionStorage.removeItem('jobs.intent')
  if (jobId && action) sessionStorage.setItem('jobs.intent', JSON.stringify({ jobId, action }))
  app.auth.signIn('google')
}

export function consumeJobIntent(jobId: string): 'save' | 'apply' | null {
  const raw = sessionStorage.getItem('jobs.intent')
  if (!raw) return null
  try {
    const intent = JSON.parse(raw)
    if (!intent || typeof intent.jobId !== 'string' || !['save', 'apply'].includes(intent.action)) {
      sessionStorage.removeItem('jobs.intent')
      return null
    }
    if (intent.jobId !== jobId) return null
    sessionStorage.removeItem('jobs.intent')
    return intent.action
  } catch {
    sessionStorage.removeItem('jobs.intent')
    return null
  }
}
