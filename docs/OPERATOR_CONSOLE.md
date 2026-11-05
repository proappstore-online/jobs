# Jobs operator console

Implementation for [issue #4](https://github.com/proappstore-online/jobs/issues/4), under the [MVP epic #3](https://github.com/proappstore-online/jobs/issues/3).

The PAS Creator Console renders Jobs' `mcp.json.operator_view`. There is no admin route or bundle in the Jobs frontend and no schema migration for this feature.

## What operators can do

- Search jobs by title/company, filter active/closed, page through 50 records at a time and open listing details.
- Search companies by name/industry, page through records and open company details.
- Close an active listing after confirmation. The write compares the job ID and expected active status; a stale/repeated write changes nothing. Closing removes the listing from active search and preserves existing applications.

The contract uses PAS's supported list kinds (`reports` for Jobs, `users` for Companies). These are rendering categories, not extra database tables or a new reporting workflow.

## Access

The app owner enters through the Creator Console. To delegate moderation, the authorized owner grants the `moderator` app role using PAS Settings → Access. A moderator sees the Operator tab without becoming a developer or receiving repository access. Do not automatically grant moderation to employers or ordinary members.

All five operator actions independently require authentication and an `owner` or `moderator` app role. The console contract grants no data access by itself. An admitted team owner who lacks the required app role must receive an authorized grant; do not weaken action gates. The platform supplies action/console auditing; moderators do not gain owner-only audit access.

Only listing/company fields are selected. Applicant identities, contact data, notes and company-owner IDs are not selected by these actions. Operator queries use explicit columns and bounded limits. There is no arbitrary SQL, deletion, reopening, applicant export or company editing in this console.

## Verification

Run `pnpm test:actions` for SQLite tests against the actual migrations and action SQL, including paging, privacy projection, single-record closure and stale/tampered requests. These tests verify the manifest's role declarations; they do not simulate PAS authorization or prove deployed role enforcement.

The initial contract was also checked with PAS's own `validateOperatorView`, `securityReview` and `previewAdminConsole` from platform commit `af38e8a`: valid contract, no security issues, and the expected Jobs/Companies tabs and role matrix.

Before closing #4, verify the registered contract in an authorized Jobs owner session, then exercise the console as owner/moderator and attempt the actions as an ordinary user. Confirm the audit record and a stale-action conflict. The currently connected MCP Google identity was refused owner-scoped inspection, so that live acceptance remains pending until an authorized session is available.

Server-side rejection of applications to closed jobs is implemented and confirmed by the marketplace SQL regression tests in `tests/marketplace.test.mjs`. Closing a listing removes it from active search and prevents new applications while preserving existing applications.

## Build compatibility

The current PAS bundle checker requires eager scripts to be measurable local assets. This slice removes the optional remote page-view analytics script and registers the existing PWA through `virtual:pwa-register`, bundled under `assets/`, with its `workbox-window` runtime dependency declared explicitly. Asset regression checks cover local entry scripts and the generated service worker. These changes do not add an analytics feature to the MVP.
