# Marketplace release evidence

Launch status: **BLOCKED** pending authenticated deployed acceptance and approved real supply.

Per the maintainer's explicit instruction, this change closes #8 by documenting verified local coverage and the two outstanding external access blockers. This is an administrative handoff, not launch approval. All unchecked live gates remain required; no deployed authorization or release-completion claim is made. This supersedes the previous instruction to keep #8 open without waiving the MVP launch criteria.

## Automated verification (2026-11-06)

Verified locally on the working tree committed with this checklist:

| Command | Result | Scope |
|---|---|---|
| `pnpm test` | 19 passed: 16 action/manifest + 3 asset tests | Node test runner; excludes Playwright |
| `pnpm --filter @jobs/web test:e2e` | 38 passed, no skips | Local Chromium; mocked PAS responses |
| `pnpm --filter @jobs/web build` | Passed, including TypeScript and 3 asset tests | Fresh production bundle/PWA |

No Jest or Vitest runner is configured. Historical counts of 6 SQL / 3 asset / 16 Chromium, and later 12 / 23, are superseded by these results.

- `tests/marketplace.test.mjs`: 10 SQLite integration/manifest tests using every real migration and registered SQL. Covers public keyword/location discovery and explicit bounded fields; full save/apply/review/status/close/withdraw lifecycle; candidate/employer isolation; duplicate applications with exactly one notification; missing/own/external/closed jobs; legacy null contact; required contact validation; ownership, required fields, salary bounds, optional clearing and SQL compilation.
- `tests/operator-console.test.mjs`: 6 tests for consistent owner/moderator declarations, paging/search/detail, public columns without candidate contacts, guarded close, stale/replayed/tampered/missing close no-ops, and public-search exclusion. SQLite does not execute platform role admission or audit behavior.
- `web/tests/public-assets.test.mjs`: 3 tests for HTML/manifest asset references, release metadata/share image/maskable icon, measurable bundles and service worker. Local metadata does not prove a deployed SHA.
- `web/tests/e2e/marketplace.spec.ts`: 24 mocked cases, including keyword/location/filter/company browsing and connected candidate save/apply/employer review/close journeys at 390px and 1280px; simulated OAuth return; contact review and no auto/repeat UI submission; external apply; company registration/editing; job post/edit/close; candidate status/withdrawal; legacy contact; empty/closed/error states and rejected writes.
- `web/tests/e2e/routing.spec.ts`: 11 cases for nine guarded routes plus root/unknown routing.
- `web/tests/e2e/signin.spec.ts`: 3 cases for sign-in UI and Google/GitHub OAuth start requests. Actual OAuth completion is not verified locally.

Existing browser specs mock PAS even when E2E_BASE_URL targets production. Passing them does not verify live authentication, authorization, action registration or real supply.

## External blocker 1: platform keyless E2E session grant

Issue #8 records this failure before browser execution in [workflow 42105238725](https://github.com/proappstore-online/jobs/actions/runs/42105238725):

```text
HTTP 403: no e2e session grant for proappstore-online/jobs (.github/workflows/deploy.yml @ refs/heads/main)
```

Platform admin must provision the supported keyless grant for repository `proappstore-online/jobs`, workflow `.github/workflows/deploy.yml`, ref `refs/heads/main`, and the intended app-scoped QA identity, then rerun the failed E2E job. Reference: platform `docs/publishing-flow.md#keyless-e2e-sessions`. This is historical evidence; remediation has not been verified by this change. Do not disable the gate or substitute copied tokens. A local mocked pass cannot clear this blocker.

## External blocker 2: authorized owner/moderator PAS session

Issue #8 records that the connected Google identity was not the Jobs owner; #4 recorded `403: not the app owner`. Current owner access has not been verified by this change. Owner access is required for deployed migration/action inspection and owner console acceptance. A separately granted moderator and ordinary user must verify role boundaries. Use legitimate sessions; do not bypass refusals with alternate credentials/transports. The app-scoped QA grant does not itself establish owner/moderator rights. Private isolation checks also require distinct authorized candidate/employer sessions.

## Required deployed acceptance — all still unchecked

Follow `web/tests/e2e/DEPLOYED_ACCEPTANCE.md`. Record timestamp, full pushed SHA, environment, actor role (no credentials), workflow link and redacted results for every gate.

- [ ] Record pushed release SHA, successful deploy workflow, and matching `/release.json`.
- [ ] Confirm migration 0005 and all registered actions in the authorized owner session.
- [ ] Signed-out desktop/mobile search by keyword/location, job/company detail, empty/error/closed states.
- [ ] Real PAS sign-in returns to intended job; save and review/submit contact/message; candidate status and withdrawal.
- [ ] A different candidate cannot retrieve the first candidate's private application.
- [ ] Actual employer reviews contact/message, changes status, edits company/job, and closes listing. Another employer cannot read or mutate private records.
- [ ] Duplicate and closed-job submissions are rejected in production; only one notification is produced.
- [ ] Owner/moderator Operator tab works; ordinary user is denied; stale close is a no-op, with audit readback.
- [ ] Owner-approved real vacancies are posted through the employer workflow. Record vacancy source, approval, active status and external link check per listing. No fabricated production jobs.

## Unmocked public release checks

`pnpm --filter @jobs/web test:release` uses `web/playwright.release.config.ts` and `web/tests/release/public.spec.ts`. Two read-only cases run on desktop/mobile (four executions), with no PAS mocks or production writes. They check exact release SHA, PWA assets, and signed-out keyword/location discovery through a real job/company.

Required environment inputs: `E2E_BASE_URL` (HTTPS), `E2E_RELEASE_SHA` (full pushed SHA), `E2E_JOB_ID`, `E2E_JOB_TITLE`, `E2E_COMPANY_NAME`, `E2E_SEARCH`, `E2E_LOCATION`, selected from an approved active vacancy. Missing inputs fail configuration rather than skipping tests. These checks are **not run/verified against production in this change**. They do not need or replace authenticated grant/owner checks. Run separately from the mocked suite.

## Real supply and launch handoff

Approved real vacancy records and source/approval evidence have not been supplied for this change. Real supply is an additional prerequisite independent of the two access blockers. For each normal employer posting, record job/company IDs, source, approving owner/date, active status, and external URL/result/time when applicable. Obtain approval before closing an active real vacancy; never seed fake jobs.

No live session-grant success, deployed authorization pass, matching deployed release or audit readback is claimed. After external access is restored, run every live scenario and attach evidence before changing launch status.
