# jobs (Pro)

Simple Seek/Indeed-style job marketplace on ProAppStore — job seekers browse, search, save, apply; employers register companies and post jobs. MVP scope and delivery order: [docs/MVP_PLAN.md](docs/MVP_PLAN.md), tracked by GitHub epic #3. Full GotJob parity is explicitly out of scope.

- Subdomain: `jobs.proappstore.online`
- Dev: `pnpm install && pnpm dev` (port 5185)
- Build: `pnpm build` (runs platform compliance check via prebuild)
- Deploy: `git push origin main` (platform reusable workflow deploys to R2 at `jobs.proappstore.online`)
- Tests: `pnpm --filter @jobs/web test:e2e`; set `E2E_BASE_URL` to check a deployed build.
- Action regression: `pnpm test:actions` executes operator SQL against the real migrations in SQLite; also runs during prebuild.
- Asset regression: `pnpm --filter @jobs/web build` builds and checks local HTML/manifest asset references; `pnpm test` checks an existing build.
- The PWA plugin supplies the single published manifest. Icons and share images come from the platform template (`proappstore-online/template-app`, `web/public`). Browser install/share acceptance remains a manual check. `/release.json` identifies the deployed commit (`VITE_COMMIT_SHA` in CI).

For platform conventions, read https://proappstore.online/skills.md and https://docs.proappstore.online/admin-console/.

## Architecture

- **D1 database** — 4 migrations (companies, jobs, saved_jobs, applications, recent_views, notifications)
- **Schema** — deploy applies `migrations.json`; keep `web/src/lib/db/core.ts` aligned for the lazy `ensureMigrated()` fallback
- **Hash routing** — all routes below
- **HTML sanitization** — `lib/sanitize.ts` strips unsafe tags from job descriptions
- **Registered actions** — all user data access goes through `mcp.json`, with caller-scoped employer writes
- **Operator console** — PAS renders `mcp.json.operator_view` outside the app; role-gated owner/moderator actions inspect jobs/companies and close listings. See [docs/OPERATOR_CONSOLE.md](docs/OPERATOR_CONSOLE.md).

## Routes

**Job seekers:**
- `#/` — browse jobs (search, filter by category/location/type)
- `#/job/:id` — job detail (apply, save, share)
- `#/company/:slug` — company profile + open positions
- `#/companies` — browse all companies
- `#/saved` — saved jobs (sort, undo unsave)
- `#/applications` — track applications (applied/interview/offer/rejected)

**Employers:**
- `#/employer` — dashboard (companies, posted jobs, applicant counts)
- `#/register-company` — register a new company
- `#/post-job/:companyId` — post a job
- `#/edit-job/:jobId` — edit/close a job
- `#/applicants/:jobId` — view + manage applicant statuses

## DB tables

| Table | Purpose |
|-------|---------|
| companies | Company profiles (name, slug, industry, size, owner_user_id) |
| jobs | Job listings (title, description, salary, category, posted_by) |
| saved_jobs | User bookmarks |
| applications | Job applications (status, note, applied_at) |
| recent_views | Auto-tracked when viewing job details |
| notifications | In-app notifications (new application alerts for employers) |

## Data flow

- MVP jobs are posted by employers via the UI (`source = 'employer'`); scraper ingestion is deferred.
- Current DB actions require auth; public discovery is tracked in #5. The SDK uses platform-cookie authentication.
- Employer write operations verify ownership (`posted_by` / `owner_user_id`)
