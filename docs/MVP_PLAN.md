# Jobs: the smallest useful job marketplace

Build the simplest Seek/Indeed-style marketplace: candidates find a real job and apply; employers publish a job and receive a usable application. Australia first (AUD and Australian location examples), without restricting future countries. GotJob is a reference, not a feature-parity requirement.

## Release scope

- Browse active jobs without signing in. Search by keyword and location, with the existing work-mode and employment-type filters.
- Open a job and its company. Sign in only when saving, applying, or managing employer data.
- Apply with a name, contact email and short message; no resume upload in v1. Only the candidate and the job's employer can read the application. External listings link to the original application page and do not claim an application was submitted.
- Register a company, edit its basic details, publish/edit/close a job, and review applicants using the existing statuses.
- Let the owner and explicitly granted moderators inspect listings and companies and close a listing in the PAS Creator Console. No separate admin app.
- Launch with manually posted, owner-approved jobs. No scraper or imported feed is required to launch.

## Delivery order

| Slice | Deliverable | Dependencies |
|---|---|---|
| 1 | PAS Operator tab: jobs and companies, search/detail/paging, guarded close-listing action | Existing schema/actions |
| 2 | Public discovery and job details with sign-in at the point of saving/applying | Independent of slice 1 |
| 3 | Complete the employer loop: editable company, reliable posting/editing/closing, clear validation and errors | Existing employer flow |
| 4 | Useful private applications: candidate contact/message, employer access, duplicate and closed-job protection | Slices 2–3 |
| 5 | Launch verification: real listings, candidate/employer/operator journeys, privacy checks and deployed smoke test | Slices 1–4 |

Tracked by [epic #3](https://github.com/proappstore-online/jobs/issues/3): [operator console #4](https://github.com/proappstore-online/jobs/issues/4), [public discovery #5](https://github.com/proappstore-online/jobs/issues/5), [employer workflow #6](https://github.com/proappstore-online/jobs/issues/6), [applications #7](https://github.com/proappstore-online/jobs/issues/7), and [launch #8](https://github.com/proappstore-online/jobs/issues/8).

Work goes directly to main under PAS repository conventions. Tests and platform contract validation precede deployment. An issue remains open when live acceptance is still outstanding.

## Platform boundary

- PAS owns sign-in/account settings, app roles, the generated Operator tab, action authorization, audit, deployment and hosting.
- Jobs owns listing data, company ownership, candidate applications and employer workflows. Company ownership is not the same as an app-wide moderator role.
- Operator UI comes from `mcp.json.operator_view`. Its queries and writes are separate role-gated registered actions; admission to the console does not itself grant data access. Do not expose candidate contact information in the operator resource lists.
- Reuse the existing database. Slice 1 requires no migration. Add a small additive migration for application contact fields in slice 4; never invent contact details for existing applications.
- Public reads must use the supported PAS public-action contract and select public listing/company fields only. Keep employer editing reads separate. Confirm current SDK and platform requirements before removing the frontend sign-in gate.
- Keep imported listings out of v1. PAS workers and authorized realtime rooms are available if ingestion or chat is justified later; neither is required for this release.

## Explicitly deferred

Scrapers, feed integrations, browser agents, partner sync, chat, resume uploads, advanced candidate profiles, organization teams/invitations, company verification, saved-search alerts, matching/recommendations, paid listings, analytics dashboards, custom admin forms, static pages for every job, and complete GotJob parity.

Existing saved jobs, recent views, notifications and application status screens can stay; do not expand them for v1.

## Acceptance

1. A signed-out visitor finds an active job by keyword/location and reads it on mobile.
2. A candidate signs in, saves a job, submits one application with contact information, and sees its status.
3. An employer creates a company, posts and edits a job, reads its applicants and closes it. Another employer cannot read or change that data.
4. A closed listing cannot receive a new application; repeats do not duplicate an application or its notification.
5. An authorized operator sees Jobs in the Creator Console and can close a listing. An ordinary user cannot execute operator actions. A stale close action changes nothing.
6. No public action or listing UI exposes application notes, candidate contact details or private identity fields.
7. The deployed commit and action registration are verified. Seed jobs are approved real listings, never fabricated production vacancies.

## Current verification limit

The PAS MCP connection uses a Google identity that received `403: not the app owner` when inspecting Jobs' deployed operator contract. Local code and platform validators can be checked; owner-scoped live console acceptance requires the authorized Jobs owner session. Do not work around that refusal with another transport or credentials.
