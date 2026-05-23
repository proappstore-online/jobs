/**
 * Centered "Loading..." placeholder. Reused across the app's many
 * not-yet-ready states (auth init, data fetch, etc.).
 */
export function Loading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center text-[var(--muted)]">
      Loading...
    </div>
  )
}
