import { app } from '../app'

/**
 * Schema migrations. The data-worker's migrate endpoint tracks applied
 * migrations by `name` in a meta table, so adding new entries here is
 * safe — existing apps run only the new ones on next call.
 *
 * Conventions:
 * - `CREATE TABLE IF NOT EXISTS` is mandatory; this lets a single
 *   migration be replayed without exploding if the runner ever gets
 *   into an odd state.
 */
const MIGRATIONS = [
  {
    name: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS companies (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        slug        TEXT NOT NULL UNIQUE,
        logo_url    TEXT,
        description TEXT,
        website     TEXT,
        location    TEXT,
        industry    TEXT,
        size        TEXT,
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id              TEXT PRIMARY KEY,
        company_id      TEXT NOT NULL,
        title           TEXT NOT NULL,
        slug            TEXT NOT NULL,
        description     TEXT NOT NULL,
        location        TEXT,
        location_type   TEXT NOT NULL DEFAULT 'onsite',
        salary_min      INTEGER,
        salary_max      INTEGER,
        salary_currency TEXT NOT NULL DEFAULT 'AUD',
        employment_type TEXT NOT NULL DEFAULT 'full-time',
        category        TEXT NOT NULL,
        experience_level TEXT NOT NULL DEFAULT 'mid',
        posted_at       INTEGER NOT NULL,
        expires_at      INTEGER,
        source          TEXT NOT NULL DEFAULT 'manual',
        source_url      TEXT,
        status          TEXT NOT NULL DEFAULT 'active',
        created_at      INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_company    ON jobs(company_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_category   ON jobs(category);
      CREATE INDEX IF NOT EXISTS idx_jobs_location   ON jobs(location);
      CREATE INDEX IF NOT EXISTS idx_jobs_status_date ON jobs(status, posted_at DESC);

      CREATE TABLE IF NOT EXISTS saved_jobs (
        id       TEXT PRIMARY KEY,
        user_id  TEXT NOT NULL,
        job_id   TEXT NOT NULL,
        saved_at INTEGER NOT NULL,
        UNIQUE (user_id, job_id)
      );
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);
    `,
  },
  {
    name: '0002_applications_and_views',
    sql: `
      CREATE TABLE IF NOT EXISTS applications (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        job_id     TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'applied',
        note       TEXT,
        applied_at INTEGER NOT NULL,
        UNIQUE (user_id, job_id)
      );
      CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);

      CREATE TABLE IF NOT EXISTS recent_views (
        id        TEXT PRIMARY KEY,
        user_id   TEXT NOT NULL,
        job_id    TEXT NOT NULL,
        viewed_at INTEGER NOT NULL,
        UNIQUE (user_id, job_id)
      );
      CREATE INDEX IF NOT EXISTS idx_recent_views_user ON recent_views(user_id, viewed_at DESC);
    `,
  },
  {
    name: '0003_employer',
    sql: `
      ALTER TABLE companies ADD COLUMN owner_user_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_user_id);

      ALTER TABLE jobs ADD COLUMN posted_by TEXT;
    `,
  },
  {
    name: '0004_notifications',
    sql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        type       TEXT NOT NULL,
        title      TEXT NOT NULL,
        body       TEXT,
        link       TEXT,
        read       INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
    `,
  },
]

let migrated = false

/**
 * Idempotent migration runner. Raw `db.migrate` is restricted to the app's
 * team since the platform's cross-tenant SQL lockdown, so regular users get a
 * 403 here — that's fine: the schema is already migrated (a team member's
 * visit applies anything new), so swallow the 403 and continue. Every
 * user-facing read/write goes through registered actions (see lib/actions.ts),
 * not raw SQL. Resolves on both success and a 403 so render-gating chains
 * always proceed.
 */
export async function ensureMigrated(): Promise<void> {
  if (migrated) return
  try {
    await app.db.migrate(MIGRATIONS)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('403')) throw err
  }
  migrated = true
}

/** UUIDv4 row IDs. Centralised so the implementation can swap without sed. */
export function rid(): string {
  return crypto.randomUUID()
}
