# jobs (Pro)

Two-sided job marketplace on ProAppStore — job seekers browse, search, save, apply; employers register companies and post jobs.

- Subdomain: `jobs.proappstore.online` (pending DNS)
- Pages preview: `proappstore-jobs.pages.dev`
- Dev: `pnpm install && pnpm dev` (port 5185)
- Build: `pnpm build` (runs platform compliance check via prebuild)
- Deploy: `git push origin main` (auto-deploys via Cloudflare Pages)
- Tests: `pnpm --filter @jobs/web test:e2e` (14 Playwright tests)

For platform conventions, read SKILLS.md:
https://raw.githubusercontent.com/proappstore-online/proappstore/main/SKILLS.md

## Architecture

- **D1 database** — 4 migrations (companies, jobs, saved_jobs, applications, recent_views, notifications)
- **Schema in code** — `web/src/lib/db/core.ts`, run lazily via `ensureMigrated()`
- **Hash routing** — all routes below
- **HTML sanitization** — `lib/sanitize.ts` strips unsafe tags from job descriptions
- **SQL injection protection** — employer update functions use column allowlists

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

- Jobs come from two sources: employers posting via the UI (`source = 'employer'`) or future GotJob scraper ingestion (`source = 'gotjob'`)
- All DB access requires auth (data worker validates Bearer token)
- Employer write operations verify ownership (`posted_by` / `owner_user_id`)
