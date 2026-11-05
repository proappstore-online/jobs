# Marketplace release evidence

Launch status: BLOCKED pending approved real supply and authenticated deployed acceptance. Issue #3 remains open until every live gate below is verified.

## Implementation verification (2026-11-06)

- Public discovery uses PAS `requires_auth: false` queries, SDK `callPublic`, explicit listing/company columns, literal limits and no caller identity. Workplace locations are deliberately public vacancy/company data, not candidate home/contact data. No `approved_unscoped` reviewer claims were added. Confirmed against platform registration source `lib/manifest/tool.ts`, `tool-set.ts`, SDK actions and unscoped policy.
- Employer company editing and another-company registration are reachable from the dashboard. Private owner reads include closed listings. Required fields and salary ranges are guarded in writes; optional patch flags distinguish omitted values from intentional clearing. Client success requires one changed row.
- Migration `0005_application_contact` adds nullable candidate name/email without inventing legacy contact information. Native application review collects name/email/message. Candidate and actual poster queries are scoped independently. Closed/missing/own/external listings reject native submissions; duplicate inserts cannot generate another notification, even at the same timestamp.
- PAS manifest validation: `validateToolSet(tools, undefined, 'jobs')` returned null against local platform source. This validates registration rules, not a live deployment.
- Local SQL regression: 12 tests pass against all real migrations, including operator moderation, two-candidate isolation, foreign employer denial, duplicate notifications, closed/external/own/missing jobs, legacy contact and clearing optional fields.
- Chromium: 23 browser tests pass, including mobile/desktop discovery, auth return, contact review/rejection, employer lifecycle, unavailable/external jobs and failed writes. Browser tests use mocked PAS responses; they verify UI behavior and never count as live authentication, authorization or listing supply evidence.
- Production build and asset tests pass; existing CSS-alias, operator exemption reporting and template-icon warnings remain.

## Required deployed acceptance

- [ ] Record pushed release SHA, successful deploy workflow, and matching `/release.json`.
- [ ] Confirm migration 0005 and all registered actions in the authorized owner session.
- [ ] Signed-out desktop/mobile search by keyword/location, job/company detail, empty/error/closed states.
- [ ] Real PAS sign-in returns to intended job; save and review/submit contact/message; candidate status and withdrawal.
- [ ] A different candidate cannot retrieve the first candidate's private application.
- [ ] Actual employer reviews contact/message, changes status, edits company/job, and closes listing. Another employer cannot read or mutate private records.
- [ ] Duplicate and closed-job submissions are rejected in production; only one notification is produced.
- [ ] Owner/moderator Operator tab works; ordinary user is denied; stale close is a no-op, with audit readback.
- [ ] Owner-approved real vacancies are posted through the employer workflow. Record vacancy source, approval, active status and external link check per listing. No fabricated production jobs.

## Access and supply limitations

No shared PAS owner-scoped MCP tools are exposed in this session. Earlier issue #4 records `403: not the app owner` for the connected Google identity; that refusal is not bypassed. Owner-session verification remains outstanding. No approved vacancy records or approval evidence were supplied in this checkout. Do not call the marketplace launched, close #3/#8, or substitute mocked test fixtures for real production supply.
