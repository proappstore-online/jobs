import { app } from '../lib/app'

export function SignIn() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-[var(--glass-strong)] p-8 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <h1 className="display-font text-3xl font-bold text-[var(--ink)]">Jobs</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Find your next role</p>
        <button
          onClick={() => app.auth.signIn('google')}
          className="mt-6 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-semibold text-[var(--paper)] hover:opacity-90"
        >
          Sign in with Google
        </button>
        <button
          onClick={() => app.auth.signIn('github')}
          className="mt-3 w-full rounded-2xl border border-[var(--line-strong)] py-3 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Sign in with GitHub
        </button>
        <p className="mt-6 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">
          Part of{' '}
          <a
            href="https://proappstore.online"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--ink)]"
          >
            ProAppStore
          </a>
        </p>
      </div>
    </div>
  )
}
