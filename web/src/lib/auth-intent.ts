import { app } from './app'
export function requestSignIn(jobId?: string, action?: 'save' | 'apply') {
  sessionStorage.setItem('jobs.return', jobId ? '#/job/' + jobId : location.hash)
  if (jobId && action) sessionStorage.setItem('jobs.intent', JSON.stringify({ jobId, action }))
  app.auth.signIn('google')
}
