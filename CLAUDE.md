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

- **D1 database** — 8 migrations (companies, jobs, saved_jobs, applications, recent_views, notifications, leads, profiles, tailored_applications)
- **Schema** — deploy applies `migrations.json`; keep `web/src/lib/db/core.ts` aligned for the lazy `ensureMigrated()` fallback
- **Hash routing** — all routes below
- **HTML sanitization** — `lib/sanitize.ts` strips unsafe tags from job descriptions
- **Registered actions** — all user data access goes through `mcp.json`, with caller-scoped employer writes; research actions are aggregate-only and listed in `approved_unscoped` (PAS-DATA-012). The leads column is `work_mode` (not `location_type`) so aggregates never project a `location*` column.
- **Operator console** — PAS renders `mcp.json.operator_view` outside the app; role-gated owner/moderator actions inspect jobs/companies and close listings. See [docs/OPERATOR_CONSOLE.md](docs/OPERATOR_CONSOLE.md).

## Routes

**Job seekers:**
- `#/` — browse jobs (search, filter by category/location/type)
- `#/job/:id` — job detail (apply, save, share)
- `#/company/:slug` — company profile + open positions
- `#/companies` — browse all companies
- `#/saved` — saved jobs (sort, undo unsave)
- `#/applications` — track applications (applied/interview/offer/rejected)
- `#/tailored` — tailored applications from the PAGS Tailor (status, company, title, updated)
- `#/tailored/:externalId` — tailored CV, cover letter, answers, posting link; change status
- `#/profile` — job preferences (drive "Matches for you"), appearance, account

**Market research (signed-in):**
- `#/research` — country/period overview: weekly postings, category, seniority, work mode, contract type, skills, salaries, top employers
- `#/research/employers` — employer directory by country (`?category=`)
- `#/research/employers/:slug` — employer hiring profile

**Employers:**
- `#/employer` — dashboard (companies, posted jobs, applicant counts)
- `#/register-company` — register a new company
- `#/post-job/:companyId` — post a job
- `#/edit-company/:companyId` - edit an owned company
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
| leads | Ledger of every posting seen (alerts, shares, employer posts): status new / published / duplicate / unavailable / rejected; feeds market research |
| profiles | Per-user job preferences (country, locations, categories, work modes, types, seniority, skills, min salary) |
| tailored_applications | Caller-scoped ledger of PAGS-tailored applications, unique per (user_id, external_id): status tailored / approved / submitted / failed / archived, CV and cover letter markdown, answers JSON |

## Data flow

- MVP jobs are posted by employers via the UI (`source = 'employer'`); scraper ingestion is deferred.
- Leads (#12): `submit_lead` records a posting seen anywhere (deduped); `publish_lead` validates its original company/ATS URL and publishes it as a job. `share_job`/`post_job`/`close_job` keep the ledger in step.
- Anyone signed in can `share_job` (MCP/web, `source = 'community'`): original company/ATS URL only, job boards rejected in SQL, deduped on active `source_url`.
- Tailored applications (#19): `save_tailored_application` (upsert by caller + `external_id`, keeps status), `set_tailored_status`, `list_my_tailored` (no large text columns), `get_my_tailored`. Written over MCP by the PAGS Tailor/Runner; markdown rendered through `lib/markdown.ts` + `sanitize.ts`.
- Discovery uses bounded public query actions and SDK callPublic. Personal actions use platform-cookie authentication.
- Employer write operations verify ownership (`posted_by` / `owner_user_id`)
