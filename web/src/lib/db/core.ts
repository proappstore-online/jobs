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
  { name: '0005_application_contact', sql: 'ALTER TABLE applications ADD COLUMN candidate_name TEXT; ALTER TABLE applications ADD COLUMN contact_email TEXT;' },
  { name: '0006_leads', sql: "ALTER TABLE companies ADD COLUMN country TEXT NOT NULL DEFAULT 'AU'; CREATE TABLE IF NOT EXISTS leads ( id TEXT PRIMARY KEY, source_url TEXT NOT NULL UNIQUE, source_board TEXT, original_url TEXT, title TEXT NOT NULL, company_name TEXT NOT NULL, company_slug TEXT NOT NULL, country TEXT NOT NULL DEFAULT 'AU', location TEXT, category TEXT, location_type TEXT, employment_type TEXT, experience_level TEXT, salary_min INTEGER, salary_max INTEGER, tags TEXT NOT NULL DEFAULT '[]', seen_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'new', status_reason TEXT, duplicate_of TEXT, job_id TEXT, submitted_by TEXT NOT NULL, checked_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL ); CREATE INDEX IF NOT EXISTS idx_leads_country_seen ON leads(country, status, seen_at DESC); CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_slug, title); CREATE INDEX IF NOT EXISTS idx_leads_job ON leads(job_id); CREATE INDEX IF NOT EXISTS idx_leads_submitter ON leads(submitted_by, created_at DESC); INSERT OR IGNORE INTO leads (id, source_url, source_board, original_url, title, company_name, company_slug, country, location, category, location_type, employment_type, experience_level, salary_min, salary_max, tags, seen_at, status, duplicate_of, job_id, submitted_by, checked_at, created_at, updated_at) SELECT 'lead-' || j.id, COALESCE(j.source_url, 'https://jobs.proappstore.online/#/job/' || j.id), CASE WHEN j.source_url IS NULL THEN 'jobs' ELSE 'company' END, j.source_url, j.title, c.name, c.slug, 'AU', j.location, j.category, j.location_type, j.employment_type, j.experience_level, j.salary_min, j.salary_max, '[]', j.posted_at, CASE WHEN j.status = 'active' THEN 'published' ELSE 'unavailable' END, NULL, j.id, COALESCE(j.posted_by, 'system'), NULL, j.created_at, j.created_at FROM jobs j JOIN companies c ON c.id = j.company_id;" },
  { name: '0007_profiles', sql: "ALTER TABLE leads ADD COLUMN work_mode TEXT; UPDATE leads SET work_mode = location_type WHERE work_mode IS NULL; CREATE TABLE IF NOT EXISTS profiles ( user_id TEXT PRIMARY KEY, display_name TEXT, country TEXT NOT NULL DEFAULT 'AU', locations TEXT NOT NULL DEFAULT '[]', categories TEXT NOT NULL DEFAULT '[]', work_modes TEXT NOT NULL DEFAULT '[]', employment_types TEXT NOT NULL DEFAULT '[]', seniorities TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]', min_salary INTEGER, updated_at INTEGER NOT NULL ); CREATE INDEX IF NOT EXISTS idx_leads_seen ON leads(seen_at);" },
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
